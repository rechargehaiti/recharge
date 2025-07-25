import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@^14.0.0";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!secretKey || !secretKey.startsWith('sk_live_')) {
    console.error('🚨 Stripe Webhook: STRIPE_SECRET_KEY de PRODUÇÃO não configurado!');
    return new Response(
      JSON.stringify({ success: false, error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe secret key not configured for production' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  if (!webhookSecret) {
    console.error('🚨 Stripe Webhook: STRIPE_WEBHOOK_SECRET não configurado!');
    return new Response(
      JSON.stringify({ success: false, error: 'WEBHOOK_SECRET_NOT_CONFIGURED', message: 'Stripe webhook secret not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  if (!supabaseServiceRoleKey || !supabaseUrl) {
    console.error('🚨 Stripe Webhook: Supabase Service Role Key ou URL não configurados!');
    return new Response(
      JSON.stringify({ success: false, error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase service role key or URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18',
    typescript: true,
  });

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret);
    } catch (err) {
      console.error('❌ Stripe Webhook: Erro na verificação da assinatura:', err.message);
      return new Response(
        JSON.stringify({ success: false, error: 'WEBHOOK_SIGNATURE_INVALID', message: err.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Stripe Webhook: Evento recebido:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('🛒 Checkout Session Completed:', session.id);

        const { transactionId, phoneNumber, operatorId, amount, currency } = session.metadata || {};
        const paymentIntentId = session.payment_intent as string;

        if (!transactionId || !phoneNumber || !operatorId || !amount || !currency || !paymentIntentId) {
          console.error('❌ Stripe Webhook: Metadados ou PaymentIntent ID ausentes na sessão:', session.metadata, paymentIntentId);
          return new Response(
            JSON.stringify({ success: false, error: 'MISSING_METADATA', message: 'Missing metadata or payment_intent ID in session' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('🔄 Stripe Webhook: Atualizando transação para payment_confirmed:', transactionId);
        await supabase.from('transactions').update({
          status: 'payment_confirmed',
          payment_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        }).eq('id', transactionId);

        console.log('🚀 Stripe Webhook: Iniciando recarga via Reloadly...');
        const dingconnectRechargeUrl = `${supabaseUrl}/functions/v1/dingconnect-recharge`;
        const dingconnectResponse = await fetch(dingconnectRechargeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceRoleKey}`, // Use service role key for internal function call
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            operatorId: operatorId,
            amount: parseFloat(amount), // Convert back to number
            currency: currency,
          }),
        });

        const dingconnectData = await dingconnectResponse.json();

        if (dingconnectResponse.ok && dingconnectData.success) {
          console.log('✅ Stripe Webhook: Recarga DingConnect bem-sucedida! Atualizando transação para success.');
          await supabase.from('transactions').update({
            status: 'success',
            dingconnect_transaction_id: dingconnectData.transactionId,
            error_message: null,
            updated_at: new Date().toISOString(),
          }).eq('id', transactionId);
        } else {
          console.error('❌ Stripe Webhook: Recarga DingConnect falhou! Iniciando reembolso...');
          const errorMessage = dingconnectData.message || dingconnectData.error || 'Erro desconhecido na recarga DingConnect';

          // Initiate refund
          const stripeRefundUrl = `${supabaseUrl}/functions/v1/stripe-refund`;
          const refundResponse = await fetch(stripeRefundUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceRoleKey}`, // Use service role key for internal function call
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntentId,
              amount: Math.round(parseFloat(amount) * 100), // Refund full amount in cents
            }),
          });
          const refundData = await refundResponse.json();

          if (refundResponse.ok && refundData.success) {
            console.log('✅ Stripe Webhook: Reembolso bem-sucedido! Atualizando transação para refunded.');
            await supabase.from('transactions').update({
              status: 'refunded',
              refund_id: refundData.paymentId,
              error_message: `Recarga falhou: ${errorMessage}. Reembolso processado.`,
              updated_at: new Date().toISOString(),
            }).eq('id', transactionId);
          } else {
            console.error('❌ Stripe Webhook: Reembolso falhou! Atualizando transação para failed.');
            await supabase.from('transactions').update({
              status: 'failed',
              error_message: `Recarga DingConnect falhou: ${errorMessage}. Erro no reembolso: ${refundData.message || refundData.error || 'Erro desconhecido'}.`,
              updated_at: new Date().toISOString(),
            }).eq('id', transactionId);
          }
        }
        break;
      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Stripe Webhook: Erro geral:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'FUNCTION_ERROR', message: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});