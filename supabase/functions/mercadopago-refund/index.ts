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
    console.log('💰 MercadoPago Refund: Iniciando processo de reembolso PIX', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    })
    
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON da requisição:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_JSON',
          status: 'failed',
          message: 'Corpo da requisição inválido'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const { paymentId, amount } = requestBody
    
    console.log('💰 Dados do reembolso:', {
      paymentId,
      amount,
      paymentIdType: typeof paymentId,
      amountType: typeof amount,
      timestamp: new Date().toISOString()
    })

    if (!paymentId) {
      console.error('❌ Payment ID não fornecido')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_PAYMENT_ID',
          status: 'failed',
          message: 'Payment ID é obrigatório para processar reembolso'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate paymentId format
    const paymentIdStr = paymentId.toString()
    if (!/^\d+$/.test(paymentIdStr)) {
      console.error('❌ Payment ID inválido:', paymentIdStr)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_PAYMENT_ID',
          status: 'failed',
          message: `Payment ID deve ser numérico: ${paymentIdStr}`
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
      console.error('🚨 MercadoPago Refund: Token não configurado!')
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MERCADOPAGO_NOT_CONFIGURED',
          status: 'failed',
          message: 'MercadoPago não configurado: Configure MERCADOPAGO_ACCESS_TOKEN com token TEST- (teste) ou APP_USR- (produção)'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const mode = isLiveMode ? 'PRODUÇÃO' : 'TESTE'
    console.log(`💰 MercadoPago: Processando reembolso PIX em modo ${mode}`)
    console.log('💰 Detalhes:', {
      paymentId: paymentIdStr,
      amount,
      hasToken: !!accessToken,
      tokenPrefix: accessToken.substring(0, 12) + '...'
    })

    // Verificar status do pagamento antes de tentar reembolso
    console.log('🔍 Verificando status do pagamento antes do reembolso...')
    
    const statusResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentIdStr}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('🔍 Status response:', {
      status: statusResponse.status,
      ok: statusResponse.ok,
      statusText: statusResponse.statusText
    })

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text()
      console.error('❌ Erro ao verificar status do pagamento:', {
        status: statusResponse.status,
        statusText: statusResponse.statusText,
        errorText: errorText,
        paymentId: paymentIdStr
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PAYMENT_NOT_FOUND',
          status: 'failed',
          message: `Pagamento não encontrado para reembolso: ${paymentIdStr}. Status: ${statusResponse.status}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paymentData = await statusResponse.json()
    console.log('💰 Status atual do pagamento:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      transaction_amount: paymentData.transaction_amount,
      date_created: paymentData.date_created,
      date_approved: paymentData.date_approved,
      isTestMode: isTestMode
    })

    // Verificar estados finais não reembolsáveis
    const nonRefundableStates = ['cancelled', 'rejected', 'charged_back']
    
    if (nonRefundableStates.includes(paymentData.status)) {
      console.log('❌ Pagamento em estado não reembolsável:', {
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        reason: 'Estado final não permite reembolso'
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PAYMENT_NOT_REFUNDABLE',
          status: 'failed',
          message: `Pagamento não pode ser reembolsado. Status: ${paymentData.status} (${paymentData.status_detail || 'estado final'})`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Verificar se pagamento já foi reembolsado
    if (paymentData.status === 'refunded') {
      console.log('✅ Pagamento já foi reembolsado anteriormente')
      return new Response(
        JSON.stringify({
          success: true,
          paymentId: paymentData.id?.toString(),
          status: 'refunded',
          amount: paymentData.transaction_amount,
          productionMode: isLiveMode,
          testMode: isTestMode,
          refundId: paymentData.id,
          processedAt: new Date().toISOString(),
          message: 'Pagamento já estava reembolsado'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verificar se pagamento pode ser reembolsado (incluir pending para modo teste)
    const refundableStatuses = isTestMode ? ['approved', 'pending'] : ['approved']
    
    console.log(`💰 MercadoPago Refund: Verificando se pagamento pode ser reembolsado (modo ${mode})`)
    
    if (!refundableStatuses.includes(paymentData.status)) {
      console.error('❌ Pagamento não pode ser reembolsado:', {
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        allowedStatuses: refundableStatuses,
        reason: isTestMode ? 'Apenas pagamentos aprovados ou pendentes (teste) podem ser reembolsados' : 'Apenas pagamentos aprovados podem ser reembolsados'
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PAYMENT_NOT_REFUNDABLE',
          status: 'failed',
          message: `Pagamento não pode ser reembolsado. Status atual: ${paymentData.status}. ${isTestMode ? "Em modo teste, apenas 'approved' ou 'pending'" : "Apenas 'approved'"} podem ser reembolsados.`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Preparar dados do reembolso
    const refundData: any = {}
    if (amount && amount > 0) {
      refundData.amount = Math.round(amount * 100) / 100 // Ensure 2 decimal places
      console.log('💰 Valor do reembolso:', refundData.amount)
    } else {
      console.log('💰 Reembolso total (sem valor específico)')
    }

    console.log('📤 Enviando requisição de reembolso para MercadoPago...')
    
    // Generate unique idempotency key with random component
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const idempotencyKey = `refund_${paymentIdStr}_${Date.now()}_${randomSuffix}`
    
    console.log('📤 Request details:', {
      url: `https://api.mercadopago.com/v1/payments/${paymentIdStr}/refunds`,
      method: 'POST',
      idempotencyKey: idempotencyKey,
      body: refundData,
      headers: {
        'Authorization': `Bearer ${accessToken.substring(0, 12)}...`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      }
    })
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentIdStr}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(refundData)
    })

    console.log('📥 Resposta MercadoPago:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    let responseData
    const responseText = await response.text()
    
    console.log('📄 Raw response text:', responseText.substring(0, 500))
    
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta JSON:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_RESPONSE',
          status: 'failed',
          message: `Resposta inválida do MercadoPago: ${responseText.substring(0, 200)}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log('📄 Dados da resposta:', JSON.stringify(responseData, null, 2))

    if (!response.ok) {
      console.error('❌ Erro no reembolso MercadoPago:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        paymentId: paymentIdStr,
        amount,
        errorCode: responseData.cause?.[0]?.code,
        errorMessage: responseData.message,
        fullResponse: responseText,
        timestamp: new Date().toISOString()
      })
      
      // Construir mensagem de erro mais informativa
      const refundErrorMsg = responseData.message || 
                            responseData.cause?.[0]?.description ||
                            responseData.error ||
                            `Erro ${response.status}` ||
                            'Erro desconhecido no reembolso';
      
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.cause?.[0]?.code || 'REFUND_FAILED',
          status: 'failed',
          message: `Erro no reembolso PIX: ${refundErrorMsg}`,
          details: responseData.cause || responseData,
          httpStatus: response.status,
          httpStatusText: response.statusText
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Reembolso PIX processado com sucesso:', {
      id: responseData.id,
      status: responseData.status,
      amount: responseData.amount,
      refundId: responseData.id,
      message: 'Reembolso PIX processado automaticamente',
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: responseData.id?.toString(),
        status: 'refunded',
        amount: responseData.amount,
        productionMode: isLiveMode,
        testMode: isTestMode,
        refundId: responseData.id,
        processedAt: new Date().toISOString(),
        message: 'Reembolso PIX processado automaticamente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('❌ Erro crítico no processamento do reembolso:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'API_ERROR',
        status: 'failed',
        message: `Erro crítico no reembolso PIX: ${error.message || 'Erro desconhecido'}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})