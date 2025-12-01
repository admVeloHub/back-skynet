/**
 * VeloHub V3 - Escalações API Routes - Erros/Bugs
 * VERSION: v1.3.0 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
 * Branch: main (recuperado de escalacoes)
 * 
 * Mudanças v1.3.0:
 * - Adicionado endpoint POST /auto-status para atualização automática via reações WhatsApp
 * - Suporte para reações ✅ (Resolvido) e ❌ (Negado)
 *
 * Rotas para gerenciamento de erros e bugs
 * 
 * Mudanças v1.2.0:
 * - Corrigida extração de vídeos do payload.videoData para envio via WhatsApp
 * - Suporte completo para envio de vídeos através do WhatsApp service
 * 
 * Mudanças v1.1.0:
 * - Integração com WhatsApp service para envio automático de mensagens
 */

const express = require('express');
const router = express.Router();
const whatsappService = require('../../../services/escalacoes/whatsappService');
const config = require('../../../config');

/**
 * Inicializar rotas de erros/bugs
 * @param {Object} client - MongoDB client
 * @param {Function} connectToMongo - Função para conectar ao MongoDB
 * @param {Object} services - Serviços disponíveis (userActivityLogger, etc.)
 */
const initErrosBugsRoutes = (client, connectToMongo, services = {}) => {
  const { userActivityLogger } = services;

  /**
   * GET /api/escalacoes/erros-bugs
   * Buscar todos os erros/bugs ou filtrar por query params
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
      const collection = db.collection('erros_bugs');

      // Filtros opcionais
      const { cpf, colaboradorNome, agente, tipo } = req.query;
      const filter = {};
      if (cpf) {
        filter.cpf = { $regex: String(cpf).replace(/\D/g, ''), $options: 'i' };
      }
      // Suportar tanto colaboradorNome quanto agente (para compatibilidade)
      if (colaboradorNome) {
        filter.colaboradorNome = { $regex: String(colaboradorNome), $options: 'i' };
      } else if (agente) {
        filter.colaboradorNome = { $regex: String(agente), $options: 'i' };
      }
      if (tipo) {
        filter.tipo = { $regex: String(tipo), $options: 'i' };
      }

      const errosBugs = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      console.log(`✅ Erros/Bugs encontrados: ${errosBugs.length}`);

      res.json({
        success: true,
        data: errosBugs
      });
    } catch (error) {
      console.error('❌ Erro ao buscar erros/bugs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar erros/bugs',
        error: error.message
      });
    }
  });

  /**
   * GET /api/escalacoes/erros-bugs/:id
   * Buscar erro/bug por ID
   */
  router.get('/:id', async (req, res) => {
    try {
      if (!client) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB não configurado',
          data: null
        });
      }

      await connectToMongo();
      const db = client.db('hub_escalacoes');
      const collection = db.collection('erros_bugs');

      const { ObjectId } = require('mongodb');
      const erroBug = await collection.findOne({
        _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : req.params.id
      });

      if (!erroBug) {
        return res.status(404).json({
          success: false,
          message: 'Erro/Bug não encontrado',
          data: null
        });
      }

      res.json({
        success: true,
        data: erroBug
      });
    } catch (error) {
      console.error('❌ Erro ao buscar erro/bug:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar erro/bug',
        error: error.message
      });
    }
  });

  /**
   * POST /api/escalacoes/erros-bugs
   * Criar novo erro/bug
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

      const { agente, cpf, tipo, payload, agentContact, waMessageId, descricao } = req.body;

      // Validação básica
      if (!agente || !tipo) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: agente (colaboradorNome), tipo',
          data: null
        });
      }

      await connectToMongo();
      const db = client.db('hub_escalacoes');
      const collection = db.collection('erros_bugs');

      const now = new Date();
      const colaboradorNome = String(agente).trim();
      
      // Garantir que payload tenha agente dentro
      const payloadCompleto = {
        agente: colaboradorNome,
        ...(payload || {})
      };

      // Tipo com prefixo "Erro/Bug - " se não tiver
      const tipoCompleto = String(tipo).startsWith('Erro/Bug - ') 
        ? String(tipo).trim() 
        : `Erro/Bug - ${String(tipo).trim()}`;

      const erroBug = {
        colaboradorNome: colaboradorNome,
        cpf: cpf ? String(cpf).replace(/\D/g, '') : '',
        tipo: tipoCompleto,
        payload: payloadCompleto,
        status: 'em aberto',
        agentContact: agentContact || null,
        waMessageId: waMessageId || null,
        respondedAt: null,
        respondedBy: null,
        createdAt: now,
        updatedAt: now
      };

      const result = await collection.insertOne(erroBug);

      console.log(`✅ Erro/Bug criado: ${result.insertedId}`);

      // Montar mensagem para WhatsApp
      const mensagemTexto = (() => {
        const agentName = colaboradorNome || '';
        let m = `*Novo Erro/Bug - ${tipo}*\n\n`;
        m += `Agente: ${agentName}\n`;
        if (erroBug.cpf) m += `CPF: ${erroBug.cpf}\n`;
        m += `\nDescrição:\n${descricao || payload?.descricao || '—'}\n`;
        if (payload?.imagens?.length || payload?.videos?.length) {
          const totalAnexos = (payload.imagens?.length || 0) + (payload.videos?.length || 0);
          const tipos = [];
          if (payload.imagens?.length) tipos.push(`${payload.imagens.length} imagem(ns)`);
          if (payload.videos?.length) tipos.push(`${payload.videos.length} vídeo(s)`);
          m += `\n[Anexos: ${totalAnexos} - ${tipos.join(', ')}]\n`;
        }
        return m;
      })();

      // Enviar via WhatsApp se configurado
      let waMessageIdFinal = waMessageId || null;
      let messageIdsArray = [];
      
      if (config.WHATSAPP_API_URL && config.WHATSAPP_DEFAULT_JID) {
        try {
          // Extrair imagens do payload.previews (base64)
          const imagens = [];
          if (payload && payload.previews && Array.isArray(payload.previews)) {
            payload.previews.forEach((preview, idx) => {
              if (preview) {
                // Remover prefixo data:image se existir
                const base64Data = String(preview).replace(/^data:image\/[^;]+;base64,/, '');
                const imgMeta = payload.imagens && payload.imagens[idx] ? payload.imagens[idx] : {};
                imagens.push({
                  data: base64Data,
                  type: imgMeta.type || 'image/jpeg'
                });
              }
            });
          }
          
          // Extrair vídeos do payload.videoData (dados completos em base64)
          const videos = [];
          if (payload && payload.videoData && Array.isArray(payload.videoData)) {
            payload.videoData.forEach((video) => {
              if (video && video.data && video.type) {
                // Remover prefixo data:video se existir
                const base64Data = String(video.data).replace(/^data:video\/[^;]+;base64,/, '');
                videos.push({
                  data: base64Data,
                  type: video.type || 'video/mp4'
                });
              }
            });
          }
          
          const whatsappResult = await whatsappService.sendMessage(
            config.WHATSAPP_DEFAULT_JID,
            mensagemTexto,
            imagens,
            videos,
            {
              cpf: erroBug.cpf || null,
              solicitacao: tipo,
              agente: colaboradorNome
            }
          );
          
          if (whatsappResult.ok) {
            waMessageIdFinal = whatsappResult.messageId || null;
            messageIdsArray = whatsappResult.messageIds || [];
            
            // Atualizar erro/bug com waMessageId e messageIds
            if (waMessageIdFinal || messageIdsArray.length > 0) {
              const updateData = {};
              if (waMessageIdFinal) updateData.waMessageId = waMessageIdFinal;
              if (messageIdsArray.length > 0) {
                updateData['payload.messageIds'] = messageIdsArray;
              }
              
              await collection.updateOne(
                { _id: result.insertedId },
                { $set: updateData }
              );
              
              // Atualizar objeto local para resposta
              erroBug.waMessageId = waMessageIdFinal;
              if (!erroBug.payload) erroBug.payload = {};
              erroBug.payload.messageIds = messageIdsArray;
            }
            
            console.log(`✅ WhatsApp: Mensagem enviada com sucesso! messageId: ${waMessageIdFinal}`);
          } else {
            console.warn(`⚠️ WhatsApp: Falha ao enviar mensagem: ${whatsappResult.error}`);
          }
        } catch (whatsappError) {
          console.error('❌ Erro ao enviar via WhatsApp (não crítico):', whatsappError);
          // Não bloquear criação do erro/bug se WhatsApp falhar
        }
      } else {
        console.log('[WHATSAPP] WhatsApp não configurado - pulando envio');
      }

      // Atualizar agentContact se WhatsApp foi usado
      if (config.WHATSAPP_DEFAULT_JID && waMessageIdFinal) {
        erroBug.agentContact = config.WHATSAPP_DEFAULT_JID;
      }

      // Log de atividade
      if (userActivityLogger) {
        try {
          await userActivityLogger.logActivity({
            action: 'create_erro_bug',
            detail: {
              erroBugId: result.insertedId.toString(),
              tipo: tipoCompleto,
              cpf: erroBug.cpf,
              colaboradorNome: colaboradorNome,
              waMessageId: waMessageIdFinal,
              whatsappSent: !!waMessageIdFinal
            }
          });
        } catch (logErr) {
          console.error('Erro ao registrar log:', logErr);
        }
      }

      res.status(201).json({
        success: true,
        data: {
          _id: result.insertedId,
          ...erroBug
        }
      });
    } catch (error) {
      console.error('❌ Erro ao criar erro/bug:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar erro/bug',
        error: error.message
      });
    }
  });

  /**
   * PUT /api/escalacoes/erros-bugs/:id
   * Atualizar erro/bug
   */
  router.put('/:id', async (req, res) => {
    try {
      if (!client) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB não configurado',
          data: null
        });
      }

      await connectToMongo();
      const db = client.db('hub_escalacoes');
      const collection = db.collection('erros_bugs');

      const { ObjectId } = require('mongodb');
      const filter = {
        _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : req.params.id
      };

      const now = new Date();
      const updateData = { ...req.body };
      
      // Sempre atualizar updatedAt
      updateData.updatedAt = now;

      const update = {
        $set: updateData
      };

      const result = await collection.updateOne(filter, update);

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Erro/Bug não encontrado',
          data: null
        });
      }

      console.log(`✅ Erro/Bug atualizado: ${req.params.id}`);

      // Buscar erro/bug atualizado
      const erroBug = await collection.findOne(filter);

      res.json({
        success: true,
        data: erroBug
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar erro/bug:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar erro/bug',
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/escalacoes/erros-bugs/:id
   * Deletar erro/bug
   */
  router.delete('/:id', async (req, res) => {
    try {
      if (!client) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB não configurado',
          data: null
        });
      }

      await connectToMongo();
      const db = client.db('hub_escalacoes');
      const collection = db.collection('erros_bugs');

      const { ObjectId } = require('mongodb');
      const filter = {
        _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : req.params.id
      };

      const result = await collection.deleteOne(filter);

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Erro/Bug não encontrado',
          data: null
        });
      }

      console.log(`✅ Erro/Bug deletado: ${req.params.id}`);

      res.json({
        success: true,
        message: 'Erro/Bug deletado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao deletar erro/bug:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar erro/bug',
        error: error.message
      });
    }
  });

  /**
   * POST /api/escalacoes/erros-bugs/auto-status
   * Atualizar status automaticamente via reação do WhatsApp
   */
  router.post('/auto-status', async (req, res) => {
    try {
      if (!client) {
        return res.status(503).json({
          success: false,
          error: 'MongoDB não configurado'
        });
      }

      const { waMessageId, reactor, status: inputStatus, reaction } = req.body;

      // Validação
      if (!waMessageId) {
        return res.status(400).json({
          success: false,
          error: 'waMessageId é obrigatório'
        });
      }

      await connectToMongo();
      const db = client.db('hub_escalacoes');
      const collection = db.collection('erros_bugs');

      // Buscar erro/bug por waMessageId (campo direto)
      let erroBug = await collection.findOne({ waMessageId });

      // Se não encontrou, buscar em payload.messageIds (array)
      if (!erroBug) {
        erroBug = await collection.findOne({
          'payload.messageIds': waMessageId
        });
      }

      if (!erroBug) {
        return res.status(404).json({
          success: false,
          error: 'Erro/Bug não encontrado'
        });
      }

      // Mapear emoji para status
      let statusFinal = inputStatus;
      if (!statusFinal && reaction) {
        if (reaction === '✅') {
          statusFinal = 'Resolvido';
        } else if (reaction === '❌') {
          statusFinal = 'Negado';
        }
      }

      if (!statusFinal) {
        return res.status(400).json({
          success: false,
          error: 'status ou reaction são obrigatórios'
        });
      }

      // Atualizar no MongoDB
      const now = new Date();
      const reactorDigits = reactor ? String(reactor).replace(/\D/g, '') : null;

      const result = await collection.updateOne(
        { _id: erroBug._id },
        {
          $set: {
            status: statusFinal,
            respondedAt: now,
            respondedBy: reactorDigits,
            updatedAt: now
          }
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhuma alteração realizada'
        });
      }

      // Buscar erro/bug atualizado
      const atualizado = await collection.findOne({ _id: erroBug._id });

      // Log de atividade
      if (userActivityLogger) {
        try {
          await userActivityLogger.logActivity({
            action: 'auto_status_update_erro',
            detail: {
              erroBugId: erroBug._id.toString(),
              waMessageId,
              status: statusFinal,
              reactor: reactorDigits,
              reaction: reaction || null
            }
          });
        } catch (logErr) {
          console.error('Erro ao registrar log:', logErr);
        }
      }

      console.log(`✅ Status automático atualizado (erro/bug): ${erroBug._id} → ${statusFinal} (reação: ${reaction || 'N/A'})`);

      res.json({
        success: true,
        data: atualizado
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar status automático (erro/bug):', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

module.exports = initErrosBugsRoutes;

