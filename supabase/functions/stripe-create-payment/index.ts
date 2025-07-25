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
    const { amount, currency } = await req.json()
    
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isLive = secretKey.startsWith('sk_live_')
    console.log(`💳 Stripe: Criando PaymentIntent ${isLive ? 'REAL' : 'TESTE'}`)

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: currency,
        automatic_payment_methods: JSON.stringify({ enabled: true })
      })
    })

    const paymentIntent = await response.json()

    if (!response.ok) {
      console.error('Stripe API error:', paymentIntent)
      return new Response(
        JSON.stringify({ 
          error: paymentIntent.error?.message || 'Erro no Stripe',
          details: paymentIntent.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ PaymentIntent criado: ${paymentIntent.id}`)

    return new Response(
      JSON.stringify({
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})