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
    const { paymentId } = await req.json()

    if (!paymentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_PAYMENT_ID',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    
    const isTestMode = accessToken?.startsWith('TEST-')
    const isLiveMode = accessToken?.startsWith('APP_USR-')
    
    if (!accessToken || (!isTestMode && !isLiveMode) || accessToken.length < 20) {
      console.error('🚨 MercadoPago Status: Token não configurado!')
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MERCADOPAGO_NOT_CONFIGURED',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const mode = isLiveMode ? 'PRODUÇÃO' : 'TESTE'
    console.log(`💳 MercadoPago Status: Verificando status do pagamento (${mode}):`, paymentId)

    // Em modo teste, simular aprovação após alguns segundos
    if (isTestMode) {
      console.log('🧪 MercadoPago Status: Modo teste - verificando se deve simular aprovação...')
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('MercadoPago status API error:', {
        status: response.status,
        data: responseData,
        paymentId
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.cause?.[0]?.code || 'STATUS_CHECK_FAILED',
          status: 'failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`MercadoPago status retrieved (${mode}):`, {
      id: responseData.id,
      status: responseData.status,
      statusDetail: responseData.status_detail,
      dateCreated: responseData.date_created,
      testMode: isTestMode
    })

    // Em modo teste, forçar aprovação após 30 segundos
    if (isTestMode && responseData.status === 'pending') {
      const createdTime = new Date(responseData.date_created).getTime()
      const currentTime = Date.now()
      const elapsedSeconds = (currentTime - createdTime) / 1000
      
      console.log(`🧪 MercadoPago Status: Pagamento teste pendente há ${elapsedSeconds.toFixed(0)} segundos`)
      
      if (elapsedSeconds > 30) {
        console.log('🧪 MercadoPago Status: Simulando aprovação automática em modo teste')
        responseData.status = 'approved'
        responseData.status_detail = 'accredited'
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: responseData.status,
        paymentId: responseData.id?.toString(),
        statusDetail: responseData.status_detail,
        productionMode: isLiveMode,
        testMode: isTestMode
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