# Recharge Haiti

Um aplicativo web para revenda de recargas internacionais direcionado para haitianos na diáspora que desejam comprar recargas e enviar para Haiti e República Dominicana.

## Funcionalidades

- **Sistema Brasil**: Suporte exclusivo para o Brasil
- **Pagamentos Seguros**: PIX via MercadoPago
- **Múltiplos Destinos**: Haiti e República Dominicana
- **Reembolso Automático**: Sistema automático de estorno em caso de falha
- **Histórico Completo**: Acompanhe todas as suas transações
- **Interface Responsiva**: Design otimizado para dispositivos móveis

## Tecnologias

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Payments**: MercadoPago (PIX)
- **Recharges**: DingConnect API
- **Icons**: Lucide React

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── pages/              # Páginas principais
├── services/           # Integrações com APIs
├── hooks/              # Custom hooks
├── types/              # TypeScript types
├── constants/          # Constantes e configurações
└── utils/              # Funções utilitárias
```

## Setup

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas chaves de API
   ```
4. Configure o Supabase:
   - Clique em "Connect to Supabase" no topo da aplicação
   - Execute as migrações SQL
5. Execute o projeto: `npm run dev`

## Países e Operadoras Suportadas

### 🇭🇹 Haiti
- **Digicel Haiti**: Prefixos 30, 31, 34, 36, 37, 38, 39, 46, 47, 48, 28
- **Natcom Haiti**: Prefixos 32, 33, 40, 41, 42, 43, 22, 25
- **Formato**: XXXX-XXXX (8 dígitos)
- **Código**: +509

### 🇩🇴 República Dominicana
- **Claro República Dominicana**: Códigos de área 809, 829, 849
- **Orange República Dominicana**: Códigos de área 809, 829, 849
- **Viva República Dominicana**: Códigos de área 809, 829, 849
- **Formato**: XXX-XXX-XXXX (10 dígitos)
- **Código**: +1

## Configuração do Supabase

1. Crie um novo projeto no Supabase
2. Execute as migrações SQL em `supabase/migrations/`
3. Configure as variáveis de ambiente

## Integrações

### Configuração das APIs

#### DingConnect API
1. Crie uma conta em [DingConnect](https://www.dingconnect.com/) (PRODUÇÃO)
2. Acesse o dashboard e obtenha:
   - API Key
   - API Secret
3. Configure no arquivo `.env`:
   ```
   # Para frontend (Vite)
   VITE_DINGCONNECT_API_KEY=your-api-key
   VITE_DINGCONNECT_API_SECRET=your-api-secret
   # Para Supabase Edge Functions
   DINGCONNECT_API_KEY=your-api-key
   DINGCONNECT_API_SECRET=your-api-secret
   ```

#### MercadoPago (Brasil)
1. Crie uma conta em [MercadoPago Developers](https://www.mercadopago.com.br/developers)
2. Obtenha as chaves (modo teste):
   - Access Token
   - Public Key
3. Configure no arquivo `.env`:
   ```
   # Para frontend (Vite)
   VITE_MERCADOPAGO_ACCESS_TOKEN=your-access-token
   VITE_MERCADOPAGO_PUBLIC_KEY=your-public-key
   # Para Supabase Edge Functions
   MERCADOPAGO_ACCESS_TOKEN=your-access-token
   ```

### DingConnect API
- Autenticação via Bearer Token + X-API-Secret
- Suporte para múltiplas operadoras no Haiti e República Dominicana
- **⚠️ PRODUÇÃO**: Recargas via DingConnect usam saldo real pré-pago

### MercadoPago
- Pagamentos PIX instantâneos
- QR Code automático
- Polling para confirmação de pagamento
- Sistema de reembolso automático

## Fluxo de Recarga

1. **Seleção do país** de origem (Brasil)
2. **Seleção do país** de destino (Haiti ou República Dominicana)
3. **Inserção do número** de destino
4. **Escolha da operadora** (baseada no país)
5. **Seleção do valor** da recarga e método de pagamento (PIX)
6. **Processamento do pagamento**
7. **Confirmação do pagamento**
8. **Execução da recarga** via DingConnect
9. **Confirmação ou reembolso** automático

## Fluxo Técnico Detalhado

### Pagamento PIX (Brasil)
1. Criação do pagamento no MercadoPago
2. Geração do QR Code PIX
3. Polling para confirmação (10s intervals, 5min timeout)
4. Confirmação → Execução da recarga
5. Falha na recarga → Reembolso automático

## Tratamento de Erros

- **Falha no pagamento**: Transação marcada como "failed"
- **Falha na recarga**: Reembolso automático + status "refunded"
- **Timeout de pagamento**: Cancelamento automático
- **Erro de API**: Logs detalhados + retry automático

## Segurança

- Row Level Security (RLS) habilitado no Supabase
- Validação de dados em múltiplas camadas
- Logs detalhados para auditoria
- Tratamento seguro de erros

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.