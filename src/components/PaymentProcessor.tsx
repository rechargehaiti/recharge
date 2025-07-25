import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { LoadingSpinner } from './LoadingSpinner';
import { StatusMessage } from './StatusMessage';
import { StripeCheckout } from './StripeCheckout';
import { mercadopagoService } from '../services/mercadopago';
import { stripeService } from '../services/stripe';
import { CURRENCY_SYMBOLS, getProfitMarginFee } from '../constants/countries';
import { QrCode, CreditCard, CheckCircle } from 'lucide-react';

interface PaymentProcessorProps {
  paymentData: any;
  onPaymentComplete: (success: boolean, transactionId?: string) => void;
}

export const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  paymentData,
  onPaymentComplete
}) => {
  const [status, setStatus] = useState<'processing' | 'waiting' | 'completed' | 'failed'>('processing');
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [paymentProcessed, setPaymentProcessed] = useState(false);

  useEffect(() => {
    if (paymentData) {
      handlePaymentFlow();
    }
  }, [paymentData]);

  const handlePaymentFlow = async () => {
    try {
      console.log('🔄 Payment flow started:', {
        country: paymentData.rechargeData.originCountry,
        paymentMethod: paymentData.rechargeData.paymentMethod,
        hasClientSecret: !!paymentData.clientSecret,
        hasQrCode: !!paymentData.qrCode
      });
      
      if (paymentData.rechargeData.originCountry === 'BR') {
        // PIX Payment Flow
        if (paymentData.qrCode) {
          setQrCodeText(paymentData.qrCode);
          await generateQRCodeImage(paymentData.qrCode);
          setStatus('waiting');
          
          // Poll for payment confirmation
          pollPaymentStatus();
        } else {
          console.error('No QR code received from payment service');
          setStatus('failed');
        }
      } else {
        // International payments: Use Stripe
        if (paymentData.clientSecret) {
          console.log('✅ Stripe: ClientSecret válido, iniciando checkout');
          setStatus('waiting');
        } else {
          console.error('❌ Stripe: ClientSecret não encontrado');
          setStatus('failed');
        }
      }
    } catch (error) {
      console.error('Payment flow error:', error);
      setStatus('failed');
    }
  };

  const generateQRCodeImage = async (qrCodeText: string) => {
    try {
      // Generate QR code image from PIX code with better settings
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeText, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeImage(qrCodeDataURL);
      console.log('✅ QR Code gerado com sucesso');
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrCodeImage(null);
    }
  };
  const pollPaymentStatus = async () => {
    const maxAttempts = 18; // 3 minutes with 10-second intervals
    let attempts = 0;
    let paymentProcessed = false;

    const checkStatus = async () => {
      try {
        console.log(`🔄 PIX: Verificando status (${attempts + 1}/${maxAttempts})...`, {
          paymentId: paymentData.paymentId,
          country: paymentData.rechargeData.originCountry,
          timestamp: new Date().toISOString()
        });
        
        let paymentStatus;
        if (paymentData.rechargeData.originCountry === 'BR') {
          paymentStatus = await mercadopagoService.getPaymentStatus(paymentData.paymentId);
        } else {
          paymentStatus = await stripeService.getPaymentIntent(paymentData.paymentId);
        }

        const isApproved = paymentData.rechargeData.originCountry === 'BR' 
          ? paymentStatus.success && paymentStatus.status === 'approved'
          : paymentStatus.success && paymentStatus.status === 'succeeded';

        if (isApproved && !paymentProcessed) {
          paymentProcessed = true;
          setPaymentProcessed(true);
          console.log('✅ PIX: Pagamento APROVADO! Processando recarga...', {
            paymentId: paymentData.paymentId,
            transactionId: paymentData.transactionId,
            phoneNumber: paymentData.rechargeData.phoneNumber,
            operator: paymentData.rechargeData.operator,
            amount: paymentData.rechargeData.amount
          });
          
          setStatus('completed');
          
          // Aguardar um pouco antes de processar para evitar race conditions
          setTimeout(() => {
            console.log('🚀 PIX: Chamando onPaymentComplete...');
            onPaymentComplete(true, paymentData.transactionId);
          }, 1000);
          return;
        } else if (isApproved && paymentProcessed) {
          console.log('⚠️ PIX: Já processado, ignorando...');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          console.log(`⏰ PIX: Tentativa ${attempts}/${maxAttempts} - Status: ${paymentStatus.status}`);
          setTimeout(checkStatus, 10000); // Check every 10 seconds
        } else {
          console.log('⏰ PIX: TIMEOUT - 3 minutos atingidos', {
            totalAttempts: attempts,
            timeElapsed: '3 minutos'
          });
          setStatus('failed');
          onPaymentComplete(false);
        }
      } catch (error) {
        console.error('❌ PIX: Erro na verificação:', {
          error: error instanceof Error ? error.message : error,
          attempt: attempts + 1,
          paymentId: paymentData.paymentId,
        });
        
        attempts++;
        if (attempts < maxAttempts) {
          console.log('🔄 PIX: Retry após erro...');
          setTimeout(checkStatus, 10000);
        } else {
          console.log('❌ PIX: Max tentativas atingido');
          setStatus('failed');
          onPaymentComplete(false);
        }
      }
    };

    console.log('🚀 PIX: Iniciando polling...', {
      paymentId: paymentData.paymentId,
      maxAttempts,
      intervalSeconds: 10,
      maxTimeMinutes: 3
    });
    setTimeout(checkStatus, 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Get currency info for display
  const getCurrencyInfo = () => {
    if (!paymentData?.rechargeData) return { symbol: '$', currency: 'USD' };
    
    const currencyMap: { [key: string]: string } = {
      'BR': 'BRL', 'CL': 'CLP', 'FR': 'EUR', 'MX': 'MXN', 'CA': 'CAD', 'US': 'USD'
    };
    
    const currency = currencyMap[paymentData.rechargeData.originCountry] || 'USD';
    const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || '$';
    
    return { symbol, currency };
  };

  const { symbol: currencySymbol, currency } = getCurrencyInfo();
  const profitFee = paymentData?.profitFee || getProfitMarginFee(currency, rechargeAmount);
  const rechargeAmount = paymentData?.rechargeData?.amount || 0;
  const totalAmount = paymentData?.totalAmount || (rechargeAmount + profitFee);
  const dingconnectAmount = paymentData?.dingconnectAmount || rechargeAmount;
  const dingconnectCurrency = 'BRL'; // Sempre BRL para DingConnect
  
  if (status === 'processing') {
    return (
      <div className="text-center py-8">
        <LoadingSpinner message="Processando pagamento..." />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <StatusMessage
        type="error"
        message="Erro no pagamento"
        details="Não foi possível processar o pagamento. Tente novamente."
      />
    );
  }

  if (status === 'completed') {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-800 mb-2">
          ✅ Pagamento Confirmado!
        </h3>
        <p className="text-green-600 mb-4">
          Processando recarga...
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
            <span className="text-sm text-green-700 font-medium">
              Finalizando transação...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for payment
  if (paymentData.rechargeData.originCountry === 'BR') {
    // PIX Payment UI
    if (!qrCodeText) {
      return (
        <div className="text-center py-8">
          <LoadingSpinner message="Gerando QR Code PIX..." />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <QrCode className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              Pagamento PIX
            </h3>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
              🧪 TESTE PIX
            </span>
          </div>
          <p className="text-gray-600">
            PIX de teste - Escaneie o QR Code ou copie o código
          </p>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-3">Resumo do Pagamento</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Valor da recarga:</span>
              <span className="font-medium">
                {currencySymbol}{rechargeAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxa de serviço:</span>
              <span className="font-medium text-green-600">+{currencySymbol}{profitFee.toFixed(2)}</span>
            </div>
            <hr className="border-gray-300" />
            <div className="flex justify-between font-bold">
              <span className="text-gray-800">Total:</span>
              <span className="text-gray-800">{currencySymbol}{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
          {paymentData.qrCodeBase64 && paymentData.qrCodeBase64.startsWith('data:image/') ? (
            // Production mode with QR code from MercadoPago
            <div className="text-center">
              <img 
                src={paymentData.qrCodeBase64} 
                alt="QR Code PIX" 
                className="mx-auto max-w-full h-auto border border-gray-200 rounded"
                style={{ maxWidth: '280px', maxHeight: '280px' }}
              />
              <p className="text-sm text-green-600 mt-2 font-medium">✅ QR Code Real - MercadoPago</p>
              <p className="text-xs text-gray-500 mt-1">
                Escaneie com seu app bancário
              </p>
            </div>
          ) : qrCodeImage ? (
            // Show generated QR code from PIX string
            <div className="text-center">
              <div className="relative inline-block">
                <img 
                  src={qrCodeImage} 
                  alt="QR Code PIX" 
                  className="mx-auto border border-gray-200 rounded-lg"
                  style={{ width: '280px', height: '280px' }}
                />
              </div>
              <p className="text-sm font-medium mt-3 text-green-600">
                ✅ QR Code PIX Gerado
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Escaneie com seu app bancário
              </p>
            </div>
          ) : qrCodeText && !qrCodeImage ? (
            // Loading state
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600 font-medium">⏳ Gerando QR Code...</p>
            </div>
          ) : (
            // Error or no QR code
            <div className="text-center py-8">
              <QrCode className="h-20 w-20 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-red-600 font-medium">❌ QR Code não disponível</p>
              <p className="text-xs text-gray-500 mt-1">
                Use o botão "Copiar Código PIX" abaixo
              </p>
            </div>
          )}
        </div>

        {qrCodeText && (
          <div className="space-y-3">
          <button
            onClick={() => copyToClipboard(qrCodeText)}
            className="w-full py-3 px-4 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
          >
            Copiar Código PIX
          </button>
          
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-medium mb-1">Instruções:</p>
            <p>1. Abra seu app bancário</p>
            <p>2. Escolha "PIX" ou "Pagar com QR Code"</p>
            <p>3. Escaneie o QR Code acima ou cole o código copiado</p>
            <p>4. Confirme o pagamento de {currencySymbol}{totalAmount.toLocaleString()}</p>
          </div>
          </div>
        )}


        <div className="text-center">
          <LoadingSpinner size="small" message="Aguardando pagamento..." />
          <p className="text-sm text-gray-500 mt-2">
            O pagamento será confirmado automaticamente
          </p>
        </div>
      </div>
    );
  } else {
    // International Stripe Payment UI
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CreditCard className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              Pagamento Internacional
            </h3>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">
              🚨 PRODUÇÃO
            </span>
          </div>
          <p className="text-gray-600">
            Pagamento seguro via Stripe
          </p>
        </div>

        <StripeCheckout
          paymentData={paymentData}
          onPaymentComplete={onPaymentComplete}
        />
      </div>
    );
  }
};