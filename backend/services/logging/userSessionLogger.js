// User Session Logger - Log de sessões de login/logout dos usuários
// VERSION: v1.0.0 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class UserSessionLogger {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.isConnected = false;
  }

  /**
   * Conecta ao MongoDB
   */
  async connect() {
    if (this.isConnected) return;
    
    try {
      this.client = new MongoClient(process.env.MONGO_ENV);
      await this.client.connect();
      this.db = this.client.db('console_conteudo');
      this.collection = this.db.collection('hub_sessions');
      this.isConnected = true;
      
      console.log('✅ SessionLogger: Conectado ao MongoDB');
    } catch (error) {
      console.error('❌ SessionLogger: Erro ao conectar MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Registra login do usuário
   * @param {string} colaboradorNome - Nome do colaborador
   * @param {string} userEmail - Email do usuário
   * @param {string} ipAddress - IP do usuário (opcional)
   * @param {string} userAgent - User Agent (opcional)
   * @returns {Promise<Object>} { success: boolean, sessionId: string }
   */
  async logLogin(colaboradorNome, userEmail, ipAddress = null, userAgent = null) {
    try {
      await this.connect();

      const sessionId = uuidv4();
      const now = new Date();
      
      const session = {
        colaboradorNome,
        userEmail,
        sessionId,
        ipAddress,
        userAgent,
        isActive: true,
        loginTimestamp: now,
        logoutTimestamp: null
      };

      const result = await this.collection.insertOne(session);
      
      console.log(`✅ SessionLogger: Login registrado - ${colaboradorNome} (${sessionId})`);
      
      return {
        success: true,
        sessionId: sessionId,
        insertedId: result.insertedId
      };

    } catch (error) {
      console.error('❌ SessionLogger: Erro ao registrar login:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Registra logout do usuário
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<Object>} { success: boolean, duration: number }
   */
  async logLogout(sessionId) {
    try {
      await this.connect();

      const now = new Date();
      
      // Buscar sessão ativa
      const session = await this.collection.findOne({
        sessionId: sessionId,
        isActive: true
      });

      if (!session) {
        console.log(`⚠️ SessionLogger: Sessão ${sessionId} não encontrada ou já inativa`);
        return {
          success: false,
          error: 'Sessão não encontrada ou já inativa'
        };
      }

      // Calcular duração
      const duration = Math.round((now - session.loginTimestamp) / 1000 / 60); // minutos

      // Atualizar sessão
      const result = await this.collection.updateOne(
        { sessionId: sessionId },
        {
          $set: {
            isActive: false,
            logoutTimestamp: now
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ SessionLogger: Logout registrado - ${session.colaboradorNome} (${duration} min)`);
        
        return {
          success: true,
          duration: duration,
          colaboradorNome: session.colaboradorNome
        };
      } else {
        return {
          success: false,
          error: 'Erro ao atualizar sessão'
        };
      }

    } catch (error) {
      console.error('❌ SessionLogger: Erro ao registrar logout:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém sessões ativas
   * @returns {Promise<Array>} Sessões ativas
   */
  async getActiveSessions() {
    try {
      await this.connect();

      const activeSessions = await this.collection
        .find({ isActive: true })
        .sort({ loginTimestamp: -1 })
        .toArray();

      console.log(`📋 SessionLogger: ${activeSessions.length} sessões ativas encontradas`);
      
      return activeSessions;

    } catch (error) {
      console.error('❌ SessionLogger: Erro ao obter sessões ativas:', error.message);
      return [];
    }
  }

  /**
   * Fecha a conexão com MongoDB
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('🔌 SessionLogger: Conexão MongoDB fechada');
    }
  }

  /**
   * Testa a conexão com MongoDB
   * @returns {Promise<boolean>} Status da conexão
   */
  async testConnection() {
    try {
      await this.connect();
      await this.collection.findOne({});
      console.log('✅ SessionLogger: Teste de conexão bem-sucedido');
      return true;
    } catch (error) {
      console.error('❌ SessionLogger: Erro no teste de conexão:', error.message);
      return false;
    }
  }
}

module.exports = new UserSessionLogger();
