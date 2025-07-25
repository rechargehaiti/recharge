import React, { useState, useRef, useEffect } from 'react';
import { CountryDestinationSelector } from '../components/CountryDestinationSelector';
import { PhoneInput } from '../components/PhoneInput';
import { OperatorSelector } from '../components/OperatorSelector';
import { AmountSelector } from '../components/AmountSelector';
import { PaymentMethod } from '../components/PaymentMethod';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusMessage } from '../components/StatusMessage';
import { PaymentProcessor } from '../components/PaymentProcessor';
import { StripeModal } from '../components/StripeModal';
import { useRecharge } from '../hooks/useRecharge';
import { RechargeData } from '../types';
import { ArrowRight, ArrowLeft, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { getCurrencyForCountry } from '../constants/countries';
import { supabaseService } from '../services/supabase';

type DestinationCountry = 'HT' | 'DO';

export const RechargePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [destinationCountry, setDestinationCountry] = useState<DestinationCountry>('HT');
  const [rechargeData, setRechargeData] = useState<RechargeData>({
    originCountry: 'BR',
    phoneNumber: '',
    operator: '',
    amount: 0,
    paymentMethod: ''
  });
  const [userEmail] = useState('demo@example.com');
  const [result, setResult] = useState<any>(null);
  const [detectedOperator, setDetectedOperator] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const { 
    processRecharge, 
    confirmPaymentAndRecharge, 
    loading, 
    error, 
    setError,
    paymentData, 
    setPaymentData
  } = useRecharge();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const status = query.get('status');
    const sessionId = query.get('session_id');

    if (status === 'success' && sessionId) {
      console.log('✅ Redirecionado do Stripe com sucesso. Session ID:', sessionId);
      // The webhook should have already updated the transaction.
      // We can fetch the transaction details to display the result.
      const fetchTransactionResult = async () => {
        try {
          // Assuming the webhook stores the session ID or payment intent ID in the transaction
          // For now, we'll just show a generic success message or refetch based on a known ID
          // In a real app, you'd fetch the transaction using metadata from the session ID
          // For this example, we'll simulate fetching the last transaction or a specific one if available
          const lastTransaction = await supabaseService.getTransactionsByUser('demo-user'); // Or fetch by session ID if stored
          if (lastTransaction && lastTransaction.length > 0) {
            setResult(lastTransaction); // Display the most recent transaction
          } else {
            setResult({ status: 'success', message: 'Pagamento confirmado, mas detalhes da transação não encontrados.' });
          }
        } catch (err) {
          console.error('Erro ao buscar transação após sucesso do Stripe:', err);
          setError('Pagamento confirmado, mas houve um erro ao buscar os detalhes da transação.');
        }
      };
      fetchTransactionResult();
    } else if (status === 'cancelled') {
      setError('Pagamento cancelado pelo usuário.');
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      // Auto-select detected operator when moving from phone to operator step
      if (currentStep === 3 && detectedOperator && !rechargeData.operator) {
        setRechargeData({ ...rechargeData, operator: detectedOperator });
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Prevenir múltiplos cliques
    if (loading) {
      console.log('⚠️ Processamento já em andamento, ignorando clique duplicado');
      return;
    }
    
    console.log('🚀 Submitting recharge with data:', {
      country: rechargeData.originCountry,
      destinationCountry: destinationCountry,
      paymentMethod: rechargeData.paymentMethod,
      amount: rechargeData.amount
    });
    
    await processRecharge(rechargeData, userEmail);
  };

  const handleOperatorDetected = (operatorId: string) => {
    setDetectedOperator(operatorId);
    // Auto-select the detected operator
    setRechargeData({ ...rechargeData, operator: operatorId });
  };

  const handlePaymentComplete = async (success: boolean, transactionId?: string) => {
    console.log('🎯 RechargePage: handlePaymentComplete chamado', {
      success,
      transactionId,
      hasPaymentData: !!paymentData,
      paymentId: paymentData?.paymentId,
      currentLoading: loading,
      timestamp: new Date().toISOString()
    });
    
    if (success && transactionId && paymentData) {
      console.log('🔄 RechargePage: Iniciando processamento pós-pagamento...', {
        success,
        transactionId,
        hasPaymentData: !!paymentData,
        paymentId: paymentData.paymentId,
        rechargeData: paymentData.rechargeData
      });
      
      console.log('📞 RechargePage: Chamando confirmPaymentAndRecharge...');
      const transaction = await confirmPaymentAndRecharge(
        transactionId,
        paymentData.paymentId,
        paymentData.rechargeData
      );
      
      console.log('📥 RechargePage: Resultado do confirmPaymentAndRecharge:', {
        transactionId: transaction?.id,
        status: transaction?.status,
        errorMessage: transaction?.errorMessage, // This will be handled by webhook now
        hasTransaction: !!transaction
      });
      
      if (isMountedRef.current) {
        if (transaction) {
          console.log('✅ RechargePage: Processamento concluído, atualizando UI...', {
            transactionStatus: transaction.status,
            transactionId: transaction.id,
            isMounted: isMountedRef.current
          }); // isMountedRef is no longer needed here due to direct redirect
          setResult(transaction);
          setPaymentData(null);
          // Garantir que o loading seja desabilitado
          if (loading) {
            console.log('🔄 RechargePage: Desabilitando loading após sucesso');
          }
        } else {
          console.log('⚠️ RechargePage: Nenhuma transação retornada, mantendo estado atual');
        }
      }
    } else {
      console.log('❌ RechargePage: Pagamento não foi confirmado ou dados inválidos', {
        success,
        transactionId,
        hasPaymentData: !!paymentData,
        paymentData: paymentData ? { // This path is mostly for PIX now
          paymentId: paymentData.paymentId,
          transactionId: paymentData.transactionId
        } : null
      });
      if (isMountedRef.current) {
        setError('Pagamento não foi confirmado');
        setPaymentData(null);
      }
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // País de origem (Brasil) sempre selecionado
      case 2:
        return true; // País de destino selecionado
      case 3:
        const expectedLength = destinationCountry === 'HT' ? 8 : 10;
        return rechargeData.phoneNumber.replace(/\D/g, '').length === expectedLength;
      case 4:
        return rechargeData.operator !== '';
      case 5:
        return rechargeData.amount > 0 && rechargeData.paymentMethod !== '';
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">País de origem</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🇧🇷</span>
                <div>
                  <div className="font-semibold text-blue-800">Brasil</div>
                  <div className="text-sm text-blue-600">Moeda: BRL (Real)</div>
                  <div className="text-xs text-blue-500 mt-1">Método: PIX (Instantâneo)</div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800">
                ✅ <strong>PIX:</strong> Pagamento instantâneo e sem taxas bancárias
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <CountryDestinationSelector
            selectedCountry={destinationCountry}
            onCountryChange={(country) => {
              setDestinationCountry(country);
              // Reset phone number and operator when changing destination country
              setRechargeData({ 
                ...rechargeData, 
                phoneNumber: '', 
                operator: '' 
              });
              setDetectedOperator(null);
            }}
          />
        );
      case 3:
        return (
          <PhoneInput
            phoneNumber={rechargeData.phoneNumber}
            onPhoneChange={(phone) => 
              setRechargeData({ ...rechargeData, phoneNumber: phone })
            }
            onOperatorDetected={handleOperatorDetected}
            selectedCountry={destinationCountry}
          />
        );
      case 4:
        return (
          <OperatorSelector
            selectedOperator={rechargeData.operator}
            onOperatorChange={(operator) => 
              setRechargeData({ ...rechargeData, operator })
            }
            detectedOperator={detectedOperator}
            selectedCountry={destinationCountry}
          />
        );
      case 5:
        return (
          <div className="space-y-6">
            <AmountSelector
              selectedAmount={rechargeData.amount}
              onAmountChange={(amount) => 
                setRechargeData({ ...rechargeData, amount })
              }
              operator={rechargeData.operator}
              currency={getCurrencyForCountry(rechargeData.originCountry)}
            />
            <PaymentMethod
              selectedMethod={rechargeData.paymentMethod}
              onMethodChange={(method) => 
                setRechargeData({ ...rechargeData, paymentMethod: method })
              }
              country={rechargeData.originCountry}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Show payment processor if we have payment data
  if (paymentData && !paymentData.showResult) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        <PaymentProcessor
          paymentData={paymentData}
          onPaymentComplete={handlePaymentComplete}
        />
      </div>
    );
  }

  if (result || (paymentData && paymentData.showResult)) {
    const displayResult = result || paymentData.result;
    const getDestinationInfo = () => {
      if (destinationCountry === 'HT') {
        return { flag: '🇭🇹', code: '+509', name: 'Haiti' };
      } else {
        return { flag: '🇩🇴', code: '+1', name: 'República Dominicana' };
      }
    };
    const destInfo = getDestinationInfo();
    
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Header com ícone de sucesso */}
        <div className="text-center">
          {displayResult.status === 'success' && (
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          )}
          {displayResult.status === 'refunded' && (
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-12 w-12 text-yellow-600" />
            </div>
          )}
          {displayResult.status === 'failed' && (
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {displayResult.status === 'success' && 'Recarga Enviada com Sucesso!'}
            {displayResult.status === 'refunded' && 'Recarga Falhou - Reembolso Processado'}
            {displayResult.status === 'failed' && 'Erro no Processamento'}
          </h2>
          
          {displayResult.status === 'success' && (
            <p className="text-green-600 font-medium mb-4">
              ✅ Sua recarga foi enviada e o cliente já recebeu os créditos!
            </p>
          )}
        </div>
        
        {/* Detalhes da transação */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-800 mb-3">Detalhes da Transação</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Número de destino:</span>
              <span className="font-medium">{destInfo.code} {displayResult.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Operadora:</span>
              <span className="font-medium">
                {getOperatorDisplayName(displayResult.operator)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valor da recarga:</span>
              <span className="font-medium">{displayResult.currency} {displayResult.amount}</span>
            </div>
            {displayResult.dingconnectTransactionId && (
              <div className="flex justify-between">
                <span className="text-gray-600">ID da recarga:</span>
                <span className="font-mono text-xs">{displayResult.dingconnectTransactionId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Data/Hora:</span>
              <span className="font-medium">
                {new Date(displayResult.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {displayResult.status === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Recarga Concluída!</span>
            </div>
            <p className="text-sm text-green-700">
              A recarga foi processada com sucesso e os créditos já estão disponíveis no número de destino.
            </p>
          </div>
        )}
        
        {displayResult.status === 'refunded' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <RefreshCw className="h-5 w-5" />
              <span className="font-semibold">Reembolso Processado</span>
            </div>
            <p className="text-sm text-yellow-700 mb-2">
              A recarga não pôde ser processada, mas seu dinheiro foi devolvido automaticamente.
            </p>
            {displayResult.errorMessage && (
              <p className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
                <strong>Motivo:</strong> {displayResult.errorMessage}
              </p>
            )}
          </div>
        )}
        
        {displayResult.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <XCircle className="h-5 w-5" />
              <span className="font-semibold">Erro no Processamento</span>
            </div>
            <p className="text-sm text-red-700 mb-2">
              Houve um problema no processamento da recarga.
            </p>
            {displayResult.errorMessage && (
              <p className="text-xs text-red-600 bg-red-100 p-2 rounded">
                <strong>Detalhes:</strong> {displayResult.errorMessage}
              </p>
            )}
          </div>
        )}
        
        {/* Botões de ação */}
        <div className="space-y-3">
          <button
            onClick={() => {
              setResult(null);
              setPaymentData(null);
              setCurrentStep(1);
              setDestinationCountry('HT');
              setRechargeData({
                originCountry: 'BR',
                phoneNumber: '',
                operator: '',
                amount: 0,
                paymentMethod: ''
              });
              setDetectedOperator(null);
              setError(null);
            }}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            🔄 Fazer Nova Recarga
          </button>
          
          {displayResult.status === 'success' && (
            <button
              onClick={() => {
                // Copiar detalhes da transação
                const details = `Recarga ${destInfo.name} - Sucesso
Número: ${destInfo.code} ${displayResult.phoneNumber}
Operadora: ${getOperatorDisplayName(displayResult.operator)}
Valor: ${displayResult.currency} ${displayResult.amount}
ID: ${displayResult.dingconnectTransactionId || displayResult.id}
Data: ${new Date(displayResult.createdAt).toLocaleString('pt-BR')}`;
                
                navigator.clipboard.writeText(details);
                alert('Detalhes copiados para a área de transferência!');
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              📋 Copiar Detalhes
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Recarga Internacional
        </h2>
        <p className="text-gray-600">
          Passo {currentStep} de {totalSteps}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {renderStep()}
      </div>

      {/* Error Message */}
      {error && (
        <StatusMessage
          type="error"
          message="Erro no processamento"
          details={error}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <LoadingSpinner message="Processando sua recarga..." />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between space-x-4">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
            currentStep === 1
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Anterior</span>
        </button>

        {currentStep < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              canProceed()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Próximo</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || loading}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
              canProceed() && !loading
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>{loading ? 'Processando...' : 'Confirmar Recarga'}</span>
          </button>
        )}
      </div>
      </div>
    </>
  );
};

// Helper function to get operator display name
function getOperatorDisplayName(operatorId: string): string {
  const operatorNames: { [key: string]: string } = {
    'D7HT': 'Digicel Haiti BRL',
    'NMHT': 'Natcom Haiti',
    'D8DO': 'Claro Dominican Republic Data',
    'ORDO': 'Altice (Orange) Dominican Republic',
    'VVDO': 'Viva Dominican Republic'
  };
  return operatorNames[operatorId] || 'Operadora desconhecida';
};