import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

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
    const webhookData = await req.json()
    
    console.log('MercadoPago Webhook received:', {
      type: webhookData.type,
      action: webhookData.action,
      dataId: webhookData.data?.id
    })

    // Only process payment notifications
    if (webhookData.type !== 'payment') {
      return new Response('ok', { headers: corsHeaders })
    }

    const paymentId = webhookData.data?.id
    if (!paymentId) {
      console.log('No payment ID in webhook')
      return new Response('ok', { headers: corsHeaders })
    }

    // Get payment details from MercadoPago
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) {
      console.log('No MercadoPago access token configured')
      return new Response('ok', { headers: corsHeaders })
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment details from MercadoPago')
      return new Response('ok', { headers: corsHeaders })
    }

    const paymentData = await paymentResponse.json()
    
    console.log('Payment data from MercadoPago:', {
      id: paymentData.id,
      status: paymentData.status,
      externalReference: paymentData.external_reference
    })

    // Update transaction in Supabase if payment is approved
    if (paymentData.status === 'approved') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Find transaction by payment ID
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_id', paymentId.toString())
        .limit(1)

      if (fetchError) {
        console.error('Error fetching transaction:', fetchError)
        return new Response('ok', { headers: corsHeaders })
      }

      if (transactions && transactions.length > 0) {
        const transaction = transactions[0]
        
        // Update transaction status
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'payment_confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id)

        if (updateError) {
          console.error('Error updating transaction:', updateError)
        } else {
          console.log('Transaction updated successfully:', transaction.id)
        }
      }
    }

    return new Response('ok', { headers: corsHeaders })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('ok', { headers: corsHeaders })
  }
})