import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'METHOD_NOT_ALLOWED',
          message: 'Only POST method is allowed'
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body with error handling
    let requestData
    try {
      requestData = await req.json()
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_JSON',
          message: 'Invalid JSON in request body'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { amount, currency } = requestData
    
    console.log('🔧 Stripe Edge Function: Recebido', { amount, currency })

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!secretKey) {
      console.error('🚨 STRIPE_SECRET_KEY não configurado!')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'STRIPE_NOT_CONFIGURED',
          message: 'Configure STRIPE_SECRET_KEY no Supabase'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine mode based on secret key
    const isLiveMode = secretKey.startsWith('sk_live_')
    const isTestMode = secretKey.startsWith('sk_test_')
    
    if (!isLiveMode && !isTestMode) {
      console.error('🚨 Chave Stripe inválida - deve começar com sk_live_ ou sk_test_')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_STRIPE_KEY',
          message: 'Chave Stripe inválida'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (isLiveMode) {
      console.log('🚨 Stripe: MODO PRODUÇÃO - Cobrança real será processada!')
    } else {
      console.log('🧪 Stripe: Modo teste ativo')
    }

    // Create PaymentIntent with minimal parameters
    const stripeData = new URLSearchParams({
      amount: amount.toString(),
      currency: currency
    })

    console.log('📤 Enviando para Stripe API:', {
      amount: amount.toString(),
      currency: currency,
      mode: isLiveMode ? 'LIVE' : 'TEST'
    })

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeData
    })

    const responseData = await response.json()
    
    console.log('📥 Stripe API response:', {
      status: response.status,
      mode: isLiveMode ? 'LIVE' : 'TEST',
      success: response.ok
    })

    if (!response.ok) {
      console.error('❌ Stripe API error:', {
        error: responseData.error,
        mode: isLiveMode ? 'LIVE' : 'TEST'
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.error?.code || 'STRIPE_ERROR',
          message: responseData.error?.message || 'Erro no Stripe',
          mode: isLiveMode ? 'live' : 'test'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (isLiveMode) {
      console.log('✅ PaymentIntent REAL criado:', responseData.id)
    } else {
      console.log('✅ PaymentIntent teste criado:', responseData.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: responseData.id,
        clientSecret: responseData.client_secret,
        status: responseData.status,
        liveMode: isLiveMode,
        mode: isLiveMode ? 'live' : 'test'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Edge Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'FUNCTION_ERROR',
        message: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})