import { useState } from 'react';
import { RechargeData, Transaction } from '../types';
import { dingconnectService } from '../services/dingconnect';
import { mercadopagoService } from '../services/mercadopago';
import { stripeService } from '../services/stripe';
import { supabaseService } from '../services/supabase';
import { ALL_OPERATORS, getCurrencyForCountry, getProfitMarginFee, EXCHANGE_RATES } from '../constants/countries';

// Global state para prevenir processamento duplicado
const processingTransactions = new Set<string>();

export const useRecharge = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const processRecharge = async (
    rechargeData: RechargeData,
    userEmail: string,
    userId: string = 'demo-user'
  ): Promise<Transaction | null> => {
    if (loading) {
      console.log('⚠️ Processamento já em andamento, ignorando requisição duplicada');
      return null;
    }
    
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Iniciando processo de recarga:', rechargeData);

      const currency = getCurrencyForCountry(rechargeData.originCountry);
      const profitFee = getProfitMarginFee(currency, rechargeData.amount);
      const totalPaymentAmount = rechargeData.amount + profitFee;
      
      // IMPORTANTE: Reloadly sempre usa BRL para recargas no Haiti
      let dingconnectAmount: number;
      let dingconnectCurrency: string = 'BRL';
      
      if (currency === 'BRL') {
        // Brasil: usar valor direto em BRL
        dingconnectAmount = rechargeData.amount;
      } else {
        // Internacional: converter para BRL
        const exchangeRate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1;
        dingconnectAmount = Math.round(rechargeData.amount * exchangeRate * 100) / 100;
      }
      
      // Validar limites em BRL para operadoras do Haiti
      const operator = ALL_OPERATORS.find(op => op.id === rechargeData.operator);
      
      // Limites em BRL baseados nas denominações das operadoras
      let minBrlAmount = 4.45;    // Mínimo BRL
      let maxBrlAmount = 552.53;  // Máximo BRL
      
      if (operator) {
        minBrlAmount = operator.minAmountBRL || 2.78;
        maxBrlAmount = operator.maxAmountBRL || 552.53;
      }
      
      if (dingconnectAmount < minBrlAmount) {
        dingconnectAmount = minBrlAmount;
        console.log(`⚠️ Valor ajustado para mínimo da operadora: ${dingconnectAmount} BRL`);
      }
      
      if (dingconnectAmount < minBrlAmount || dingconnectAmount > maxBrlAmount) {
        throw new Error(`Valor inválido para recarga: ${dingconnectAmount.toFixed(2)} BRL. Use valores entre ${minBrlAmount} BRL e ${maxBrlAmount} BRL.`);
      }

      const transaction = await supabaseService.createTransaction({
        userId,
        phoneNumber: rechargeData.phoneNumber,
        operator: rechargeData.operator,
        amount: totalPaymentAmount,
        currency: currency,
        status: 'pending',
        paymentMethod: rechargeData.paymentMethod
      });

      console.log('✅ Transação criada:', transaction.id);

      if (rechargeData.originCountry === 'BR') {
        const paymentResult = await mercadopagoService.createPixPayment(
          totalPaymentAmount,
          userEmail,
          rechargeData.phoneNumber,
          `Recarga Internacional - ${rechargeData.operator} - R$ ${dingconnectAmount.toFixed(2)} + Taxa R$ ${profitFee.toFixed(2)}`
        );

        if (!paymentResult.success) {
          await supabaseService.updateTransaction(transaction.id, {
            status: 'failed',
            errorMessage: `Falha no PIX: ${paymentResult.message || paymentResult.error}`
          });
          setError(paymentResult.message || 'Erro no PIX');
          return null;
        }

        setPaymentData({
          ...paymentResult,
          transactionId: transaction.id,
          rechargeData,
          totalAmount: totalPaymentAmount,
          profitFee: profitFee,
          dingconnectAmount: dingconnectAmount,
          dingconnectCurrency: dingconnectCurrency
        });

        await supabaseService.updateTransaction(transaction.id, {
          paymentId: paymentResult.paymentId,
          status: 'payment_pending'
        });
      } else {
        try {
          console.log('🔄 Stripe: Criando PaymentIntent...');
          const paymentResult = await stripeService.createPaymentIntent(
            totalPaymentAmount,
            currency
          );

          if (!paymentResult.success) {
            throw new Error(paymentResult.message || 'Erro ao criar PaymentIntent');
          }

          setPaymentData({
            ...paymentResult,
            transactionId: transaction.id,
            rechargeData,
            totalAmount: totalPaymentAmount,
            profitFee: profitFee,
            dingconnectAmount: dingconnectAmount,
            dingconnectCurrency: dingconnectCurrency
          });

          await supabaseService.updateTransaction(transaction.id, {
            paymentId: paymentResult.paymentId,
            status: 'payment_pending'
          });
        } catch (error) {
          await supabaseService.updateTransaction(transaction.id, {
            status: 'failed',
            errorMessage: `Falha ao iniciar Stripe: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          });
          setError(error instanceof Error ? error.message : 'Erro no Stripe');
          return null;
        }
      }

      return transaction;
    } catch (error) {
      console.error('❌ Erro no processo de recarga:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmPaymentAndRecharge = async (
    transactionId: string,
    paymentId: string,
    rechargeData: RechargeData
  ): Promise<Transaction | null> => {
    // Verificar se esta transação já está sendo processada
    if (processingTransactions.has(transactionId)) {
      console.log('⚠️ useRecharge: Transação já está sendo processada, ignorando:', transactionId);
      return null;
    }

    // Verificar se a transação já foi processada com sucesso
    try {
      const existingTransaction = await supabaseService.getTransaction(transactionId);
      if (existingTransaction && (existingTransaction.status === 'success' || existingTransaction.status === 'refunded')) {
        console.log('⚠️ useRecharge: Transação já foi processada:', {
          transactionId,
          status: existingTransaction.status,
          dingconnectTransactionId: existingTransaction.reloadlyTransactionId // Mantém o nome do campo no banco
        });
        return existingTransaction;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar transação existente:', error);
    }

    // Marcar transação como sendo processada
    processingTransactions.add(transactionId);

    console.log('🎯 useRecharge: confirmPaymentAndRecharge INICIADO', {
      transactionId,
      paymentId,
      country: rechargeData.originCountry,
      phoneNumber: rechargeData.phoneNumber,
      operator: rechargeData.operator,
      amount: rechargeData.amount,
      currentLoading: loading,
      timestamp: new Date().toISOString()
    });
    
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 useRecharge: Confirmando pagamento e processando recarga...', {
        transactionId,
        paymentId,
        country: rechargeData.originCountry,
        step: 'INICIO'
      });

      // Verificar se o pagamento foi realmente aprovado
      console.log('🔍 useRecharge: Verificando status do pagamento antes da recarga...');
      
      let paymentStatus;
      if (rechargeData.originCountry === 'BR') {
        paymentStatus = await mercadopagoService.getPaymentStatus(paymentId);
      } else {
        paymentStatus = await stripeService.getPaymentIntent(paymentId);
      }
      
      const isApproved = rechargeData.originCountry === 'BR' 
        ? paymentStatus.success && paymentStatus.status === 'approved'
        : paymentStatus.success && paymentStatus.status === 'succeeded';
      
      if (!isApproved) {
        console.error('❌ useRecharge: Pagamento não foi aprovado, cancelando recarga...', {
          paymentStatus: paymentStatus.status,
          success: paymentStatus.success,
          paymentId
        });
        
        await supabaseService.updateTransaction(transactionId, {
          status: 'failed',
          errorMessage: `Pagamento não aprovado: ${paymentStatus.status}`
        });
        
        setError(`Pagamento não foi aprovado: ${paymentStatus.status}`);
        return null;
      }
      
      console.log('✅ useRecharge: Pagamento confirmado, processando recarga...');
      
      await supabaseService.updateTransaction(transactionId, {
        status: 'payment_confirmed',
        errorMessage: null
      });

      console.log('📋 useRecharge: ETAPA 2 - Preparando dados para recarga...');
      const currency = getCurrencyForCountry(rechargeData.originCountry);
      
      // IMPORTANTE: Reloadly usa BRL para recargas no Haiti
      let dingconnectAmount: number;
      let dingconnectCurrency: string = 'BRL';
      
      if (currency === 'BRL') {
        // Brasil: usar valor direto em BRL
        dingconnectAmount = rechargeData.amount;
      } else {
        // Internacional: converter para BRL
        const exchangeRate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1;
        dingconnectAmount = Math.round(rechargeData.amount * exchangeRate * 100) / 100;
      }
      
      // Garantir valor mínimo da operadora em BRL
      const operator = ALL_OPERATORS.find(op => op.id === rechargeData.operator);
      const minBrlAmount = operator?.minAmountBRL || 2.78; // Mínimo em BRL
      
      if (dingconnectAmount < minBrlAmount) {
        dingconnectAmount = minBrlAmount;
        console.log(`⚠️ Valor ajustado para mínimo da operadora: ${dingconnectAmount} BRL`);
      }
      
      console.log('📋 useRecharge: ETAPA 3 - Processando recarga via DingConnect...', {
        phoneNumber: rechargeData.phoneNumber,
        operatorId: rechargeData.operator,
        amount: dingconnectAmount,
        currency: dingconnectCurrency, // BRL
        originalAmount: rechargeData.amount,
        originalCurrency: currency
      });
      
      
      // Implementar timeout para recarga
      const rechargePromise = dingconnectService.performRecharge(
        rechargeData.phoneNumber,
        rechargeData.operator,
        dingconnectAmount,
        dingconnectCurrency
      );
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na recarga - 60 segundos')), 60000);
      });
      
      const rechargeResult = await Promise.race([rechargePromise, timeoutPromise]);

      console.log('📥 useRecharge: Resultado da recarga DingConnect:', {
        success: rechargeResult.success,
        transactionId: rechargeResult.transactionId,
        isDeferred: rechargeResult.isDeferred,
        correlationId: rechargeResult.correlationId,
        error: rechargeResult.error,
        message: rechargeResult.message,
        details: rechargeResult
      });

      if (rechargeResult.success) {
        if (rechargeResult.isDeferred) {
          console.log('✅ useRecharge: Deferred transfer iniciado! Aguardando webhook...');
          const updatedTransaction = await supabaseService.updateTransaction(transactionId, {
            status: 'processing',
            dingconnectTransactionId: rechargeResult.transactionId,
            errorMessage: `Deferred transfer iniciado - Correlation ID: ${rechargeResult.correlationId}. Aguardando webhook para resultado final.`
          });
          console.log('✅ useRecharge: Transação atualizada para PROCESSING (aguardando webhook):', updatedTransaction.id);
          return updatedTransaction;
        } else {
          console.log('✅ useRecharge: Recarga processada com SUCESSO! Atualizando transação...');
          const updatedTransaction = await supabaseService.updateTransaction(transactionId, {
            status: 'success',
            dingconnectTransactionId: rechargeResult.transactionId,
            errorMessage: null
          });
          console.log('✅ useRecharge: Transação atualizada para SUCCESS:', updatedTransaction.id);
          return updatedTransaction;
        }
      } else {
        console.log('❌ useRecharge: Recarga FALHOU! Iniciando reembolso automático...', {
          error: rechargeResult.error,
          message: rechargeResult.message,
          details: rechargeResult,
          errorMessage: rechargeResult.message || rechargeResult.error
        });
        
        // Garantir que o reembolso sempre aconteça
        return await processRefund(transactionId, paymentId, rechargeData, rechargeResult);
      }
    } catch (error) {
      console.error('❌ useRecharge: ERRO CRÍTICO no processamento:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        transactionId,
        paymentId,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      
      // Se houve erro crítico, tentar reembolso
      try {
        console.log('🔄 useRecharge: Tentando reembolso após erro crítico...');
        return await processRefund(transactionId, paymentId, rechargeData, {
          success: false,
          error: 'CRITICAL_ERROR',
          message: error instanceof Error ? error.message : 'Erro crítico desconhecido'
        });
      } catch (refundError) {
        console.error('❌ useRecharge: Erro ao processar reembolso após erro crítico:', refundError);
        
        const criticalErrorMsg = error instanceof Error ? error.message : 'Erro crítico desconhecido';
        const failedTransaction = await supabaseService.updateTransaction(transactionId, {
          status: 'failed',
          errorMessage: `Erro crítico no processamento: ${criticalErrorMsg}. ATENÇÃO: Reembolso pode ter falhado - verificar manualmente.`
        });
        return failedTransaction;
      }
    } finally {
      console.log('🏁 useRecharge: confirmPaymentAndRecharge FINALIZADO');
      // Remover transação do conjunto de processamento
      processingTransactions.delete(transactionId);
      setLoading(false);
    }
  };

  // Função separada para processar reembolso
  const processRefund = async (
    transactionId: string,
    paymentId: string,
    rechargeData: RechargeData,
    rechargeResult: any
  ): Promise<Transaction> => {
    try {
      console.log('📋 useRecharge: ETAPA 4 - Calculando reembolso...');
      const currency = getCurrencyForCountry(rechargeData.originCountry);
      const profitFee = getProfitMarginFee(currency, rechargeData.amount);
      const totalRefundAmount = rechargeData.amount + profitFee;
      
      console.log('💰 useRecharge: Processando reembolso...', {
        totalAmount: totalRefundAmount,
        rechargeAmount: rechargeData.amount,
        profitFee: profitFee,
        currency: currency,
        paymentId: paymentId,
        country: rechargeData.originCountry
      });
      
      let refundResult;
      if (rechargeData.originCountry === 'BR') {
        console.log('💰 useRecharge: Iniciando reembolso PIX via MercadoPago...');
        
        // Implementar timeout para reembolso
        const refundPromise = mercadopagoService.refundPayment(paymentId, totalRefundAmount);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout no reembolso - 30 segundos')), 30000);
        });
        
        refundResult = await Promise.race([refundPromise, timeoutPromise]);
        
        console.log('💰 useRecharge: Resultado reembolso PIX:', {
          success: refundResult.success,
          status: refundResult.status,
          error: refundResult.error,
          message: refundResult.message,
          refundId: refundResult.paymentId
        });
      } else {
        console.log('💰 useRecharge: Iniciando reembolso via Stripe...');
        
        const refundPromise = stripeService.refundPayment(paymentId, totalRefundAmount);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout no reembolso Stripe - 30 segundos')), 30000);
        });
        
        refundResult = await Promise.race([refundPromise, timeoutPromise]);
        
        console.log('💰 useRecharge: Resultado reembolso Stripe:', {
          success: refundResult.success,
          status: refundResult.status,
          error: refundResult.error,
          message: refundResult.message,
          refundId: refundResult.paymentId
        });
      }

      if (refundResult.success) {
        console.log('✅ useRecharge: Reembolso processado com SUCESSO!', {
          refundId: refundResult.paymentId,
          amount: refundResult.amount || totalRefundAmount,
          refundMessage: 'Reembolso processado automaticamente'
        });
      } else {
        console.error('❌ useRecharge: FALHA no reembolso:', {
          error: refundResult.error,
          message: refundResult.message,
          details: refundResult,
          refundErrorMessage: refundResult.message || refundResult.error
        });
      }
      
      console.log('📋 useRecharge: Atualizando transação com resultado do reembolso...');
      
      // Construir mensagem de erro detalhada
      const rechargeErrorMsg = rechargeResult.message || rechargeResult.error || 'Erro desconhecido na recarga';
      let refundStatusMsg;
      
      if (refundResult.success) {
        refundStatusMsg = 'Reembolso processado automaticamente';
      } else {
        const refundError = refundResult.message || refundResult.error || 'Erro desconhecido';
        if (refundError.includes('lock error')) {
          refundStatusMsg = 'Pagamento temporariamente bloqueado para reembolso. Verifique sua conta MercadoPago e processe o reembolso manualmente se necessário.';
        } else {
          refundStatusMsg = `Erro no reembolso: ${refundError}`;
        }
      }
      
      const fullErrorMessage = `Recarga falhou: ${rechargeErrorMsg}. ${refundStatusMsg}`;
      
      console.log('📝 useRecharge: Mensagem de erro construída:', {
        rechargeError: rechargeErrorMsg,
        refundStatus: refundStatusMsg,
        fullMessage: fullErrorMessage
      });
      
      const updatedTransaction = await supabaseService.updateTransaction(transactionId, {
        status: refundResult.success ? 'refunded' : 'failed',
        refundId: refundResult.success ? refundResult.paymentId : null,
        errorMessage: fullErrorMessage
      });

      console.log('📊 useRecharge: Transação final atualizada:', {
        id: transactionId,
        status: updatedTransaction.status,
        refundId: updatedTransaction.refundId,
        errorMessage: updatedTransaction.errorMessage,
        errorLength: updatedTransaction.errorMessage?.length || 0
      });
      
      // Garantir que o loading seja desabilitado
      setLoading(false);
      
      return updatedTransaction;
    } catch (refundError) {
      console.error('❌ useRecharge: Erro crítico no reembolso:', refundError);
      
      // Se o reembolso falhou, marcar como failed com aviso
      const rechargeErrorMsg = rechargeResult.message || rechargeResult.error || 'Erro desconhecido na recarga';
      const refundErrorMsg = refundError instanceof Error ? refundError.message : 'Erro desconhecido no reembolso';
      
      const updatedTransaction = await supabaseService.updateTransaction(transactionId, {
        status: 'failed',
        errorMessage: `Recarga falhou: ${rechargeErrorMsg}. ERRO CRÍTICO NO REEMBOLSO: ${refundErrorMsg}. VERIFICAR MANUALMENTE!`
      });
      
      // Garantir que o loading seja desabilitado
      setLoading(false);
      
      return updatedTransaction;
    }
  };

  return {
    processRecharge,
    confirmPaymentAndRecharge,
    loading,
    error,
    setError,
    paymentData,
    setPaymentData
  };
};