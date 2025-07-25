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
    const { countryCode = 'HT' } = await req.json()

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

    console.log('🔄 DingConnect: Buscando operadoras reais em modo PRODUÇÃO');

    // Get operators from DingConnect API
    const response = await fetch('https://api.dingconnect.com/api/V1/GetOperators', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Secret': apiSecret,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ DingConnect: Erro ao buscar operadoras', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API_ERROR',
          message: `Erro ao buscar operadoras: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    
    // Filter for Haiti and Dominican Republic operators
    const supportedOperators = data.filter((operator: any) => 
      (operator.CountryCode === 'HT' || operator.CountryCode === 'DO') &&
      operator.IsActive === true
    );

    console.log('✅ DingConnect: Operadoras obtidas com sucesso', {
      totalOperators: data.length,
      supportedOperators: supportedOperators.length,
      countryCode
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: supportedOperators
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