import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@^14.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Stripe Checkout Session: Iniciando processamento...');
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_JSON',
          message: 'Corpo da requisição inválido'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { amount, currency, phoneNumber, operatorId, transactionId } = requestBody;

    console.log('🔄 Stripe Checkout Session: Dados recebidos:', {
      amount,
      currency,
      phoneNumber,
      operatorId,
      transactionId
    });

    // Validar parâmetros obrigatórios
    if (!amount || !currency || !phoneNumber || !operatorId || !transactionId) {
      console.error('❌ Parâmetros obrigatórios ausentes');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_PARAMETERS',
          message: 'Parâmetros obrigatórios ausentes'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!secretKey || !secretKey.startsWith('sk_live_')) {
      console.error('🚨 Stripe Checkout Session: STRIPE_SECRET_KEY de PRODUÇÃO não configurado!');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe não configurado: Configure STRIPE_SECRET_KEY com chave de produção (sk_live_...)'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let stripe;
    try {
      stripe = new Stripe(secretKey, {
        apiVersion: '2024-12-18',
        typescript: true,
      });
    } catch (stripeError) {
      console.error('❌ Erro ao inicializar Stripe:', stripeError);
      throw new Error('Erro ao inicializar Stripe SDK');
    }

    console.log('💳 Stripe Checkout Session: Criando sessão de checkout em modo PRODUÇÃO');

    // Get the base URL from request headers or use default
    const origin = req.headers.get('origin') || 
                   req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 
                   'https://localhost:5173';
    const successUrl = `${origin}/?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/?status=cancelled`;

    console.log('🔗 URLs configuradas:', { successUrl, cancelUrl, origin });

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Math.round(amount * 100), // Amount in cents
              product_data: {
                name: `Recarga Haiti - ${phoneNumber} (${operatorId})`,
                description: `Recarga de ${amount} ${currency} para ${phoneNumber} na operadora ${operatorId}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,
        billing_address_collection: 'auto',
        metadata: {
          transactionId: transactionId,
          phoneNumber: phoneNumber,
          operatorId: operatorId,
          amount: amount.toString(),
          currency: currency,
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
        payment_intent_data: {
          metadata: {
            transactionId: transactionId,
            phoneNumber: phoneNumber,
            operatorId: operatorId,
            amount: amount.toString(),
            currency: currency,
          },
        },
      });
    } catch (stripeSessionError) {
      console.error('❌ Erro ao criar sessão Stripe:', stripeSessionError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'STRIPE_SESSION_ERROR',
          message: `Erro ao criar sessão de checkout: ${stripeSessionError.message || 'Erro desconhecido'}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Stripe Checkout Session criada:', {
      sessionId: session.id,
      sessionUrl: session.url,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ Edge Function error creating Checkout Session:', error);
    
    // Log more details about the error
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'FUNCTION_ERROR',
        message: error.message || 'Erro interno do servidor ao criar sessão de checkout',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});