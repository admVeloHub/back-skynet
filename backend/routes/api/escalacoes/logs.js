/**
 * VeloHub V3 - Escalações API Routes - Logs de Uso
 * VERSION: v1.1.0 | DATE: 2025-01-31 | AUTHOR: VeloHub Development Team
 * Branch: escalacoes
 * 
 * Rotas para gerenciamento de logs de uso
 * 
 * Mudanças v1.1.0:
 * - Database alterado de console_servicos para hub_escalacoes
 */

const express = require('express');
const router = express.Router();

/**
 * Inicializar rotas de logs
 * @param {Object} client - MongoDB client
 * @param {Function} connectToMongo - Função para conectar ao MongoDB
 */
const initLogsRoutes = (client, connectToMongo) => {
  /**
   * GET /api/escalacoes/logs
   * Buscar logs de uso
   */
  router.get('/', async (req, res) => {
    try {
      if (!client) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB não configurado',
          data: []
        });
      }

      await connectToMongo();
      const db = client.db('hub_escalacoes');
      const collection = db.collection('logs_uso');

      const { limit = 100, userEmail } = req.query;
      const filter = {};
      if (userEmail) {
        filter.userEmail = String(userEmail);
      }

      const logs = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .toArray();

      console.log(`✅ Logs encontrados: ${logs.length}`);

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('❌ Erro ao buscar logs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar logs',
        error: error.message
      });
    }
  });

  /**
   * POST /api/escalacoes/logs
   * Criar novo log
   */
  router.post('/', async (req, res) => {
    try {
      if (!client) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB não configurado',
          data: null
        });
      }

      const { action, detail, userEmail, ip } = req.body;

      if (!action) {
        return res.status(400).json({
          success: false,
          message: 'Campo obrigatório: action',
          data: null
        });
      }

      await connectToMongo();
      const db = client.db('hub_escalacoes');
      const collection = db.collection('logs_uso');

      const now = new Date();
      const log = {
        action: String(action),
        detail: detail || {},
        userEmail: userEmail || null,
        ip: ip || req.ip || null,
        createdAt: now
      };

      const result = await collection.insertOne(log);

      console.log(`✅ Log criado: ${result.insertedId}`);

      res.status(201).json({
        success: true,
        data: {
          _id: result.insertedId,
          ...log
        }
      });
    } catch (error) {
      console.error('❌ Erro ao criar log:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar log',
        error: error.message
      });
    }
  });

  return router;
};

module.exports = initLogsRoutes;

