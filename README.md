# BOT WHATSAPP
![image](https://github.com/user-attachments/assets/0e1770b3-4c2b-43b2-b1d4-05d6a4f779bc)


Um bot para WhatsApp com uma persona que utiliza a API Assistant da OpenAI, oferecendo uma experiência de companhia de IA através do WhatsApp.

## Visão Geral

O Garra AI Companion é um bot para WhatsApp que conecta a poderosa API Assistant da OpenAI com o WhatsApp, permitindo que os usuários interajam com um assistente de IA através de suas mensagens no WhatsApp. O bot suporta mensagens de texto, notas de voz (com transcrição), imagens (com análise de visão) e processamento de arquivos (PDFs, TXT).

## Funcionalidades Principais

- **Integração com WhatsApp**: Conecte-se com usuários via WhatsApp
- **API Assistant da OpenAI**: Aproveite as capacidades de IA usando a API Assistant da OpenAI
- **Suporte a Multimídia**:
  - Transcrição de notas de voz usando a API Whisper
  - Análise de imagens com GPT-4 Vision
  - Processamento de arquivos PDF e TXT
- **Integração com API Externa**: Conecte-se a serviços externos através de um serviço de API flexível
- **Gerenciamento de Configuração**: Configuração armazenada em banco de dados com interface web
- **Persistência de Mensagens**: Armazene o histórico de conversas em um banco de dados PostgreSQL
- **Gerenciamento de Conversas**: Pause/retome conversas
- **Fila de Mensagens**: Fila baseada em Redis para processar mensagens em ordem
- **Autenticação**: Autenticação baseada em código QR para WhatsApp Web

## Arquitetura

A aplicação consiste em vários componentes:

### Componentes Principais

1. **Cliente WhatsApp**: Gerencia a conexão com o WhatsApp Web usando `@periskope/whatsapp-web.js`
2. **Cliente OpenAI**: Lida com interações com a API da OpenAI para Assistant, Vision e Whisper
3. **Banco de Dados**: Banco de dados PostgreSQL para armazenar conversas, mensagens e configurações
4. **Fila Redis**: Para processamento assíncrono de mensagens
5. **Servidor Express**: Fornece uma API REST para gerenciar o bot
6. **Serviço de API Externa**: Proxy genérico para conexão com APIs externas

### Modelos de Banco de Dados

- **Thread**: Representa uma conversa com um usuário
- **ThreadMessage**: Mensagens individuais em uma thread
- **Config**: Valores de configuração do sistema

### Fluxo de Serviço

1. Usuário envia uma mensagem para o número do WhatsApp
2. Bot recebe a mensagem via cliente WhatsApp Web
3. Para mensagens de texto:
   - As mensagens são agregadas com debounce (3s) para combinar mensagens fragmentadas
   - A thread é criada ou recuperada do banco de dados
   - A mensagem é enviada para a API Assistant da OpenAI
   - A resposta é enviada de volta ao usuário
4. Para mídia (notas de voz, imagens, arquivos):
   - A mídia é processada imediatamente (transcrição, análise de visão, extração de texto)
   - O resultado é enviado para a API Assistant da OpenAI
   - A resposta é enviada de volta ao usuário
5. Todas as mensagens são armazenadas no banco de dados

## Instalação

### Pré-requisitos

- Node.js (v14+)
- Banco de dados PostgreSQL
- Servidor Redis
- Chave de API da OpenAI
- Conta de WhatsApp

### Variáveis de Ambiente

Crie um arquivo `.env` no diretório raiz com as seguintes variáveis:

```
# Configuração Principal
OPENAI_API_KEY=sua_chave_api_openai
ASSISTANT_ID=seu_id_de_assistente
BOT_NAME=Garra
WHATSAPP_NUMBER=seu_numero_whatsapp

# Configuração do Banco de Dados
DATABASE_URL=postgres://usuario:senha@localhost:5432/nome_do_banco

# Configuração do Redis
REDIS_URL=redis://localhost:6379

# Configuração da API
API_BASE_URL=https://sua-api-externa.com
```

### Configuração

1. Instale as dependências:
```bash
npm install
```

2. Migre o banco de dados:
```bash
npm run migrate
```

3. Inicie o bot:
```bash
npm start
```

4. Escaneie o código QR exibido com o WhatsApp para autenticar

## Uso

### Endpoints da API REST

O bot fornece uma API REST para gerenciamento:

#### Endpoints de Configuração

- `GET /api/config`: Obter todas as configurações
- `GET /api/config/:key`: Obter uma configuração específica
- `POST /api/config`: Criar ou atualizar uma configuração
- `PUT /api/config/:key`: Atualizar uma configuração específica
- `DELETE /api/config/:key`: Excluir uma configuração

#### Configuração de API Externa

- `POST /api/config/external-api/config`: Configurar as configurações da API externa
- `POST /api/config/external-api/mappings`: Configurar mapeamentos de função
- `POST /api/config/external-api/clear-cache`: Limpar cache da API
- `POST /api/config/test-api`: Testar conexão com a API

#### Gerenciamento de Conversas

- `GET /api/conversations`: Obter todas as conversas (com paginação)
- `GET /api/conversations/:id`: Obter uma conversa específica com mensagens
- `POST /api/conversations`: Criar uma nova conversa
- `POST /api/conversations/:id/pause`: Pausar uma conversa
- `POST /api/conversations/:id/resume`: Retomar uma conversa
- `GET /api/conversations/:id/status`: Obter status da conversa
- `POST /api/conversations/:id/messages`: Adicionar uma mensagem a uma conversa
- `GET /api/conversations/search/messages`: Pesquisar mensagens

#### Endpoints Legados (Obsoletos)

- `POST /conversation/:id/pause`: Pausar uma conversa
- `POST /conversation/:id/resume`: Retomar uma conversa
- `GET /conversation/:id/status`: Obter status da conversa

### Comandos do Bot

O bot não possui comandos específicos. Os usuários podem simplesmente enviar mensagens, e o assistente de IA responderá de acordo com suas capacidades e persona.

## Gerenciamento de Configuração

O sistema usa uma abordagem de configuração em camadas:

1. **Configuração de Banco de Dados**: Fonte primária de configuração
2. **Cache de Memória**: Para acesso rápido à configuração
3. **Variáveis de Ambiente**: Fallback e valores iniciais

A configuração pode ser atualizada via API ou através de scripts de banco de dados.

## Integração com API Externa

O sistema inclui um Serviço de API Externa flexível para conexão com serviços externos:

- Cliente HTTP genérico com suporte para múltiplos métodos (GET, POST, PUT, DELETE, PATCH)
- Mapeamento de funções para traduzir chamadas de função da IA para endpoints de API
- Suporte a autenticação (Basic, Bearer, API Key)
- Cache de requisições
- Mecanismo de retry com backoff exponencial
- Sistema de logging

## Desenvolvimento

### Scripts

- `npm start`: Iniciar a aplicação
- `npm run migrate`: Executar migrações de banco de dados
- `npm run update-openai-key`: Atualizar chave da API OpenAI
- `npm run migrate-env-to-db`: Migrar variáveis de ambiente para o banco de dados

### Notas Importantes

1. **Cache de Threads**: As threads são armazenadas em cache na memória para melhor desempenho
2. **Agregação de Mensagens**: Mensagens de texto são agregadas por 3 segundos para melhorar a experiência do usuário
3. **Tratamento de Erros**: O sistema implementa mecanismos robustos de tratamento de erros e retry
4. **Logging**: Logging extensivo para fins de depuração

## Considerações de Segurança

- Chaves de API da OpenAI são mascaradas nos logs
- Valores sensíveis (chaves de API, URLs de banco de dados) são mascarados nas respostas da API
- Autenticação é necessária para o WhatsApp Web usando código QR
- Valores de configuração podem ser criptografados no banco de dados
- Proteção CORS no servidor da API

## Limitações

- Requer uma sessão ativa do WhatsApp (re-autenticação necessária se desconectado)
- Depende da disponibilidade do serviço da OpenAI
- Limitado pela taxa da API da OpenAI
- Limitações de tamanho de arquivo para processamento de mídia

## Solução de Problemas

### Problemas Comuns

1. **Falha na Autenticação**: A sessão do WhatsApp pode ter expirado. Reinicie o bot e escaneie o código QR novamente.
2. **Erros da API OpenAI**: Verifique a validade da chave de API e limites de cota.
3. **Problemas de Conexão com o Banco de Dados**: Verifique se o DATABASE_URL está correto e o banco de dados está acessível.
4. **Problemas de Conexão com o Redis**: Certifique-se de que o Redis está em execução e o REDIS_URL está correto.

### Logs

A aplicação registra logs extensivamente para ajudar a diagnosticar problemas. Verifique a saída do console para:

- Status da conexão do WhatsApp
- Detalhes de processamento de mensagens
- Chamadas e respostas da API
- Alterações de configuração
- Mensagens de erro com stack traces

## Licença

Este projeto é um software proprietário. Distribuição não autorizada é proibida.

## Contribuidores

Este projeto foi desenvolvido por mim mesmo.
