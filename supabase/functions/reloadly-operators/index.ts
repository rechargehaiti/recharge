// Get environment variables for Supabase Edge Functions  
const RELOADLY_CLIENT_ID = Deno.env.get('RELOADLY_CLIENT_ID');
const RELOADLY_CLIENT_SECRET = Deno.env.get('RELOADLY_CLIENT_SECRET');

// Check if properly configured for production
const isProperlyConfigured = RELOADLY_CLIENT_ID && 
  RELOADLY_CLIENT_SECRET && 
  RELOADLY_CLIENT_ID !== 'your-reloadly-client-id' && 
  RELOADLY_CLIENT_SECRET !== 'your-reloadly-client-secret' &&
  RELOADLY_CLIENT_ID.length > 10 &&
  RELOADLY_CLIENT_SECRET.length > 10;

async function fetchOperators() {
  if (!isProperlyConfigured) {
    console.error('🚨 Reloadly: Credenciais de PRODUÇÃO não configuradas!');
    throw new Error('Reloadly não configurado. Configure RELOADLY_CLIENT_ID e RELOADLY_CLIENT_SECRET com credenciais OAuth2 válidas.');
  }

  console.log('🔄 Reloadly: Buscando operadoras reais em modo PRODUÇÃO');

  try {
    // First get OAuth2 token
    const tokenResponse = await fetch('https://auth.reloadly.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: RELOADLY_CLIENT_ID,
        client_secret: RELOADLY_CLIENT_SECRET,
        grant_type: 'client_credentials',
        audience: 'https://topups-hs256.reloadly.com'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get OAuth token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Then fetch operators
    const response = await fetch('https://topups.reloadly.com/operators', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for Haiti and Dominican Republic operators
    const supportedOperators = data.filter((operator: any) => 
      (operator.country.isoName === 'HT' || operator.country.isoName === 'DO') &&
      operator.denominationType === 'FIXED'
    );

    return supportedOperators;
  } catch (error) {
    console.error('❌ Erro ao buscar operadoras:', error);
    throw error;
  }
}