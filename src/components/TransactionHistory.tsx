import React, { useEffect, useState } from 'react';
import { Transaction } from '../types';
import { supabaseService } from '../services/supabase';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await supabaseService.getTransactionsByUser('demo-user');
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'refunded':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Concluída';
      case 'failed':
        return 'Falhou';
      case 'refunded':
        return 'Reembolsada';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Histórico de Recargas</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Histórico de Recargas</h3>
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhuma recarga encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(transaction.status)}
                  <div>
                    <div className="font-medium text-gray-900">
                      +509 {transaction.phoneNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {transaction.operator} • {transaction.currency} {transaction.amount}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(transaction.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    transaction.status
                  )}`}
                >
                  {getStatusText(transaction.status)}
                </span>
              </div>
              {transaction.errorMessage && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  {transaction.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};