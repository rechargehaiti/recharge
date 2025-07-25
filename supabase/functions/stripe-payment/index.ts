import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "npm:stripe@^14.0.0"

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
    const { amount, currency } = await req.json()
    
    console.log('🔧 Stripe: Dados recebidos', { amount, currency })

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

    // Validar formato da chave secreta
    const isValidKey = secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_')
    const hasValidLength = secretKey.length >= 100 // Chaves Stripe têm pelo menos 100 caracteres
    
    console.log('🔑 Validação da chave:', {
      hasSecretKey: !!secretKey,
      keyLength: secretKey.length,
      startsCorrectly: isValidKey,
      hasValidLength,
      keyPrefix: secretKey.substring(0, 15) + '...',
      keySuffix: '...' + secretKey.substring(secretKey.length - 4)
    })
    
    if (!isValidKey || !hasValidLength) {
      console.error('🚨 STRIPE_SECRET_KEY inválida!', {
        startsCorrectly: isValidKey,
        hasValidLength,
        keyLength: secretKey.length,
        keyPrefix: secretKey.substring(0, 15) + '...',
        keySuffix: '...' + secretKey.substring(secretKey.length - 4)
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_STRIPE_KEY_FORMAT',
          message: `Chave Stripe inválida no Supabase. Comprimento: ${secretKey.length} (mínimo: 100). Prefixo: ${secretKey.substring(0, 15)}... Acesse Supabase → Edge Functions → Environment Variables e configure uma chave válida do seu Stripe Dashboard.`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    // Log detalhado da configuração
    console.log('🔑 Stripe Configuration:', {
      hasSecretKey: !!secretKey,
      keyPrefix: secretKey.substring(0, 8) + '...',
      keyLength: secretKey.length,
      isLive: secretKey.startsWith('sk_live_'),
      isTest: secretKey.startsWith('sk_test_')
    })

    // Validar parâmetros básicos
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_AMOUNT',
          message: 'Valor inválido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!currency) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_CURRENCY',
          message: 'Moeda inválida'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inicializar Stripe com a biblioteca oficial
    console.log('🔄 Inicializando Stripe SDK...')
    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
    })

    // Converter para centavos
    const amountInCents = Math.round(amount * 100)
    const currencyLower = currency.toLowerCase()

    console.log('💰 Preparando PaymentIntent:', {
      originalAmount: amount,
      amount: amountInCents,
      currency: currencyLower,
      currencyValid: /^[a-z]{3}$/.test(currencyLower),
      amountValid: amountInCents >= 50 && amountInCents <= 99999999
    })

    // Validar moeda (deve ser código de 3 letras)
    if (!/^[a-z]{3}$/.test(currencyLower)) {
      console.error('❌ Moeda inválida:', currencyLower)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_CURRENCY_FORMAT',
          message: `Moeda deve ter 3 letras: ${currencyLower}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar valor mínimo (50 centavos = $0.50)
    if (amountInCents < 50) {
      console.error('❌ Valor muito baixo:', amountInCents)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AMOUNT_TOO_LOW',
          message: `Valor mínimo: $0.50 (recebido: ${amount})`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Preparar parâmetros exatos para Stripe
    const paymentIntentParams = {
      amount: amountInCents,
      currency: currencyLower,
      automatic_payment_methods: {
        enabled: true,
      },
    }

    console.log('📤 Parâmetros finais para Stripe API:', JSON.stringify(paymentIntentParams, null, 2))

    // Criar PaymentIntent usando a biblioteca oficial
    console.log('🚀 Chamando stripe.paymentIntents.create...')
    const paymentIntent = await stripe.paymentIntents.create({
      ...paymentIntentParams
    })

    console.log('✅ PaymentIntent criado:', paymentIntent.id)

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Edge Function error:', error)
    
    // Se for erro do Stripe relacionado à chave inválida
    if (error.type === 'invalid_request_error' && error.message?.includes('Invalid API Key')) {
      console.error('🚨 Chave Stripe inválida detectada pelo Stripe API:', {
        errorType: error.type,
        errorCode: error.code,
        errorMessage: error.message
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_STRIPE_KEY_API',
          message: 'A chave STRIPE_SECRET_KEY configurada no Supabase é inválida. Acesse seu Stripe Dashboard → Developers → API Keys, copie uma chave secreta válida (sk_live_... ou sk_test_...) e configure no Supabase → Edge Functions → Environment Variables.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Outros erros do Stripe
    if (error.type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.code || error.type,
          message: error.message || 'Erro no Stripe'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
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