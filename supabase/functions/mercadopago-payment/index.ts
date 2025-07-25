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
    const { amount, email, phoneNumber, description } = await req.json()

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    
    // Log token validation details
    console.log('🔑 MercadoPago Token Validation:', {
      hasToken: !!accessToken,
      tokenLength: accessToken?.length || 0,
      tokenPrefix: accessToken?.substring(0, 10) || 'none',
      timestamp: new Date().toISOString()
    })
    
    const isTestMode = accessToken?.startsWith('TEST-')
    const isLiveMode = accessToken?.startsWith('APP_USR-')
    
    if (!accessToken) {
      console.error('🚨 MercadoPago: MERCADOPAGO_ACCESS_TOKEN não configurado!')
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MERCADOPAGO_TOKEN_MISSING',
          message: 'MERCADOPAGO_ACCESS_TOKEN não configurado no Supabase Edge Functions Environment Variables',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    if (!isTestMode && !isLiveMode) {
      console.error('🚨 MercadoPago: Token inválido - deve começar com TEST- ou APP_USR-')
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MERCADOPAGO_TOKEN_INVALID_PREFIX',
          message: 'Token MercadoPago inválido. Use token TEST- (teste) ou APP_USR- (produção) do MercadoPago Developers Dashboard',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    if (accessToken.length < 50) {
      console.error('🚨 MercadoPago Edge Function: Token não configurado!')
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MERCADOPAGO_TOKEN_TOO_SHORT',
          message: 'Token MercadoPago muito curto. Verifique se copiou o token completo do MercadoPago Developers Dashboard',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const mode = isLiveMode ? 'PRODUÇÃO' : 'TESTE'
    console.log(`💳 MercadoPago Edge Function: Modo ${mode} ativado`)
    
    if (isTestMode) {
      console.log('🧪 MercadoPago: PIX de teste - sem cobrança real')
      console.log('💡 MercadoPago: Use dados de teste para simular pagamento')
      console.log('🔄 MercadoPago: Em modo teste, pagamentos são aprovados automaticamente após alguns segundos')
    } else {
      console.log('🚨 MercadoPago: PIX real - cobrança será processada!')
    }

    const paymentData = {
      transaction_amount: amount,
      description: description || 'Recarga Haiti',
      payment_method_id: 'pix',
      payer: {
        email: email
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      external_reference: `recharge_${Date.now()}_${phoneNumber}`,
      metadata: {
        phone_number: phoneNumber,
        service: 'recharge_haiti',
        timestamp: Date.now().toString()
      },
      // Para modo teste, definir expiração mais longa
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    }

    console.log('Sending payment request to MercadoPago:', {
      amount: paymentData.transaction_amount,
      email: paymentData.payer.email,
      reference: paymentData.external_reference
    })

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `recharge_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify(paymentData)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('MercadoPago API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        tokenPrefix: accessToken?.substring(0, 10),
        tokenLength: accessToken?.length,
        isTestMode,
        isLiveMode,
        requestData: {
          amount: paymentData.transaction_amount,
          email: paymentData.payer.email
        }
      })
      
      // Handle specific MercadoPago errors
      if (responseData.message === 'internal_error') {
        console.error('🚨 MercadoPago internal_error - Token provavelmente inválido ou expirado')
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'MERCADOPAGO_TOKEN_INVALID',
            message: 'Token MercadoPago inválido ou expirado. Verifique o token no MercadoPago Developers Dashboard e atualize no Supabase Environment Variables',
            status: 'failed'
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
          error: responseData.cause?.[0]?.code || 'PAYMENT_FAILED',
          message: responseData.message || 'Erro na API do MercadoPago',
          details: responseData.cause || [],
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('MercadoPago payment created successfully:', {
      id: responseData.id,
      status: responseData.status,
      hasQrCode: !!responseData.point_of_interaction?.transaction_data?.qr_code,
      hasQrCodeBase64: !!responseData.point_of_interaction?.transaction_data?.qr_code_base64,
      qrCodeLength: responseData.point_of_interaction?.transaction_data?.qr_code_base64?.length || 0,
      qrCodePreview: responseData.point_of_interaction?.transaction_data?.qr_code_base64?.substring(0, 100) || 'none'
    })

    const qrCodeBase64 = responseData.point_of_interaction?.transaction_data?.qr_code_base64
    const qrCode = responseData.point_of_interaction?.transaction_data?.qr_code
    
    // Validate QR code data
    if (!qrCodeBase64 && !qrCode) {
      console.warn('No QR code data received from MercadoPago')
    }
    
    if (qrCodeBase64 && !qrCodeBase64.startsWith('data:image/')) {
      console.warn('QR code base64 does not start with data:image/')
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: responseData.id?.toString(),
        status: responseData.status,
        qrCode: responseData.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: responseData.point_of_interaction?.transaction_data?.qr_code_base64,
        qrCodeUrl: responseData.point_of_interaction?.transaction_data?.ticket_url,
        productionMode: isLiveMode,
        testMode: isTestMode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('MercadoPago payment function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'FUNCTION_ERROR',
        message: error.message || 'Erro interno do servidor',
        status: 'failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})