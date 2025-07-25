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
    const { paymentIntentId, mode } = await req.json()

    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_PAYMENT_INTENT_ID',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Always use LIVE mode - production only
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!secretKey) {
      console.error('🚨 Stripe Status: STRIPE_SECRET_KEY não configurado!')
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'STRIPE_NOT_CONFIGURED',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('💳 Stripe Status: Verificando status em modo PRODUÇÃO:', paymentIntentId)

    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Stripe status API error:', {
        status: response.status,
        data: responseData,
        paymentIntentId
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.error?.code || 'STATUS_CHECK_FAILED',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Stripe status retrieved:', {
      id: responseData.id,
      status: responseData.status
    })

    return new Response(
      JSON.stringify({
        success: true,
        status: responseData.status,
        paymentId: responseData.id,
        productionMode: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error checking payment status:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'API_ERROR',
        status: 'failed',
        message: error.message || 'Erro ao verificar status do pagamento'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})