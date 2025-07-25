import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { paymentIntentId, amount, mode } = await req.json()

    console.log('💰 Stripe Refund: Iniciando processo de reembolso', {
      paymentIntentId,
      amount,
      timestamp: new Date().toISOString()
    });

    if (!paymentIntentId) {
      console.error('❌ Stripe Refund: Payment Intent ID não fornecido');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_PAYMENT_INTENT_ID',
          status: 'failed',
          message: 'Payment Intent ID é obrigatório para processar reembolso'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Always use LIVE mode - production only
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!secretKey || !secretKey.startsWith('sk_live_')) {
      console.error('🚨 Stripe Refund: STRIPE_SECRET_KEY de PRODUÇÃO não configurado!');
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'STRIPE_NOT_CONFIGURED',
          status: 'failed',
          message: 'Stripe não configurado: Configure STRIPE_SECRET_KEY com chave de produção (sk_live_...)'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('💳 Stripe Refund: Processando reembolso em modo PRODUÇÃO', {
      paymentIntentId,
      amount,
      hasSecretKey: !!secretKey,
      secretKeyPrefix: secretKey.substring(0, 12) + '...'
    });

    // First, get the PaymentIntent to find the charge
    console.log('🔍 Stripe Refund: Buscando PaymentIntent para obter charge...');
    
    const piResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    })

    const piData = await piResponse.json()
    
    console.log('📥 Stripe Refund: PaymentIntent obtido:', {
      id: piData.id,
      status: piData.status,
      hasCharges: !!piData.charges?.data?.length,
      chargeCount: piData.charges?.data?.length || 0
    });

    if (!piResponse.ok) {
      console.error('❌ Stripe Refund: Erro ao buscar PaymentIntent:', {
        status: piResponse.status,
        error: piData.error,
        paymentIntentId
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PAYMENT_INTENT_NOT_FOUND',
          status: 'failed',
          message: `PaymentIntent não encontrado: ${piData.error?.message || 'ID inválido'}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the charge ID from the PaymentIntent
    const chargeId = piData.charges?.data?.[0]?.id

    if (!chargeId) {
      console.error('❌ Stripe Refund: Nenhuma cobrança encontrada para PaymentIntent:', {
        paymentIntentId,
        status: piData.status,
        charges: piData.charges
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'NO_CHARGE_FOUND',
          status: 'failed',
          message: 'Nenhuma cobrança encontrada para este pagamento'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Stripe Refund: Charge encontrada:', {
      chargeId,
      paymentIntentId
    });

    // Create the refund
    const refundData = new URLSearchParams();
    refundData.append('charge', chargeId);

    if (amount && amount > 0) {
      const amountInCents = Math.round(amount * 100);
      refundData.append('amount', amountInCents.toString());
      console.log('💰 Stripe Refund: Valor específico do reembolso:', {
        originalAmount: amount,
        amountInCents
      });
    } else {
      console.log('💰 Stripe Refund: Reembolso total (sem valor específico)');
    }

    console.log('📤 Stripe Refund: Enviando requisição de reembolso para Stripe API...');

    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: refundData
    })

    const responseData = await response.json()
    
    console.log('📥 Stripe Refund: Resposta da API Stripe:', {
      status: response.status,
      ok: response.ok,
      refundId: responseData.id,
      refundStatus: responseData.status,
      amount: responseData.amount
    });

    if (!response.ok) {
      console.error('❌ Stripe Refund: Erro na API Stripe:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        paymentIntentId,
        chargeId,
        amount,
        errorCode: responseData.error?.code,
        errorMessage: responseData.error?.message
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.error?.code || 'REFUND_FAILED',
          status: 'failed',
          message: `Erro no reembolso Stripe: ${responseData.error?.message || 'Erro desconhecido'}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Stripe Refund: Reembolso processado com SUCESSO!', {
      id: responseData.id,
      status: responseData.status,
      amount: responseData.amount,
      amountInDollars: (responseData.amount / 100).toFixed(2),
      chargeId,
      paymentIntentId,
      message: 'Reembolso Stripe processado automaticamente'
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: responseData.id,
        status: 'refunded',
        amount: responseData.amount / 100, // Convert back from cents
        productionMode: true,
        refundId: responseData.id,
        processedAt: new Date().toISOString(),
        message: 'Reembolso Stripe processado automaticamente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('❌ Stripe Refund: Erro crítico no processamento:', {
      error: error.message,
      stack: error.stack,
      paymentIntentId,
      amount
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'API_ERROR',
        status: 'failed',
        message: `Erro crítico no reembolso Stripe: ${error.message || 'Erro desconhecido'}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})