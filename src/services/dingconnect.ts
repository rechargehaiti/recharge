import { DingConnectResponse } from '../types';
import { ALL_OPERATORS } from '../constants/countries';

// Cache para evitar recargas duplicadas
const rechargeCache = new Map<string, Promise<any>>();

class DingConnectService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_DINGCONNECT_API_KEY || '';
    this.apiSecret = import.meta.env.VITE_DINGCONNECT_API_SECRET || '';
    
    console.log('🚨🚨🚨 DingConnect: MODO PRODUÇÃO ATIVADO 🚨🚨🚨');
    console.log('📱 DingConnect: RECARGAS REAIS serão enviadas para os números!');
    console.log('💰 DingConnect: Saldo pré-pago será DEBITADO da sua conta!');
    console.log('🔥 DingConnect: TESTE REAL - Números receberão créditos de verdade!');
    
    console.log('🔐 DingConnect: Configuração API', {
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret,
      apiKeyLength: this.apiKey?.length || 0,
      apiSecretLength: this.apiSecret?.length || 0,
      note: 'Usando autenticação Bearer Token + X-API-Secret'
    });
  }

  isProperlyConfigured(): boolean {
    return this.apiKey.length >= 20 && 
           this.apiSecret.length >= 40 &&
           this.apiKey !== 'your-dingconnect-api-key' &&
           this.apiSecret !== 'your-dingconnect-api-secret';
  }

  async getOperators(countryCode: string = 'HT') {
    try {
      if (!this.isProperlyConfigured()) {
        throw new Error('DingConnect não configurado. Configure VITE_DINGCONNECT_API_KEY e VITE_DINGCONNECT_API_SECRET com credenciais válidas.');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dingconnect-operators`;
      
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
        throw new Error(data.error || 'Erro na API DingConnect');
      }

      return data.data;
    } catch (error) {
      console.error('❌ DingConnect: Erro ao buscar operadoras:', error);
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
      console.log('⚠️ DingConnect: Recarga duplicada detectada, aguardando resultado anterior...', {
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
      }
    }

    try {
      console.log('🔄 DingConnect: Processando recarga...', { 
        phoneNumber, 
        operatorId, 
        amount, 
        currency,
        rechargeKey,
        timestamp: new Date().toISOString()
      });

      if (!this.isProperlyConfigured()) {
        console.error('❌ DingConnect: Não configurado corretamente');
        return {
          success: false,
          error: 'DINGCONNECT_NOT_CONFIGURED',
          message: 'Configure VITE_DINGCONNECT_API_KEY e VITE_DINGCONNECT_API_SECRET'
        };
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Get operator to determine expected phone length
      const operator = ALL_OPERATORS.find(op => op.id === operatorId);
      if (!operator) {
        console.error('❌ DingConnect: Operadora não encontrada', { operatorId });
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
        console.error('❌ DingConnect: Número inválido', { 
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

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dingconnect-recharge`;
      
      console.log('📤 DingConnect: Enviando para Edge Function', {
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
        console.log('📥 DingConnect: Resposta da Edge Function', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });
        
        const responseData = await response.json();
        console.log('📄 DingConnect: Dados da resposta', {
          success: responseData.success,
          error: responseData.error,
          message: responseData.message,
          hasDetails: !!responseData.details
        });
        
        if (!response.ok) {
          console.error('❌ DingConnect: Erro na Edge Function', {
            status: response.status,
            statusText: response.statusText,
            error: responseData.error,
            message: responseData.message,
            details: responseData.details,
            apiKeyConfigured: !!this.apiKey,
            apiSecretConfigured: !!this.apiSecret
          });
          
          // Melhor tratamento de erro de autenticação
          if (response.status === 400 && responseData.error === 'AUTH_FAILED') {
            const errorMessage = `Erro de autenticação: Credenciais DingConnect inválidas. Verifique se as credenciais no Supabase estão corretas.`;
            
            return {
              success: false,
              error: 'DINGCONNECT_AUTH_FAILED',
              message: errorMessage
            };
          }
          
          const errorMessage = responseData.message || responseData.error || `Erro HTTP ${response.status}: ${response.statusText}`;
          
          return {
            ...responseData,
            message: errorMessage,
            error: responseData.error || 'DINGCONNECT_API_ERROR'
          };
        }

        if (responseData.success) {
          console.log('✅ DingConnect: Recarga processada com sucesso', {
            transactionId: responseData.transactionId,
            status: responseData.status,
            customIdentifier: responseData.customIdentifier,
            operatorTransactionId: responseData.operatorTransactionId,
            message: responseData.message || 'Recarga processada com sucesso'
          });
        } else {
          console.error('❌ DingConnect: Recarga falhou', {
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
      console.error('❌ DingConnect: Erro crítico', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      
      // Remover do cache em caso de erro
      rechargeCache.delete(rechargeKey);
      
      return {
        success: false,
        error: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Erro crítico na API DingConnect'
      };
    }
  }

  getCurrentConfiguration() {
    return {
      mode: 'production',
      isConfigured: this.isProperlyConfigured(),
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret,
      isLive: true,
      isTest: false,
      productionMode: true
    };
  }
}

export const dingconnectService = new DingConnectService();