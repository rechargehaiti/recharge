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
    const { phoneNumber, operatorId, amount, currency = 'BRL' } = await req.json()

    const apiKey = Deno.env.get('DINGCONNECT_API_KEY')
    const apiSecret = Deno.env.get('DINGCONNECT_API_SECRET')
    
    const isProperlyConfigured = apiKey && 
      apiSecret && 
      apiKey !== 'your-dingconnect-api-key' && 
      apiSecret !== 'your-dingconnect-api-secret' &&
      apiKey.length >= 20 &&
      apiSecret.length >= 40;

    if (!isProperlyConfigured) {
      console.error('🚨 DingConnect: Configuração inválida', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        apiKeyLength: apiKey?.length || 0,
        apiSecretLength: apiSecret?.length || 0,
        errorType: 'CONFIGURATION_ERROR'
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'DINGCONNECT_NOT_CONFIGURED',
          message: 'DingConnect não configurado: Configure DINGCONNECT_API_KEY e DINGCONNECT_API_SECRET com credenciais válidas'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!phoneNumber || !operatorId || !amount) {
      console.error('❌ DingConnect: Parâmetros faltando', {
        phoneNumber: !!phoneNumber,
        operatorId: !!operatorId,
        amount: !!amount,
        errorType: 'MISSING_PARAMETERS'
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_PARAMETERS',
          message: 'Parâmetros obrigatórios ausentes: phoneNumber, operatorId ou amount'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔄 DingConnect: Iniciando recarga', {
      phoneNumber,
      operatorId,
      amount,
      currency,
      timestamp: new Date().toISOString()
    })
    
    // Mapear IDs internos para ProviderCodes do DingConnect
    const providerCodeMap: { [key: string]: string } = {
      'D7HT': '173', // Digicel Haiti
      'NMHT': '174', // Natcom Haiti
      'D8DO': '611', // Claro Dominican Republic
      'ORDO': '612', // Orange Dominican Republic
      'VVDO': '613'  // Viva Dominican Republic
    };
    
    const dingconnectOperatorId = providerCodeMap[operatorId] || operatorId;
    
    // Preparar dados da recarga para DingConnect
    const rechargeData = {
      OperatorId: parseInt(dingconnectOperatorId),
      Amount: amount,
      Currency: currency,
      PhoneNumber: phoneNumber,
      Reference: `recharge-${Date.now()}`,
      CountryCode: operatorId.includes('HT') ? 'HT' : 'DO'
    }

    console.log('📤 DingConnect: Enviando dados para API', {
      operatorId: rechargeData.OperatorId,
      amount: rechargeData.Amount,
      currency: rechargeData.Currency,
      phoneNumber: rechargeData.PhoneNumber,
      reference: rechargeData.Reference,
      countryCode: rechargeData.CountryCode
    })

    // Fazer requisição para DingConnect API
    const response = await fetch('https://api.dingconnect.com/api/V1/SendTransfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Secret': apiSecret,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(rechargeData)
    })

    console.log('📥 DingConnect: Resposta recebida', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    const responseText = await response.text()
    console.log('📄 DingConnect: Response text', responseText.substring(0, 500))

    if (!response.ok) {
      console.error('❌ DingConnect: API retornou erro HTTP', {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText.substring(0, 500)
      })
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (parseError) {
        errorData = { message: responseText.substring(0, 200) }
      }
      
      const apiErrorMsg = errorData.message || 
                         errorData.error_description ||
                         `Erro ${response.status}` ||
                         'Erro desconhecido na API DingConnect';
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorData.error || 'RECHARGE_FAILED',
          message: `Falha na recarga DingConnect: ${apiErrorMsg}`,
          details: errorData
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let responseData
    try {
      responseData = JSON.parse(responseText)
      console.log('✅ DingConnect: JSON parseado com sucesso')
    } catch (parseError) {
      console.error('❌ DingConnect: Erro ao parsear JSON', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 200)
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PARSE_ERROR',
          message: `Erro ao processar resposta JSON da API DingConnect: ${parseError.message}`,
          details: { 
            parseError: parseError.message,
            responsePreview: responseText.substring(0, 200)
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle successful response
    console.log('✅ DingConnect: Recarga processada com sucesso', {
      transactionId: responseData.TransactionId,
      status: responseData.Status,
      reference: responseData.Reference
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        transactionId: responseData.TransactionId?.toString(),
        message: `Recarga processada com sucesso - ID: ${responseData.TransactionId}`,
        productionMode: true,
        status: responseData.Status,
        reference: responseData.Reference,
        operatorTransactionId: responseData.OperatorTransactionId,
        dingconnectData: responseData,
        isDeferred: responseData.IsDeferred || false,
        correlationId: responseData.CorrelationId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('❌ DingConnect: Erro crítico', {
      error: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
      timestamp: new Date().toISOString()
    })
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'API_ERROR',
        message: `Erro crítico na API DingConnect: ${error.message || 'Erro desconhecido'}`,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})