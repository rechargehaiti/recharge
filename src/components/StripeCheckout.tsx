import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { stripeService } from '../services/stripe';
import { LoadingSpinner } from './LoadingSpinner';
import { StatusMessage } from './StatusMessage';
import { CURRENCY_SYMBOLS } from '../constants/countries';
import { CreditCard, Lock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface StripeCheckoutProps {
  paymentData: any;
  onPaymentComplete: (success: boolean, transactionId?: string) => void;
}

const CheckoutForm: React.FC<StripeCheckoutProps> = ({ paymentData, onPaymentComplete }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if Stripe and Elements are ready
    if (stripe && elements) {
      setIsReady(true);
    }
  }, [stripe, elements]);

  const currency = paymentData?.rechargeData?.originCountry === 'BR' ? 'BRL' : 'USD';
  const currencySymbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || '$';
  const totalAmount = paymentData?.totalAmount || 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || processing) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setProcessing(false);
      return;
    }

    try {
      console.log('🔄 Stripe: Confirmando pagamento...');
      
      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customerName,
              email: customerEmail,
            },
          },
        }
      );

      if (confirmError) {
        console.error('❌ Stripe: Erro na confirmação:', confirmError);
        setError(confirmError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log('✅ Stripe: Pagamento confirmado com sucesso');
        onPaymentComplete(true, paymentData.transactionId);
      } else {
        console.warn('⚠️ Stripe: Status:', paymentIntent?.status);
        setError('Payment was not completed successfully');
        setProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred');
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  // Show loading while Stripe is initializing
  if (!stripe || !elements) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner message="Carregando checkout seguro..." />
        <p className="text-sm text-gray-500 mt-2">
          Inicializando Stripe Elements...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CreditCard className="h-8 w-8 text-blue-500" />
          <h3 className="text-xl font-semibold text-gray-800">
            Pagamento Seguro
          </h3>
          {stripeService.isLiveMode() ? (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">
              🚨 PRODUÇÃO
            </span>
          ) : (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
              🧪 TESTE
            </span>
          )}
        </div>
        
        {stripeService.isLiveMode() ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Pagamento Real</span>
            </div>
            <p className="text-sm text-red-700">
              🚨 Este é um pagamento real. O valor será cobrado do seu cartão.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Modo Teste</span>
            </div>
            <p className="text-sm text-blue-700">
              🧪 Este é um pagamento de teste. Use seus dados reais de cartão.
            </p>
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-3">Resumo do Pagamento</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Destino:</span>
            <span className="font-medium">+509 {paymentData?.rechargeData?.phoneNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Operadora:</span>
            <span className="font-medium">{paymentData?.rechargeData?.operator === '173' ? 'Digicel Haiti' : 'Natcom Haiti'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Valor da recarga:</span>
            <span className="font-medium">{currencySymbol}{paymentData?.rechargeData?.amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Taxa de serviço:</span>
            <span className="font-medium text-green-600">+{currencySymbol}{paymentData?.profitFee?.toFixed(2)}</span>
          </div>
          <hr className="border-gray-300" />
          <div className="flex justify-between font-bold">
            <span className="text-gray-800">Total:</span>
            <span className="text-gray-800">{currencySymbol}{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome completo
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Seu nome completo"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dados do cartão
          </label>
          <div className="p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <CardElement options={cardElementOptions} />
          </div>
        </div>

        {error && (
          <StatusMessage
            type="error"
            message="Erro no pagamento"
            details={error}
          />
        )}

        <button
          type="submit"
          disabled={!stripe || !elements || processing || !customerName || !customerEmail}
          className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${
            processing || !stripe || !elements || !customerName || !customerEmail
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>
                Pagar {currencySymbol}{totalAmount.toFixed(2)}
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={processing}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            processing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          Cancelar
        </button>
      </form>

      {/* Security Indicators */}
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <Lock className="h-3 w-3" />
          <span>SSL Seguro</span>
        </div>
        <div className="flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>PCI DSS</span>
        </div>
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" />
          <span>Stripe</span>
        </div>
      </div>
    </div>
  );
};

export const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        console.log('🔄 Stripe: Inicializando checkout...');
        
        // Get publishable key
        const publishableKey = stripeService.getPublishableKey();
        
        if (!publishableKey) {
          throw new Error('Chave pública do Stripe não configurada');
        }
        
        if (!publishableKey.startsWith('pk_live_')) {
          console.warn('⚠️ Stripe: Chave não é de produção:', publishableKey.substring(0, 12) + '...');
          // Allow test keys for development
          if (!publishableKey.startsWith('pk_test_')) {
            throw new Error('Configure uma chave Stripe válida (pk_live_... ou pk_test_...)');
          }
        }
        
        console.log('✅ Stripe: Chave válida encontrada:', publishableKey.substring(0, 12) + '...');
        
        // Load Stripe
        const stripe = loadStripe(publishableKey);
        setStripePromise(stripe);
        
        console.log('✅ Stripe: Checkout inicializado com sucesso');
      } catch (error) {
        console.error('❌ Stripe: Erro na inicialização:', error);
        setInitError(error instanceof Error ? error.message : 'Erro desconhecido');
      }
    };

    initializeStripe();
  }, []);

  // Show error if Stripe failed to initialize
  if (initError) {
    return (
      <div className="space-y-4">
        <StatusMessage
          type="error"
          message="Erro na inicialização do Stripe"
          details={initError}
        />
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-1">Para corrigir:</p>
          <p>1. Configure VITE_STRIPE_PUBLISHABLE_KEY no .env</p>
          <p>2. Use uma chave que comece com pk_live_ (produção) ou pk_test_ (teste)</p>
          <p>3. Reinicie o servidor de desenvolvimento</p>
        </div>
      </div>
    );
  }

  // Show loading while Stripe is being loaded
  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner message="Inicializando Stripe..." />
        <p className="text-sm text-gray-500 mt-2">
          Carregando sistema de pagamento seguro...
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};