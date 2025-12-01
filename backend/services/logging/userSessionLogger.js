// User Session Logger - Log de sessões de login/logout dos usuários
// VERSION: v1.1.0 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
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
        logoutTimestamp: null,
        createdAt: now,
        updatedAt: now
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
            logoutTimestamp: now,
            updatedAt: now
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
   * Atualiza sessão (heartbeat) - mantém isActive=true
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<Object>} { success: boolean, expired: boolean }
   */
  async updateSession(sessionId) {
    try {
      await this.connect();

      const now = new Date();
      const SESSION_EXPIRATION_MS = 4 * 60 * 60 * 1000; // 4 horas

      // Buscar sessão
      const session = await this.collection.findOne({
        sessionId: sessionId
      });

      if (!session) {
        return {
          success: false,
          expired: false,
          error: 'Sessão não encontrada'
        };
      }

      // Verificar se sessão expirou (4 horas)
      const elapsedTime = now - session.loginTimestamp;
      if (elapsedTime > SESSION_EXPIRATION_MS) {
        // Marcar como inativa se expirada
        await this.collection.updateOne(
          { sessionId: sessionId },
          {
            $set: {
              isActive: false,
              logoutTimestamp: now,
              updatedAt: now
            }
          }
        );
        
        return {
          success: false,
          expired: true,
          error: 'Sessão expirada (4 horas)'
        };
      }

      // Atualizar sessão mantendo isActive=true
      const result = await this.collection.updateOne(
        { sessionId: sessionId },
        {
          $set: {
            isActive: true,
            updatedAt: now
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`💓 SessionLogger: Heartbeat recebido - ${session.colaboradorNome}`);
        return {
          success: true,
          expired: false
        };
      } else {
        return {
          success: false,
          expired: false,
          error: 'Erro ao atualizar sessão'
        };
      }

    } catch (error) {
      console.error('❌ SessionLogger: Erro ao atualizar sessão:', error.message);
      return {
        success: false,
        expired: false,
        error: error.message
      };
    }
  }

  /**
   * Reativa sessão existente do usuário (quando retorna sem novo login)
   * @param {string} userEmail - Email do usuário
   * @returns {Promise<Object>} { success: boolean, sessionId: string, expired: boolean }
   */
  async reactivateSession(userEmail) {
    try {
      await this.connect();

      const now = new Date();
      const SESSION_EXPIRATION_MS = 4 * 60 * 60 * 1000; // 4 horas

      // Buscar sessão mais recente do usuário (ativa ou inativa)
      const session = await this.collection
        .find({ userEmail: userEmail })
        .sort({ loginTimestamp: -1 })
        .limit(1)
        .toArray();

      if (!session || session.length === 0) {
        return {
          success: false,
          expired: false,
          error: 'Nenhuma sessão encontrada para este usuário'
        };
      }

      const latestSession = session[0];

      // Verificar se sessão expirou (4 horas)
      const elapsedTime = now - latestSession.loginTimestamp;
      if (elapsedTime > SESSION_EXPIRATION_MS) {
        return {
          success: false,
          expired: true,
          error: 'Sessão expirada (4 horas) - novo login necessário'
        };
      }

      // Reativar sessão
      const result = await this.collection.updateOne(
        { sessionId: latestSession.sessionId },
        {
          $set: {
            isActive: true,
            updatedAt: now
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`🔄 SessionLogger: Sessão reativada - ${latestSession.colaboradorNome} (${latestSession.sessionId})`);
        return {
          success: true,
          sessionId: latestSession.sessionId,
          expired: false
        };
      } else {
        return {
          success: false,
          expired: false,
          error: 'Erro ao reativar sessão'
        };
      }

    } catch (error) {
      console.error('❌ SessionLogger: Erro ao reativar sessão:', error.message);
      return {
        success: false,
        expired: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica se sessão está válida e não expirada
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<Object>} { valid: boolean, expired: boolean, session: Object }
   */
  async validateSession(sessionId) {
    try {
      await this.connect();

      const now = new Date();
      const SESSION_EXPIRATION_MS = 4 * 60 * 60 * 1000; // 4 horas

      const session = await this.collection.findOne({
        sessionId: sessionId
      });

      if (!session) {
        return {
          valid: false,
          expired: false,
          session: null
        };
      }

      const elapsedTime = now - session.loginTimestamp;
      const expired = elapsedTime > SESSION_EXPIRATION_MS;

      return {
        valid: !expired && session.isActive,
        expired: expired,
        session: session
      };

    } catch (error) {
      console.error('❌ SessionLogger: Erro ao validar sessão:', error.message);
      return {
        valid: false,
        expired: false,
        session: null
      };
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
