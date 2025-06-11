const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// Inicialize o app Express
const app = express();
app.use(cors({ 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Inicialize o Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Função para obter a mensagem da notificação baseada no status
const getNotificationMessage = (status, orderNumber) => ({
  'Pendente': `O seu pedido recebido e aguardando confirmação.`,
  'Em Preparação': `O seu pedido está sendo preparado.`,
  'A caminho': `O seu pedido saiu para entrega.`,
  'Entregue': `O seu pedido foi entregue com sucesso!`,
  'Cancelado': `O seu pedido foi cancelado.`
}[status] || `O status do seu pedido atualizado para: ${status}`);

// Função para enviar notificação via Expo para um único token
const sendExpoNotification = async (expoPushToken, title, body, data = {}) => {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Notificação Expo enviada:', result);
    return { success: !result.errors, result };
  } catch (error) {
    console.error('Erro ao enviar notificação Expo:', error);
    return { success: false, error: error.message };
  }
};

// Função para enviar notificações para múltiplos tokens
const sendExpoNotificationToTokens = async (tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log('Nenhum token fornecido para envio de notificação');
      return { success: false, error: 'Nenhum token fornecido' };
    }

    // Preparar mensagens para todos os tokens
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      priority: 'high',
      channelId: 'default',
    }));

    // Enviar em lote para o Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const results = await response.json();
    console.log(`Notificações enviadas para ${tokens.length} dispositivos:`, results);

    // Verificar se há erros nos resultados
    const validResults = Array.isArray(results) ? results : [results];
    const hasErrors = validResults.some(r => r.errors && r.errors.length > 0);

    return { 
      success: !hasErrors, 
      results: validResults,
      tokensCount: tokens.length
    };
  } catch (error) {
    console.error('Erro ao enviar notificações em lote:', error);
    return { success: false, error: error.message };
  }
};

// Função para extrair tokens de dispositivos válidos de um usuário
const getValidTokensFromUser = async (userId) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`Usuário ${userId} não encontrado`);
      return [];
    }
    
    const userData = userDoc.data();
    
    // Verificar se o usuário tem a nova estrutura de dispositivos
    if (userData.devices && Array.isArray(userData.devices)) {
      // Extrair tokens de todos os dispositivos cadastrados
      return userData.devices
        .filter(device => device && device.pushToken) // Filtrar dispositivos com token válido
        .map(device => device.pushToken);
    }
    
    // Compatibilidade com modelo antigo (token único)
    if (userData.expoPushToken) {
      return [userData.expoPushToken];
    }
    
    return [];
  } catch (error) {
    console.error(`Erro ao obter tokens do usuário ${userId}:`, error);
    return [];
  }
};

// Rota para criar usuário
app.post('/createUser', async (req, res) => {
  try {
    const { email, password, adminId, uid, role } = req.body; // Added 'role'
    console.log('Iniciando criação de usuário:', { email, role, adminId, requestedUid: uid });
    
    if (!email || !password || !adminId) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      if (!adminId) missingFields.push('adminId');
      
      console.error('Campos obrigatórios faltando:', missingFields);
      return res.status(400).json({
        success: false,
        error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`
      });
    }

    // Verificar se o solicitante (admin/manager) é válido
    console.log('Verificando permissões do solicitante:', adminId);
    const requesterDoc = await db.collection('users').doc(adminId).get();
    if (!requesterDoc.exists) {
      console.error('Solicitante não encontrado:', adminId);
      return res.status(403).json({
        success: false,
        error: 'Solicitante não encontrado ou não autorizado'
      });
    }
    
    const requesterRole = requesterDoc.data().role;
    if (requesterRole !== 'admin' && requesterRole !== 'manager') {
      console.error('Usuário não tem permissão de admin ou manager:', adminId, 'Role:', requesterRole);
      return res.status(403).json({
        success: false,
        error: 'Usuário não tem permissão para criar usuários (requer admin ou manager)'
      });
    }

    let effectiveUid = uid; // Use requested UID by default
    let createUserRequest = {
      email: email,
      password: password
    };

    // Se o papel for 'deliv', gerar UID no formato DMXX
    if (role === 'deliv') {
      console.log('Criando um entregador, gerando ID DMXX...');
      const deliverymenRef = db.collection('deliverymen');
      const snapshot = await deliverymenRef.get();
      let maxIdNum = 0;
      if (!snapshot.empty) {
        snapshot.forEach(doc => {
          const docId = doc.id;
          if (docId.startsWith('DM')) {
            const numPart = docId.substring(2);
            if (!isNaN(parseInt(numPart))) {
              const currentNum = parseInt(numPart);
              if (currentNum > maxIdNum) {
                maxIdNum = currentNum;
              }
            }
          }
        });
      }
      const newIdNum = maxIdNum + 1;
      effectiveUid = 'DM' + String(newIdNum).padStart(2, '0');
      console.log(`UID gerado para entregador: ${effectiveUid}. UID solicitado (${uid}) será ignorado.`);
      createUserRequest.uid = effectiveUid;
    } else if (uid) {
      // Para outros papéis, usar o UID fornecido se existir
      console.log(`Usando UID fornecido: ${uid} para role: ${role}`);
      createUserRequest.uid = uid;
    } else {
      // Para outros papéis sem UID fornecido, o Firebase Auth gerará um UID automaticamente.
      // Não adicionamos createUserRequest.uid neste caso.
      console.log(`Nenhum UID fornecido para role: ${role}, Firebase Auth gerará UID.`);
    }

    // Criar usuário no Authentication
    console.log('Criando usuário no Authentication com os seguintes dados:', createUserRequest);
    const userRecord = await admin.auth().createUser(createUserRequest);

    console.log('Usuário criado com sucesso no Firebase Auth:', userRecord.uid);
    // É importante que o front-end ou outro processo crie o documento do usuário
    // em /users/{userRecord.uid} e, se for 'deliv', também em /deliverymen/{userRecord.uid}
    // com os dados apropriados, incluindo o 'role'.
    return res.json({
      success: true,
      userId: userRecord.uid,
      message: 'Usuário criado com sucesso'
    });
  } catch (error) {
    console.error('Erro detalhado ao criar usuário:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        error: 'Email já está em uso'
      });
    }

    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        success: false,
        error: 'Senha muito fraca'
      });
    }

    return res.status(500).json({
      success: false,
      error: `Erro ao criar usuário: ${error.message}`,
      code: error.code
    });
  }
});

// Rota para deletar usuário
app.post('/deleteUser', async (req, res) => {
  try {
    const { userId, adminId, selfDelete } = req.body;
    console.log('Recebida requisição para deletar usuário:', { userId, adminId, selfDelete });

    if (!userId) {
      console.log('userId é obrigatório');
      return res.status(400).json({
        success: false,
        error: 'userId é obrigatório'
      });
    }

    // Verificar permissão - se não for auto-exclusão, precisa ser admin
    if (!selfDelete) {
      if (!adminId) {
        return res.status(400).json({
          success: false,
          error: 'adminId é obrigatório para exclusão por administrador'
        });
      }

      const adminDoc = await db.collection('users').doc(adminId).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        console.log('Permissão de admin inválida:', adminId);
        return res.status(403).json({
          success: false,
          error: 'Usuário não tem permissão de admin'
        });
      }
    }

    // Verificar tipo de usuário sendo deletado
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('Usuário não encontrado:', userId);
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const userData = userDoc.data();
    const deletedBy = selfDelete ? userId : adminId;

    // Deletar usuário do Authentication
    await admin.auth().deleteUser(userId);
    console.log('Usuário deletado do Authentication:', userId);
    
    // Atualizar documento do usuário
    await db.collection('users').doc(userId).update({
      authDeleted: true,
      authDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
      authDeletedBy: deletedBy,
      selfDelete: !!selfDelete
    });
    console.log('Documento do usuário atualizado na coleção users');

    // Se for entregador, atualizar também na coleção deliverymen
    if (userData.role === 'deliv') {
      await db.collection('deliverymen').doc(userId).update({
        authDeleted: true,
        authDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
        authDeletedBy: deletedBy,
        selfDelete: !!selfDelete
      });
      console.log('Documento do entregador atualizado na coleção deliverymen');
    }

    return res.json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro ao deletar usuário',
      details: error.message
    });
  }
});

// Nova rota para enviar notificação para um usuário específico
app.post('/sendNotification', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'userId, title e body são obrigatórios'
      });
    }
    
    // Obter todos os tokens de dispositivos do usuário
    const tokens = await getValidTokensFromUser(userId);
    
    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não possui dispositivos para receber notificações'
      });
    }
    
    // Enviar notificação para todos os dispositivos
    const result = await sendExpoNotificationToTokens(tokens, title, body, data);
    
    return res.json({
      success: result.success,
      message: `Notificação enviada para ${tokens.length} dispositivo(s)`,
      details: result
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao enviar notificação',
      details: error.message
    });
  }
});

// Função para monitorar mudanças nas orders - Corrigida para usar o campo 'phone'
exports.orderStatusChanged = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    if (newData.status !== previousData.status) {
      // Use orderId como número do pedido, ou o ID do documento se não existir
      const orderNumber = newData.orderId || context.params.orderId;
      const { customerPhone, status } = newData;
      
      try {
        let userId = null;
        let tokens = [];
        
        // Buscamos pelo telefone do cliente
        if (customerPhone) {
          // Normalizar o número de telefone (remover formatação)
          const normalizedPhone = customerPhone.replace(/\D/g, '');
          
          // Tentar diferentes formatos de telefone
          const phoneFormats = [
            customerPhone,                // Formato original
            normalizedPhone,              // Sem formatação
            `+55${normalizedPhone}`,      // Com código do país
            normalizedPhone.substring(2)  // Sem DDD
          ];
          
          // Tentar cada formato de telefone - AGORA USANDO O CAMPO 'phone'
          for (const phoneFormat of phoneFormats) {
            const userSnapshot = await db.collection('users')
              .where('phone', '==', phoneFormat)
              .get();
            
            if (!userSnapshot.empty) {
              userId = userSnapshot.docs[0].id;
              break;
            }
          }
          
          // Se não encontrou com 'phone', tenta com 'phoneNumber' por compatibilidade
          if (!userId) {
            for (const phoneFormat of phoneFormats) {
              const userSnapshot = await db.collection('users')
                .where('phoneNumber', '==', phoneFormat)
                .get();
              
              if (!userSnapshot.empty) {
                userId = userSnapshot.docs[0].id;
                break;
              }
            }
          }
          
          // Se encontramos o usuário, buscar os tokens
          if (userId) {
            tokens = await getValidTokensFromUser(userId);
          }
        }
        
        if (tokens.length > 0) {
          // Enviar notificações para todos os dispositivos do usuário
          await sendExpoNotificationToTokens(
            tokens,
            'Atualização do Pedido',
            getNotificationMessage(status, orderNumber),
            {
              orderId: context.params.orderId,
              orderNumber: orderNumber,
              status,
              type: 'ORDER_UPDATE'
            }
          );
        }
      } catch (error) {
        console.error('Erro ao processar mudança de status:', error);
      }
    }
  });

// Função para monitorar a criação de novos pedidos - Corrigida para usar o campo 'phone'
exports.orderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const newOrder = snapshot.data();
    const firestoreOrderId = context.params.orderId;
    
    try {
      // Use orderId como número do pedido, ou o ID do documento se não existir
      const orderNumber = newOrder.orderId || firestoreOrderId;
      const { customerPhone } = newOrder;
      
      // Verificar se temos informações necessárias
      if (!customerPhone) {
        return null;
      }
      
      let userId = null;
      let tokens = [];
      
      // Normalizar o número de telefone (remover formatação)
      const normalizedPhone = customerPhone.replace(/\D/g, '');
      
      // Tentar diferentes formatos de telefone
      const phoneFormats = [
        customerPhone,                // Formato original
        normalizedPhone,              // Sem formatação
        `+55${normalizedPhone}`,      // Com código do país
        normalizedPhone.substring(2)  // Sem DDD
      ];
      
      // Tentar cada formato de telefone - AGORA USANDO O CAMPO 'phone'
      for (const phoneFormat of phoneFormats) {
        const userSnapshot = await db.collection('users')
          .where('phone', '==', phoneFormat)
          .get();
        
        if (!userSnapshot.empty) {
          userId = userSnapshot.docs[0].id;
          break;
        }
      }
      
      // Se não encontrou com 'phone', tenta com 'phoneNumber' por compatibilidade
      if (!userId) {
        for (const phoneFormat of phoneFormats) {
          const userSnapshot = await db.collection('users')
            .where('phoneNumber', '==', phoneFormat)
            .get();
          
          if (!userSnapshot.empty) {
            userId = userSnapshot.docs[0].id;
            break;
          }
        }
      }
      
      // Se encontramos o usuário, buscar os tokens
      if (userId) {
        tokens = await getValidTokensFromUser(userId);
      }
      
      if (tokens.length > 0) {
        // Conteúdo da notificação
        const title = 'Novo pedido recebido';
        const body = `Seu pedido foi recebido com sucesso!`;
        
        // Dados adicionais para a notificação
        const additionalData = {
          orderId: firestoreOrderId,
          orderNumber: orderNumber,
          status: newOrder.status || 'Pendente',
          type: 'NEW_ORDER'
        };
        
        // Enviar notificações para todos os dispositivos do usuário
        await sendExpoNotificationToTokens(
          tokens,
          title,
          body,
          additionalData
        );
        
        return { success: true };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao processar notificação de novo pedido:', error);
      return { error: error.message };
    }
  });


// Rota para verificar saúde do servidor
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Endpoint de notificação para sign in with Apple
app.post('/apple-auth-notifications', async (req, res) => {
  try {
    // Verificar se a requisição é POST
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    
    // Obter os dados da notificação
    const notification = req.body;
    console.log('Notificação recebida da Apple:', notification);
    
    // Processar os diferentes tipos de eventos
    if (notification.type === 'email-disabled') {
      // Usuário desabilitou email forwarding
      await handleEmailChange(notification);
    } else if (notification.type === 'consent-revoked') {
      // Usuário revogou permissão para o app
      await handleAccountDeletion(notification);
    } else if (notification.type === 'account-delete') {
      // Usuário deletou sua Apple Account
      await handleAccountDeletion(notification);
    }
    
    // Responder à Apple com sucesso
    res.status(200).send('Notification processed successfully');
  } catch (error) {
    console.error('Erro ao processar notificação da Apple:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Função para lidar com mudanças de email
async function handleEmailChange(notification) {
  const { sub } = notification;
  
  try {
    // Buscar usuário no Firestore pelo Apple ID (sub)
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('appleUserId', '==', sub).get();
    
    if (snapshot.empty) {
      console.log('Nenhum usuário encontrado com este Apple ID:', sub);
      return;
    }
    
    // Atualizar as informações do usuário
    snapshot.forEach(async (doc) => {
      await doc.ref.update({
        emailForwardingEnabled: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Erro ao processar mudança de email:', error);
    throw error;
  }
}

// Função para lidar com deleção de conta
async function handleAccountDeletion(notification) {
  const { sub } = notification;
  
  try {
    // Buscar usuário no Firestore pelo Apple ID (sub)
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('appleUserId', '==', sub).get();
    
    if (snapshot.empty) {
      console.log('Nenhum usuário encontrado com este Apple ID:', sub);
      return;
    }
    
    // Para cada usuário encontrado, marcar como deletado
    snapshot.forEach(async (doc) => {
      await doc.ref.update({
        accountDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        active: false
      });
      
      // Opcional: Tentar deletar o usuário no Firebase Auth
      try {
        // Para isso, precisamos do uid do Firebase
        const userData = doc.data();
        if (userData.firebaseUid) {
          await admin.auth().deleteUser(userData.firebaseUid);
        }
      } catch (authError) {
        console.error('Erro ao deletar usuário do Firebase Auth:', authError);
        // Continuar mesmo se falhar a deleção no Auth
      }
    });
  } catch (error) {
    console.error('Erro ao processar deleção de conta:', error);
    throw error;
  }
}

// Exportar o app Express como uma Cloud Function
exports.api = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB'
  })
  .https.onRequest(app);

// Função agendada para cancelar pedidos abandonados - executa diariamente às 2:00 AM (horário de Brasília)
exports.cancelNeglectedOrders = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  // BRT é UTC-3, então 2:00 AM BRT = 5:00 AM UTC
  .pubsub.schedule('0 5 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('Iniciando verificação de pedidos abandonados...');
    try {
      // Obter intervalo de ontem (00:00 até 23:59)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const startOfYesterday = new Date(now);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(startOfYesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      // Buscar pedidos não finalizados (nem entregues, nem cancelados) de ontem
      const ordersRef = db.collection('orders');
      const snapshot = await ordersRef
        .where('status', 'not-in', ['Entregue', 'Cancelado'])
        .where('date', '>=', admin.firestore.Timestamp.fromDate(startOfYesterday))
        .where('date', '<=', admin.firestore.Timestamp.fromDate(endOfYesterday))
        .get();

      if (snapshot.empty) {
        console.log('Nenhum pedido negligenciado encontrado para cancelar');
        return null;
      }

      console.log(`Encontrados ${snapshot.size} pedidos negligenciados para cancelar`);

      const updatePromises = [];
      const notificationPromises = [];

      for (const doc of snapshot.docs) {
        const orderId = doc.id;
        const orderData = doc.data();
        const orderNumber = orderData.orderId || orderId;
        const customerPhone = orderData.customerPhone;

        console.log(`Cancelando pedido negligenciado: ${orderNumber}`);

        const statusUpdate = {
          status: 'Cancelado',
          timestamp: new Date(), // Changed from admin.firestore.FieldValue.serverTimestamp()
          reason: 'Negligenciado'
        };

        let newStatusHistory = Array.isArray(orderData.statusHistory)
          ? [...orderData.statusHistory]
          : [];
        newStatusHistory.push(statusUpdate);

        const updateData = {
          status: 'Cancelado',
          cancelReason: 'Negligenciado',
          isPending: false,
          isInPreparation: false,
          isInDelivery: false,
          isDelivered: false,
          isCanceled: true,
          statusHistory: newStatusHistory,
          lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        updatePromises.push(doc.ref.update(updateData));

        // Notificação (mantém igual)
        if (customerPhone) {
          try {
            const normalizedPhone = customerPhone.replace(/\D/g, '');
            const phoneFormats = [
              customerPhone,
              normalizedPhone,
              `+55${normalizedPhone}`,
              normalizedPhone.substring(2)
            ];
            let userId = null;
            for (const phoneFormat of phoneFormats) {
              const userSnapshot = await db.collection('users')
                .where('phone', '==', phoneFormat)
                .get();
              if (!userSnapshot.empty) {
                userId = userSnapshot.docs[0].id;
                break;
              }
            }
            if (!userId) {
              for (const phoneFormat of phoneFormats) {
                const userSnapshot = await db.collection('users')
                  .where('phoneNumber', '==', phoneFormat)
                  .get();
                if (!userSnapshot.empty) {
                  userId = userSnapshot.docs[0].id;
                  break;
                }
              }
            }
            if (userId) {
              const tokens = await getValidTokensFromUser(userId);
              if (tokens.length > 0) {
                const notificationPromise = sendExpoNotificationToTokens(
                  tokens,
                  'Cancelamento de Pedido',
                  `Seu pedido #${orderNumber} foi cancelado automaticamente por inatividade.`,
                  {
                    orderId: orderId,
                    orderNumber: orderNumber,
                    status: 'Cancelado',
                    type: 'ORDER_CANCELED',
                    reason: 'Negligenciado'
                  }
                );
                notificationPromises.push(notificationPromise);
              }
            }
          } catch (notificationError) {
            console.error(`Erro ao enviar notificação para pedido ${orderNumber}:`, notificationError);
          }
        }
      }

      await Promise.all(updatePromises);
      console.log(`${updatePromises.length} pedidos foram cancelados com sucesso`);
      try {
        if (notificationPromises.length > 0) {
          await Promise.all(notificationPromises);
          console.log(`${notificationPromises.length} notificações enviadas`);
        }
      } catch (batchNotificationError) {
        console.error('Erro ao processar lote de notificações:', batchNotificationError);
      }
      return { success: true, canceled: updatePromises.length };
    } catch (error) {
      console.error('Erro ao cancelar pedidos negligenciados:', error);
      return { success: false, error: error.message };
    }
  });

// Função agendada para gerar relatório mensal - executa todo dia 1º às 8:00 AM (horário de Brasília)
exports.generateMonthlyReport = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  // Executa no dia 1 de cada mês às 8:00 AM BRT (11:00 AM UTC)
  .pubsub.schedule('0 11 1 * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('Iniciando geração do relatório mensal...');
    
    const nodemailer = require('nodemailer');
    
    try {
      // Obter o mês anterior
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const TARGET_YEAR = previousMonth.getFullYear();
      const TARGET_MONTH = previousMonth.getMonth() + 1; // getMonth() é 0-indexado
      
      console.log(`Gerando relatório para: ${String(TARGET_MONTH).padStart(2, '0')}/${TARGET_YEAR}`);
      
      const startDate = new Date(TARGET_YEAR, TARGET_MONTH - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(TARGET_YEAR, TARGET_MONTH, 1, 0, 0, 0, 0);
      
      console.log(`Período de busca: de ${startDate.toISOString()} até ${endDate.toISOString()}`);
      
      // Função para formatar valores do Firestore
      const formatFieldValue = (value, indentLevel = 0) => {
        const indent = '  '.repeat(indentLevel);
        if (value && value.toDate && typeof value.toDate === 'function') {
          try {
            return value.toDate().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          } catch (e) {
            return 'Invalid Date';
          }
        }
        if (Array.isArray(value)) {
          if (value.length === 0) return '[]';
          return '\n' + value.map((item, index) => `${indent}  - ${formatFieldValue(item, indentLevel + 1)}`).join('\n');
        }
        if (typeof value === 'object' && value !== null) {
          if (Object.keys(value).length === 0) return '{}';
          return '\n' + Object.entries(value)
            .map(([key, val]) => `${indent}  ${key}: ${formatFieldValue(val, indentLevel + 1)}`)
            .join('\n');
        }
        return String(value);
      };
      
      let reportContent = `RELATÓRIO DE PEDIDOS MENSAIS - ${String(TARGET_MONTH).padStart(2, '0')}/${TARGET_YEAR}\n`;
      reportContent += `Data de Geração: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;
      
      // Buscar pedidos do mês
      const ordersSnapshot = await db.collection('orders')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(endDate))
        .get();
      
      const allMonthlyOrders = [];
      ordersSnapshot.forEach(doc => {
        allMonthlyOrders.push({ id: doc.id, ...doc.data() });
      });
      
      if (allMonthlyOrders.length === 0) {
        console.log(`Nenhum pedido encontrado para ${String(TARGET_MONTH).padStart(2, '0')}/${TARGET_YEAR}.`);
        reportContent += `Nenhum pedido encontrado para ${String(TARGET_MONTH).padStart(2, '0')}/${TARGET_YEAR}.\n`;
      } else {
        console.log(`Total de ${allMonthlyOrders.length} pedidos encontrados para o mês.`);
        
        // Processar Resumo de Entregas
        const deliveriesSummary = {};
        let totalDeliveredInMonth = 0;
        
        allMonthlyOrders.forEach(order => {
          if (order.status === 'Entregue' || order.isDelivered === true) {
            totalDeliveredInMonth++;
            const unitId = order.pharmacyUnitId || 'Unidade Desconhecida';
            const deliveryManId = order.deliveryMan || 'Entregador Desconhecido';
            const deliveryManName = order.deliveryManName || deliveryManId;
            
            if (!deliveriesSummary[unitId]) {
              deliveriesSummary[unitId] = { deliverymen: {}, unitTotal: 0 };
            }
            deliveriesSummary[unitId].unitTotal++;
            
            if (!deliveriesSummary[unitId].deliverymen[deliveryManId]) {
              deliveriesSummary[unitId].deliverymen[deliveryManId] = { name: deliveryManName, count: 0 };
            }
            deliveriesSummary[unitId].deliverymen[deliveryManId].count++;
          }
        });
        
        reportContent += `=== RESUMO DE ENTREGAS POR ENTREGADOR E UNIDADE (Status: Entregue) ===\n\n`;
        Object.entries(deliveriesSummary).sort((a,b) => a[0].localeCompare(b[0])).forEach(([unitId, unitData]) => {
          reportContent += `Unidade: ${unitId} - Total de Entregas na Unidade: ${unitData.unitTotal}\n`;
          Object.entries(unitData.deliverymen)
            .sort((a,b) => a[1].name.localeCompare(b[1].name))
            .forEach(([manId, manData]) => {
              reportContent += `  - Entregador: ${manData.name} (${manId}) - Entregas: ${manData.count}\n`;
            });
          reportContent += '\n';
        });
        reportContent += `TOTAL GERAL DE ENTREGAS NO MÊS (Status: Entregue): ${totalDeliveredInMonth}\n\n`;
        
        // Detalhes de Todos os Pedidos do Mês
        reportContent += `=== DETALHES DE TODOS OS PEDIDOS DO MÊS (${String(TARGET_MONTH).padStart(2, '0')}/${TARGET_YEAR}) - Total: ${allMonthlyOrders.length} ===\n\n`;
        allMonthlyOrders.forEach((order, index) => {
          reportContent += `--- Pedido ${index + 1} ---\n`;
          Object.entries(order).forEach(([key, value]) => {
            reportContent += `${key}: ${formatFieldValue(value, 1)}\n`;
          });
          reportContent += '\n';
        });
      }
        // Configurar transporte de email usando variáveis de ambiente
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: functions.config().email?.user || 'henrymatheusnascimentofroio@gmail.com',
          pass: functions.config().email?.password || process.env.EMAIL_PASSWORD
        }
      });
      
      // Configurar email
      const mailOptions = {
        from: functions.config().email?.user || 'henrymatheusnascimentofroio@gmail.com',
        to: ['humberto.farmanossa@gmail.com', 'macielssdf@hotmail.com'],
        subject: `Relatório Mensal de Pedidos - ${String(TARGET_MONTH).padStart(2, '0')}/${TARGET_YEAR}`,
        text: reportContent,
        attachments: [
          {
            filename: `relatorio-mensal-${TARGET_YEAR}-${String(TARGET_MONTH).padStart(2, '0')}.txt`,
            content: reportContent,
            contentType: 'text/plain'
          }
        ]
      };
      
      // Enviar email
      const info = await transporter.sendMail(mailOptions);
      console.log('Relatório enviado por email:', info.messageId);
      
      return { 
        success: true, 
        message: `Relatório mensal ${String(TARGET_MONTH).padStart(2, '0')}/${TARGET_YEAR} enviado com sucesso`,
        ordersProcessed: allMonthlyOrders.length,
        totalDelivered: totalDeliveredInMonth
      };
      
    } catch (error) {
      console.error('Erro ao gerar relatório mensal:', error);
      
      // Em caso de erro, ainda tenta enviar um email de notificação
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: 'farmanossaapp@gmail.com',
            pass: 'farmanossa2024!'
          }
        });
        
        const errorMailOptions = {
          from: 'farmanossaapp@gmail.com',
          to: ['humberto.farmanossa@gmail.com', 'macielssdf@hotmail.com'],
          subject: `ERRO - Relatório Mensal de Pedidos`,
          text: `Ocorreu um erro ao gerar o relatório mensal:\n\n${error.message}\n\nPor favor, verifique os logs do sistema.`
        };
        
        await transporter.sendMail(errorMailOptions);
        console.log('Email de erro enviado');
      } catch (emailError) {
        console.error('Erro ao enviar email de erro:', emailError);
      }
      
      return { success: false, error: error.message };
    }
  });

