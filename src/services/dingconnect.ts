import { DingConnectResponse } from '../types';
import { ALL_OPERATORS } from '../constants/countries';

// Cache para evitar recargas duplicadas
const rechargeCache = new Map<string, Promise<any>>();

class ReloadlyService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = import.meta.env.VITE_RELOADLY_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_RELOADLY_CLIENT_SECRET || '';
    
    console.log('🚨🚨🚨 Reloadly: MODO PRODUÇÃO ATIVADO 🚨🚨🚨');
    console.log('📱 Reloadly: RECARGAS REAIS serão enviadas para os números!');
    console.log('💰 Reloadly: Saldo pré-pago será DEBITADO da sua conta!');
    console.log('🔥 Reloadly: TESTE REAL - Números receberão créditos de verdade!');
    
    console.log('🔐 Reloadly: Configuração OAuth2', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      clientIdLength: this.clientId?.length || 0,
      clientSecretLength: this.clientSecret?.length || 0,
      note: 'Usando OAuth2 client_credentials flow'
    });
  }

  isProperlyConfigured(): boolean {
    return this.clientId.length >= 20 && 
           this.clientSecret.length >= 40 &&
           this.clientId !== 'your-reloadly-client-id' &&
           this.clientSecret !== 'your-reloadly-client-secret';
  }

  async getOperators(countryCode: string = 'HT') {
    try {
      if (!this.isProperlyConfigured()) {
        throw new Error('Reloadly não configurado. Configure VITE_RELOADLY_CLIENT_ID e VITE_RELOADLY_CLIENT_SECRET com credenciais OAuth2 válidas.');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reloadly-operators`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ countryCode })
      });

      if (!response.ok) {
        throw new Error(`Falha ao buscar operadoras: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro na API Reloadly');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Reloadly: Erro ao buscar operadoras:', error);
      throw error;
    }
  }

  async performRecharge(
    phoneNumber: string,
    operatorId: string,
    amount: number,
    currency: string = 'BRL'
  ): Promise<DingConnectResponse> {
    // Criar chave única para esta recarga
    const rechargeKey = `${phoneNumber}-${operatorId}-${amount}-${currency}-${Date.now()}`;
    
    // Verificar se já existe uma recarga em andamento para os mesmos parâmetros
    const duplicateKey = `${phoneNumber}-${operatorId}-${amount}-${currency}`;
    const existingRecharge = Array.from(rechargeCache.keys()).find(key => 
      key.startsWith(duplicateKey) && (Date.now() - parseInt(key.split('-').pop() || '0')) < 60000
    );
    
    if (existingRecharge) {
      console.log('⚠️ Reloadly: Recarga duplicada detectada, aguardando resultado anterior...', {
        phoneNumber,
        operatorId,
        amount,
        currency,
        existingKey: existingRecharge
      });
      
      try {
        return await rechargeCache.get(existingRecharge)!;
      } catch (error) {
        console.log('⚠️ DingConnect: Erro na recarga anterior, processando nova...');
        console.log('⚠️ Reloadly: Erro na recarga anterior, processando nova...');
      }
    }

    try {
      console.log('🔄 Reloadly: Processando recarga...', { 
        phoneNumber, 
        operatorId, 
        amount, 
        currency,
        rechargeKey,
        timestamp: new Date().toISOString()
      });

      if (!this.isProperlyConfigured()) {
        console.error('❌ Reloadly: Não configurado corretamente');
        return {
          success: false,
          error: 'RELOADLY_NOT_CONFIGURED',
          message: 'Configure VITE_RELOADLY_CLIENT_ID e VITE_RELOADLY_CLIENT_SECRET'
        };
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Get operator to determine expected phone length
      const operator = ALL_OPERATORS.find(op => op.id === operatorId);
      if (!operator) {
        console.error('❌ Reloadly: Operadora não encontrada', { operatorId });
        return {
          success: false,
          error: 'OPERATOR_NOT_FOUND',
          message: `Operadora não encontrada: ${operatorId}`
        };
      }
      
      // Determine expected phone length based on country
      let expectedLength = 8; // Default for Haiti
      if (operator.country === 'DO') {
        expectedLength = 10; // Dominican Republic
      }
      
      if (cleanPhone.length !== expectedLength) {
        console.error('❌ Reloadly: Número inválido', { 
          phoneNumber, 
          cleanPhone, 
          expectedLength,
          actualLength: cleanPhone.length,
          country: operator.country
        })
        return {
          success: false,
          error: 'INVALID_PHONE_NUMBER',
          message: `Número inválido: ${phoneNumber}. Esperado ${expectedLength} dígitos para ${operator.country === 'DO' ? 'República Dominicana' : 'Haiti'}`
        };
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reloadly-recharge`;
      
      console.log('📤 Reloadly: Enviando para Edge Function', {
        url: apiUrl,
        phoneNumber: cleanPhone,
        operatorId,
        amount,
        currency
      })
      
      // Criar promise e adicionar ao cache
      const rechargePromise = fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          operatorId,
          amount,
          currency
        })
      }).then(async (response) => {
        console.log('📥 Reloadly: Resposta da Edge Function', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });
        
        const responseData = await response.json();
        console.log('📄 Reloadly: Dados da resposta', {
          success: responseData.success,
          error: responseData.error,
          message: responseData.message,
          hasDetails: !!responseData.details
        });
        
        if (!response.ok) {
          console.error('❌ Reloadly: Erro na Edge Function', {
            status: response.status,
            statusText: response.statusText,
            error: responseData.error,
            message: responseData.message,
            details: responseData.details,
            clientIdConfigured: !!this.clientId,
            clientSecretConfigured: !!this.clientSecret
          });
          
          // Melhor tratamento de erro OAuth2
          if (response.status === 400 && responseData.error === 'OAUTH_TOKEN_FAILED') {
            const errorMessage = `Erro OAuth2: Credenciais Reloadly inválidas. Verifique se as credenciais no Supabase estão corretas.`;
            
            return {
              success: false,
              error: 'RELOADLY_AUTH_FAILED',
              message: errorMessage
            };
          }
          
          const errorMessage = responseData.message || responseData.error || `Erro HTTP ${response.status}: ${response.statusText}`;
          
          return {
            ...responseData,
            message: errorMessage,
            error: responseData.error || 'RELOADLY_API_ERROR'
          };
        }

        if (responseData.success) {
          console.log('✅ Reloadly: Recarga processada com sucesso', {
            transactionId: responseData.transactionId,
            status: responseData.status,
            customIdentifier: responseData.customIdentifier,
            operatorTransactionId: responseData.operatorTransactionId,
            message: responseData.message || 'Recarga processada com sucesso'
          });
        } else {
          console.error('❌ Reloadly: Recarga falhou', {
            error: responseData.error,
            message: responseData.message,
            details: responseData.details,
            fullResponse: responseData
          });
          
          if (!responseData.message && !responseData.error) {
            responseData.message = 'Falha na recarga - erro desconhecido';
            responseData.error = 'UNKNOWN_RECHARGE_ERROR';
          }
        }

        return responseData;
      });
      
      // Adicionar ao cache
      rechargeCache.set(rechargeKey, rechargePromise);
      
      // Limpar cache após 5 minutos
      setTimeout(() => {
        rechargeCache.delete(rechargeKey);
      }, 300000);
      
      const responseData = await rechargePromise;

      return responseData;
    } catch (error) {
      console.error('❌ Reloadly: Erro crítico', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      
      // Remover do cache em caso de erro
      rechargeCache.delete(rechargeKey);
      
      return {
        success: false,
        error: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Erro crítico na API Reloadly'
      };
    }
  }

  getCurrentConfiguration() {
    return {
      mode: 'production',
      isConfigured: this.isProperlyConfigured(),
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      isLive: true,
      isTest: false,
      productionMode: true
    };
  }
}

export const reloadlyService = new ReloadlyService();