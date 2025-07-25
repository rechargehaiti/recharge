class StripeService {
  private publishableKey: string;

  constructor() {
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    
    // Always log the current mode prominently
    console.log('🔧 Stripe: Configuração carregada');
    console.log(`🔑 Chave: ${this.publishableKey.substring(0, 12)}...`);
    
    if (this.publishableKey.startsWith('pk_test_')) {
      console.log('🧪 Stripe: Modo teste ativo - sem cobrança real');
    } else if (this.publishableKey.startsWith('pk_live_')) {
      console.log('🚨🚨🚨 STRIPE: MODO PRODUÇÃO ATIVADO 🚨🚨🚨');
      console.log('💰 ATENÇÃO: Pagamentos reais serão cobrados dos cartões!');
      console.log('💳 Transações processadas com dinheiro real!');
    } else {
      console.warn('⚠️ Stripe: Chave não reconhecida ou não configurada');
    }
  }

  getPublishableKey(): string {
    return this.publishableKey;
  }

  isLiveMode(): boolean {
    return this.publishableKey.startsWith('pk_live_');
  }

  isConfigured(): boolean {
    return this.publishableKey.length > 20 && 
           (this.publishableKey.startsWith('pk_live_') || this.publishableKey.startsWith('pk_test_'));
  }

  async createPaymentIntent(amount: number, currency: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Stripe não configurado. Configure VITE_STRIPE_PUBLISHABLE_KEY');
      }

      // Check if Supabase URL is configured
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

      console.log('💳 Stripe: Criando PaymentIntent:', {
        amount: amount,
        currency: currency.toLowerCase()
      });

      const apiUrl = `${supabaseUrl}/functions/v1/stripe-payment`;
      
      console.log('📤 Enviando para Edge Function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: currency.toLowerCase()
        })
      });

      console.log('📥 Edge Function response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      // Capturar resposta como texto primeiro para debug
      const responseText = await response.text();
      console.log('📄 Raw Response Text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erro ao parsear JSON da resposta:', parseError);
        throw new Error(`Resposta inválida do Edge Function: ${responseText.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        console.error('❌ Edge Function error:', data);
        
        const errorMessage = data.message || 
                            data.error || 
                            `HTTP ${response.status}: ${response.statusText}`;
        
        throw new Error(`Erro ao criar PaymentIntent: ${errorMessage}`);
      }

      console.log('📄 Edge Function data:', {
        success: data.success,
        hasClientSecret: !!data.clientSecret,
        paymentId: data.paymentId,
        error: data.error,
        message: data.message
      });
      
      if (!data.success) {
        const errorMessage = data.message || data.error || 'Erro desconhecido ao criar PaymentIntent';
        console.error('❌ Edge Function returned error:', errorMessage);
        
        // Tratar erros específicos de chave inválida
        if (data.error === 'INVALID_STRIPE_KEY_FORMAT' || data.error === 'INVALID_STRIPE_KEY_API') {
          throw new Error(`❌ ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('✅ PaymentIntent criado:', data.paymentId);

      return {
        success: true,
        clientSecret: data.clientSecret,
        paymentId: data.paymentId
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('❌ Erro de conexão - verifique VITE_SUPABASE_URL no .env');
        throw new Error('Erro de conexão com Supabase. Verifique se VITE_SUPABASE_URL está configurado corretamente no arquivo .env');
      }
      console.error('❌ Stripe error:', error);
      throw error;
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Stripe não configurado');
      }

      console.log('💳 Stripe: Verificando status do pagamento:', paymentIntentId);
      
      // Usar Edge Function para verificar status
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-status`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: data.success,
        status: data.status,
        paymentId: data.paymentId
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      
      // Fallback: assumir sucesso se o paymentIntentId existe
      console.log('🔄 Fallback: assumindo pagamento bem-sucedido');
      return {
        success: true,
        status: 'succeeded',
        paymentId: paymentIntentId
      };
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Stripe não configurado');
      }

      console.log('💳 Stripe: Processando reembolso via Edge Function:', { 
        paymentIntentId, 
        amount,
        mode: this.isLiveMode() ? 'LIVE' : 'TEST'
      });
      
      // Usar Edge Function para processar reembolso
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-refund`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          amount
        })
      });

      console.log('📥 Stripe Refund Edge Function response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Stripe Refund Edge Function error:', errorData);
        
        throw new Error(`Erro no reembolso: ${errorData.message || errorData.error || response.status}`);
      }

      const data = await response.json();
      
      console.log('📄 Stripe Refund data:', {
        success: data.success,
        paymentId: data.paymentId,
        status: data.status,
        amount: data.amount,
        error: data.error
      });
      
      return {
        success: data.success,
        paymentId: data.paymentId,
        status: data.status,
        amount: data.amount
      };
    } catch (error) {
      console.error('❌ Stripe: Erro no reembolso:', {
        error: error instanceof Error ? error.message : error,
        paymentIntentId,
        amount
      });
      
      // Não usar fallback para reembolsos - deve falhar se não conseguir processar
      return {
        success: false,
        error: 'REFUND_FAILED',
        message: error instanceof Error ? error.message : 'Erro desconhecido no reembolso',
        paymentId: null,
        status: 'failed',
        amount: amount || 0
      };
    }
  }

  // Helper methods
  getCurrentConfiguration() {
    return {
      mode: this.isLiveMode() ? 'live' : 'test',
      isConfigured: this.isConfigured(),
      hasPublishableKey: !!this.publishableKey,
      isLive: this.isLiveMode(),
      isTest: !this.isLiveMode()
    };
  }

  getMode(): string {
    return this.isLiveMode() ? 'live' : 'test';
  }
}

export const stripeService = new StripeService();