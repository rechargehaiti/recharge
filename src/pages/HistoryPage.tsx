import React from 'react';
import { TransactionHistory } from '../components/TransactionHistory';
import { ArrowLeft } from 'lucide-react';

interface HistoryPageProps {
  onBack: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          Histórico
        </h2>
      </div>

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  );
};