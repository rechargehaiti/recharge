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

    const clientId = Deno.env.get('DINGCONNECT_CLIENT_ID')
    const clientSecret = Deno.env.get('DINGCONNECT_CLIENT_SECRET')
    
    const isProperlyConfigured = clientId && 
      clientSecret && 
      clientId !== 'your-dingconnect-client-id' && 
      clientSecret !== 'your-dingconnect-client-secret' &&
      clientId.length >= 20 &&
      clientSecret.length >= 40;

    if (!isProperlyConfigured) {
      console.error('🚨 Reloadly: Configuração inválida', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdLength: clientId?.length || 0,
        clientSecretLength: clientSecret?.length || 0,
        errorType: 'CONFIGURATION_ERROR'
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RELOADLY_NOT_CONFIGURED',
          message: 'Reloadly não configurado: Configure RELOADLY_CLIENT_ID e RELOADLY_CLIENT_SECRET com credenciais OAuth2 válidas'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!phoneNumber || !operatorId || !amount) {
      console.error('❌ Reloadly: Parâmetros faltando', {
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

    // Step 1: Get OAuth2 access token
    console.log('🔐 Reloadly: Obtendo access token OAuth2...')
    
    const tokenResponse = await fetch('https://auth.reloadly.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        audience: 'https://topups-hs256.reloadly.com'
      })
    })

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text()
      console.error('❌ Reloadly: Erro ao obter token OAuth2', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenError
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OAUTH_TOKEN_FAILED',
          message: `Erro ao obter token OAuth2: ${tokenResponse.status} ${tokenResponse.statusText}`,
          details: tokenError
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('❌ Reloadly: Access token não recebido', tokenData)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'NO_ACCESS_TOKEN',
          message: 'Access token não foi retornado pela API OAuth2',
          details: tokenData
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Reloadly: Access token obtido com sucesso', {
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    })
    console.log('🔄 Reloadly: Iniciando recarga', {
      phoneNumber,
      operatorId,
      amount,
      currency,
      timestamp: new Date().toISOString()
    })
    
    // Step 2: Mapear IDs internos para ProviderCodes do Reloadly
    const providerCodeMap: { [key: string]: string } = {
      'D7HT': '173', // Digicel Haiti
      'NMHT': '174', // Natcom Haiti
      'D8DO': '611', // Claro Dominican Republic
      'ORDO': '612', // Orange Dominican Republic
      'VVDO': '613'  // Viva Dominican Republic
    };
    
    const reloadlyOperatorId = providerCodeMap[operatorId] || operatorId;
    
    // Step 3: Preparar dados da recarga para Reloadly
    const topupData = {
      operatorId: parseInt(reloadlyOperatorId),
      amount: amount,
      useLocalAmount: false,
      customIdentifier: `recharge-${Date.now()}`,
      recipientPhone: {
        countryCode: operatorId.includes('HT') ? 'HT' : 'DO',
        number: phoneNumber
      }
    }

    console.log('📤 Reloadly: Enviando dados para API', {
      operatorId: topupData.operatorId,
      amount: topupData.amount,
      customIdentifier: topupData.customIdentifier,
      recipientPhone: topupData.recipientPhone
    })

    // Step 4: Fazer requisição para Reloadly API
    const response = await fetch('https://topups.reloadly.com/topups', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(topupData)
    })

    console.log('📥 Reloadly: Resposta recebida', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    const responseText = await response.text()
    console.log('📄 Reloadly: Response text', responseText.substring(0, 500))

    if (!response.ok) {
      console.error('❌ Reloadly: API retornou erro HTTP', {
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
                         'Erro desconhecido na API Reloadly';
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorData.error || 'RECHARGE_FAILED',
          message: `Falha na recarga Reloadly: ${apiErrorMsg}`,
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
      console.log('✅ Reloadly: JSON parseado com sucesso')
    } catch (parseError) {
      console.error('❌ Reloadly: Erro ao parsear JSON', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 200)
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PARSE_ERROR',
          message: `Erro ao processar resposta JSON da API Reloadly: ${parseError.message}`,
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
    console.log('✅ Reloadly: Recarga processada com sucesso', {
      transactionId: responseData.transactionId,
      status: responseData.status,
      customIdentifier: responseData.customIdentifier
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        transactionId: responseData.transactionId?.toString(),
        message: `Recarga processada com sucesso - ID: ${responseData.transactionId}`,
        productionMode: true,
        status: responseData.status,
        customIdentifier: responseData.customIdentifier,
        operatorTransactionId: responseData.operatorTransactionId,
        reloadlyData: responseData,
        isDeferred: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('❌ Reloadly: Erro crítico', {
      error: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
      timestamp: new Date().toISOString()
    })
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'API_ERROR',
        message: `Erro crítico na API Reloadly: ${error.message || 'Erro desconhecido'}`,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})