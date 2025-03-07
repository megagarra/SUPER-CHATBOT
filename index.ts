import express from 'express';
import cors from 'cors';
import { start, qrEmitter, findOrCreateThread } from './whatsAppBot';
import { Thread, getConfig } from './database';
import { config, initializeConfig } from './config';
import configRoutes from './routes/configRoutes';
import conversationRoutes from './routes/conversationRoutes';
import qrcode from 'qrcode';
import path from 'path';
import { ExternalApiService } from './services/externalApi';

const app = express();
app.use(express.json());

app.use(cors({
    origin: (origin, callback) => {
      const whitelist = [
        'http://localhost:3000',
      ];
      
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));

const PORT = process.env.NODE_DOCKER_PORT || 8080;

// Variável para armazenar o último QR Code recebido
let currentQRCode: string | null = null;

// Escutar eventos de QR Code emitidos pelo WhatsApp Bot
qrEmitter.on('qr', (qr) => {
    currentQRCode = qr;
    console.log('QR Code atualizado.');
});

// Middleware para logging de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Adiciona rotas de API
app.use('/api/config', configRoutes);
app.use('/api/conversations', conversationRoutes);

// Rota principal
app.get('/', async (req, res) => {
    return res.status(200).json({ 
        message: `${config.botName} The AI Companion`,
        version: '1.0.0',
        status: 'online'
    });
});

// Rota para servir o QR Code como imagem PNG
app.get('/qrcode', async (req, res) => {
    if (!currentQRCode) {
        return res.status(404).json({ message: 'QR Code não disponível no momento.' });
    }

    try {
        const qrImage = await qrcode.toBuffer(currentQRCode, { type: 'png' });
        res.type('png');
        res.send(qrImage);
    } catch (error) {
        console.error('Erro ao gerar a imagem do QR Code:', error);
        res.status(500).json({ message: 'Erro ao gerar o QR Code.' });
    }
});

// Endpoint para pausar uma conversa (mantido para compatibilidade)
app.post('/conversation/:id/pause', async (req, res) => {
    try {
        const conversationId = req.params.id;
        // Utiliza o findOrCreateThread para garantir que a conversa exista
        const thread = await findOrCreateThread(conversationId);
        thread.set('paused', true);
        await thread.save();
        console.log(`Conversa ${conversationId} pausada.`);
        res.status(200).json({ message: `Conversa ${conversationId} foi pausada.` });
    } catch (error) {
        console.error('Erro ao pausar a conversa:', error);
        res.status(500).json({ message: 'Erro ao pausar a conversa.' });
    }
});

// Endpoint para retomar uma conversa (mantido para compatibilidade)
app.post('/conversation/:id/resume', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const thread = await Thread.findOne({ where: { identifier: conversationId } });
        if (!thread) {
            return res.status(404).json({ message: `Conversa ${conversationId} não encontrada.` });
        }
        thread.set('paused', false);
        await thread.save();
        console.log(`Conversa ${conversationId} retomada.`);
        res.status(200).json({ message: `Conversa ${conversationId} foi retomada.` });
    } catch (error) {
        console.error('Erro ao retomar a conversa:', error);
        res.status(500).json({ message: 'Erro ao retomar a conversa.' });
    }
});

// Endpoint para verificar o status de uma conversa (mantido para compatibilidade)
app.get('/conversation/:id/status', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const thread = await Thread.findOne({ where: { identifier: conversationId } });
        if (!thread) {
            return res.status(404).json({ message: `Conversa ${conversationId} não encontrada.` });
        }
        res.status(200).json({ conversationId, paused: thread.get('paused') });
    } catch (error) {
        console.error('Erro ao consultar status da conversa:', error);
        res.status(500).json({ message: 'Erro ao consultar status da conversa.' });
    }
});

// Middleware para capturar rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Rota não encontrada',
        path: req.path
    });
});

// Middleware para tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor', 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Inicialização da aplicação
async function startApplication() {
    try {
        // Inicializar as configurações do banco de dados
        console.log('Inicializando configurações...');
        await initializeConfig();
        
        // Inicializar o serviço de API externa
        console.log('Inicializando serviço de API externa...');
        const apiService = ExternalApiService.getInstance({
            baseUrl: config.API_BASE_URL,
            timeout: config.API_TIMEOUT ? parseInt(config.API_TIMEOUT) : undefined,
            maxRetries: config.API_MAX_RETRIES ? parseInt(config.API_MAX_RETRIES) : undefined,
            retryDelay: config.API_RETRY_DELAY ? parseInt(config.API_RETRY_DELAY) : undefined,
            logLevel: (process.env.NODE_ENV === 'production' ? 'info' : 'debug') as any,
            cache: {
                enabled: config.API_ENABLE_CACHE === 'true',
                ttl: config.API_CACHE_TTL ? parseInt(config.API_CACHE_TTL) : 60000
            }
        });
        
        // Carregar mapeamentos personalizados de função para endpoint
        const functionMappingsStr = await getConfig('API_FUNCTION_MAPPINGS');
        if (functionMappingsStr) {
            try {
                const functionMappings = JSON.parse(functionMappingsStr);
                console.log(`Carregando ${functionMappings.length} mapeamentos de função...`);
                
                for (const mapping of functionMappings) {
                    const { functionName, path, method } = mapping;
                    apiService.addEndpointMapping(functionName, path, method || 'POST');
                }
                
                console.log('✅ Mapeamentos de função carregados com sucesso.');
            } catch (e) {
                console.error('❌ Erro ao processar mapeamentos de função:', e);
            }
        }
        
        // Iniciar o servidor Express
        app.listen(PORT, () => {
            console.log(`Servidor Express ouvindo na porta ${PORT}`);
        });
        
        // Iniciar o bot do WhatsApp
        console.log('Iniciando bot do WhatsApp...');
        start();
        
        console.log('Aplicação iniciada com sucesso!');
    } catch (error) {
        console.error('Erro ao iniciar a aplicação:', error);
        process.exit(1);
    }
}

// Iniciar a aplicação
startApplication();