import { PaymentResponse } from '../types';

class MercadoPagoService {
  private publicKey: string;
  private accessToken: string;

  constructor() {
    this.publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';
    this.accessToken = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '';
    
    // Determine mode based on token prefix
    const isTestMode = this.accessToken.startsWith('TEST-');
    const isLiveMode = this.accessToken.startsWith('APP_USR-');
    
    if (isTestMode) {
      console.log('🧪 MercadoPago: MODO TESTE ATIVADO - PIX simulado (sem cobrança real)');
      console.log('💡 MercadoPago: Use dados de teste para simular pagamentos');
    } else if (isLiveMode) {
      console.log('🚨 MercadoPago: MODO PRODUÇÃO ATIVADO - Cobranças PIX reais serão processadas!');
      console.log('💰 MercadoPago: ATENÇÃO - Pagamentos reais serão cobrados!');
    } else {
      console.warn('⚠️ MercadoPago: Modo não identificado - verifique as chaves');
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  isProperlyConfigured(): boolean {
    const isTestMode = this.publicKey.startsWith('TEST-') && this.accessToken.startsWith('TEST-');
    const isLiveMode = this.publicKey.startsWith('APP_USR-') && this.accessToken.startsWith('APP_USR-');
    
    return (isTestMode || isLiveMode) &&
           this.publicKey.length > 20 &&
           this.accessToken.length > 20;
  }

  isLiveMode(): boolean {
    return this.accessToken.startsWith('APP_USR-');
  }

  isTestMode(): boolean {
    return this.accessToken.startsWith('TEST-');
  }

  async createPixPayment(
    amount: number,
    email: string,
    phoneNumber: string,
    description: string
  ): Promise<PaymentResponse & { qrCode?: string; qrCodeBase64?: string }> {
    try {
      if (!this.isProperlyConfigured()) {
        console.error('🚨 MercadoPago: Chaves não configuradas corretamente!');
        
        return {
          success: false,
          error: 'MERCADOPAGO_NOT_CONFIGURED',
          status: 'failed',
          message: 'Chaves MercadoPago não configuradas. Configure VITE_MERCADOPAGO_ACCESS_TOKEN e VITE_MERCADOPAGO_PUBLIC_KEY com chaves TEST- (teste) ou APP_USR- (produção)'
        };
      }

      const mode = this.isLiveMode() ? 'PRODUÇÃO' : 'TESTE';
      console.log(`💳 MercadoPago: Criando pagamento PIX em modo ${mode}`);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-payment`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          email,
          phoneNumber,
          description
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ MercadoPago API error:', responseData);
        
        let errorMessage = responseData.message || responseData.error || `Erro HTTP ${response.status}`;
        
        // Handle specific error cases
        if (responseData.error === 'MERCADOPAGO_TOKEN_INVALID') {
          errorMessage = 'Token MercadoPago inválido. Verifique as configurações no Supabase.';
        } else if (responseData.error === 'MERCADOPAGO_TOKEN_MISSING') {
          errorMessage = 'Token MercadoPago não configurado. Configure no Supabase Environment Variables.';
        } else if (responseData.error === 'MERCADOPAGO_TOKEN_INVALID_PREFIX') {
          errorMessage = 'Token MercadoPago com formato inválido. Use token TEST- ou APP_USR-.';
        } else if (responseData.error === 'MERCADOPAGO_TOKEN_TOO_SHORT') {
          errorMessage = 'Token MercadoPago incompleto. Verifique se copiou o token completo.';
        }
        
        return {
          success: false,
          error: responseData.error || 'PAYMENT_FAILED',
          status: 'failed',
          message: errorMessage
        };
      }

      console.log('✅ MercadoPago: PIX criado com sucesso', {
        paymentId: responseData.paymentId,
        status: responseData.status,
        hasQrCode: !!responseData.qrCode
      });

      return {
        ...responseData,
        productionMode: this.isLiveMode(),
        liveMode: this.isLiveMode(),
        testMode: this.isTestMode()
      };
    } catch (error) {
      console.error('❌ MercadoPago API error:', error);
      return {
        success: false,
        error: 'API_ERROR',
        status: 'failed',
        message: 'Erro de conexão com MercadoPago'
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      // Check if Supabase is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || 
          supabaseUrl === 'your_supabase_url' || 
          supabaseUrl === 'your-supabase-url' ||
          supabaseUrl === 'https://your-project-ref.supabase.co' ||
          !supabaseUrl.includes('.supabase.co')) {
        console.error('❌ VITE_SUPABASE_URL não configurado:', supabaseUrl);
        throw new Error('VITE_SUPABASE_URL não está configurado. Configure no .env com sua URL real do Supabase (ex: https://abc123.supabase.co)');
      }
      
      if (!supabaseKey || 
          supabaseKey === 'your_supabase_anon_key' || 
          supabaseKey === 'your-supabase-anon-key' ||
          !supabaseKey.startsWith('eyJ')) {
        console.error('❌ VITE_SUPABASE_ANON_KEY não configurado:', supabaseKey?.substring(0, 20) + '...');
        throw new Error('VITE_SUPABASE_ANON_KEY não está configurado. Configure no .env com sua chave anônima real do Supabase');
      }

      if (!this.isProperlyConfigured()) {
        console.error('🚨 MercadoPago Status: Chaves não configuradas!');
        
        return {
          success: false,
          error: 'MERCADOPAGO_NOT_CONFIGURED',
          status: 'failed',
          message: 'Chaves MercadoPago não configuradas'
        };
      }

      const mode = this.isLiveMode() ? 'PRODUÇÃO' : 'TESTE';
      console.log(`💳 MercadoPago: Verificando status PIX (${mode}):`, paymentId);

      const apiUrl = `${supabaseUrl}/functions/v1/mercadopago-status`;
      
      console.log('📤 Fazendo requisição para:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId })
      });

      console.log('📥 Resposta recebida:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          url: apiUrl
        });
        throw new Error(`Erro na Edge Function (${response.status}): ${response.statusText}. ${errorText}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        paymentId,
        status: responseData.status,
        productionMode: this.isLiveMode(),
        testMode: this.isTestMode()
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status PIX:', error);
      
      // Provide specific error messages for common issues
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'CONNECTION_ERROR',
          status: 'failed',
          message: 'Erro de conexão com Supabase. Verifique se VITE_SUPABASE_URL está configurado corretamente no arquivo .env e reinicie o servidor de desenvolvimento.'
        };
      }
      
      return {
        success: false,
        error: 'STATUS_CHECK_FAILED',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erro ao verificar status do pagamento'
      };
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResponse> {
    try {
      console.log('💰 Iniciando reembolso PIX:', {
        paymentId,
        amount,
        timestamp: new Date().toISOString()
      })
      
      if (!this.isProperlyConfigured()) {
        console.error('❌ MercadoPago não configurado para reembolso PIX')
        
        return {
          success: false,
          error: 'MERCADOPAGO_NOT_CONFIGURED',
          status: 'failed',
          message: 'MercadoPago não configurado'
        };
      }

      const mode = this.isLiveMode() ? 'PRODUÇÃO' : 'TESTE';
      console.log(`💰 MercadoPago: Processando reembolso PIX via Edge Function (${mode})`);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-refund`;
      
      console.log('📤 Enviando para Edge Function:', {
        url: apiUrl,
        paymentId,
        amount
      })
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, amount })
      });

      console.log('📥 Resposta da Edge Function:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })
      
      let responseData
      try {
        const responseText = await response.text()
        console.log('📄 Raw response text:', responseText.substring(0, 300))
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta JSON:', parseError)
        return {
          success: false,
          error: 'INVALID_RESPONSE',
          status: 'failed',
          message: 'Resposta inválida da Edge Function'
        }
      }
      
      console.log('📄 Dados do reembolso:', responseData)

      if (!response.ok) {
        console.error('❌ Erro no reembolso PIX:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData.error,
          message: responseData.message,
          details: responseData.details,
          httpStatus: responseData.httpStatus,
          paymentId,
          amount
        })
        
        let refundErrorMsg = responseData.message || responseData.error || `Erro HTTP ${response.status}`;
        
        // Handle specific MercadoPago error cases
        if (responseData.error === 'PAYMENT_NOT_REFUNDABLE') {
          refundErrorMsg = `Pagamento não pode ser reembolsado: ${responseData.message}`;
        } else if (responseData.error === 'PAYMENT_NOT_FOUND') {
          refundErrorMsg = `Pagamento não encontrado: ${paymentId}`;
        } else if (responseData.details && Array.isArray(responseData.details)) {
          const detailsMsg = responseData.details.map((d: any) => d.description || d.message).join(', ');
          if (detailsMsg) {
            refundErrorMsg += ` - ${detailsMsg}`;
          }
        }
        
        return {
          success: false,
          error: responseData.error || 'REFUND_FAILED',
          status: 'failed',
          message: refundErrorMsg
        };
      }

      console.log('✅ Reembolso PIX processado com sucesso:', {
        refundId: responseData.paymentId,
        amount: responseData.amount,
        status: responseData.status,
        message: 'Reembolso PIX processado automaticamente'
      })
      
      return {
        success: true,
        paymentId: responseData.paymentId,
        status: 'refunded',
        amount: responseData.amount,
        productionMode: this.isLiveMode(),
        testMode: this.isTestMode()
      };
    } catch (error) {
      console.error('❌ Erro crítico no reembolso PIX:', {
        error: error instanceof Error ? error.message : error,
        paymentId,
        amount
      })
      
      return {
        success: false,
        error: 'REFUND_FAILED',
        status: 'failed',
        message: error instanceof Error ? 
          `Erro crítico no reembolso PIX: ${error.message}` : 
          'Erro crítico desconhecido no reembolso PIX'
      };
    }
  }

  getCurrentConfiguration() {
    return {
      mode: this.isLiveMode() ? 'production' : 'test',
      isConfigured: this.isProperlyConfigured(),
      hasPublicKey: !!this.publicKey,
      hasAccessToken: !!this.accessToken,
      isLive: this.isLiveMode(),
      isTest: this.isTestMode(),
      productionMode: this.isLiveMode()
    };
  }
}

export const mercadopagoService = new MercadoPagoService();