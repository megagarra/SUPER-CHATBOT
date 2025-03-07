// src/config.ts
import process from 'process';
import dotenv from 'dotenv';
import { getConfigCached, refreshConfigCache } from './database';

// Carrega as variáveis de ambiente do arquivo .env (como fallback)
dotenv.config();

// Interface para objeto de configuração
interface ConfigObject {
  whatsAppNumber: string;
  openAIAPIKey: string;
  API_BASE_URL: string;
  assistantId: string;
  botName: string;
  [key: string]: string;
}

// Objeto de configuração inicial (será preenchido pelo banco)
let configObject: ConfigObject = {
  whatsAppNumber: process.env.WHATSAPP_NUMBER || '',
  openAIAPIKey: process.env.OPENAI_API_KEY || '',
  API_BASE_URL: process.env.API_BASE_URL || '',
  assistantId: process.env.ASSISTANT_ID || '',
  botName: process.env.BOT_NAME || 'Garra'
};

// Mapeamento entre nomes de variáveis do banco e campos do objeto de configuração
const configMapping: Record<string, keyof ConfigObject> = {
  'OPENAI_API_KEY': 'openAIAPIKey',
  'ASSISTANT_ID': 'assistantId',
  'BOT_NAME': 'botName',
  'WHATSAPP_NUMBER': 'whatsAppNumber',
  'API_BASE_URL': 'API_BASE_URL'
};

// Inicializa as configurações do banco de dados
export async function initializeConfig(): Promise<ConfigObject> {
  try {
    console.log('Inicializando configurações do banco de dados...');
    
    // Atualiza o cache com as configurações do banco
    const dbConfigs = await refreshConfigCache();
    
    // Atualiza o objeto de configuração com os valores do banco
    for (const [key, value] of Object.entries(dbConfigs)) {
      const mappedField = configMapping[key];
      
      if (mappedField) {
        configObject[mappedField] = value;
        console.log(`✅ Configuração carregada: ${key} -> ${mappedField}`);
      }
    }
    
    // Log de configurações críticas (com mascaramento)
    console.log(`✅ API Key da OpenAI: ${maskSensitiveValue(configObject.openAIAPIKey)}`);
    console.log(`✅ ID do Assistente: ${configObject.assistantId}`);
    console.log(`✅ Nome do Bot: ${configObject.botName}`);
    
    // Validação das variáveis obrigatórias
    const requiredFields = ['openAIAPIKey', 'assistantId'];
    let hasMissingVars = false;
    
    for (const field of requiredFields) {
      if (!configObject[field]) {
        console.error(`Erro: A configuração ${field} não está definida ou está vazia.`);
        hasMissingVars = true;
      }
    }
    
    if (hasMissingVars) {
      console.error('⚠️ ATENÇÃO: Configurações obrigatórias ausentes. O sistema pode não funcionar corretamente.');
    }
    
    return configObject;
  } catch (error) {
    console.error('Erro ao inicializar configurações:', error);
    console.log('⚠️ Usando configurações do arquivo .env como fallback.');
    return configObject;
  }
}

// Método para atualizar o objeto de configuração
export async function refreshConfig(): Promise<ConfigObject> {
  return await initializeConfig();
}

// Função auxiliar para mascarar valores sensíveis
function maskSensitiveValue(value: string): string {
  if (!value) return 'não definido';
  if (value.length <= 8) return '********';
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

// Exportação (compatível com o código existente)
export const config = new Proxy({} as ConfigObject, {
  get: (_target, prop) => {
    // Se a prop existe no objeto de configuração, retorna seu valor
    if (typeof prop === 'string' && prop in configObject) {
      return configObject[prop];
    }
    
    // Caso contrário, retorna undefined
    return undefined;
  }
});

export default config;