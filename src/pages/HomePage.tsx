import React from 'react';
import { Smartphone, History, Globe, CreditCard } from 'lucide-react';

interface HomePageProps {
  onStartRecharge: () => void;
  onViewHistory: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartRecharge, onViewHistory }) => {
  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto">
          <Smartphone className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Recharge Internacional</h1>
          <p className="text-gray-600">Envie recargas para Haiti e República Dominicana</p>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <Globe className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">2 Países</p>
          <p className="text-xs text-gray-500">Haiti e Rep. Dominicana</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <CreditCard className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Reloadly</p>
          <p className="text-xs text-gray-500">Saldo pré-pago</p>
        </div>
      </div>

      {/* Main Actions */}
      <div className="space-y-4">
        <button
          onClick={onStartRecharge}
          className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-3">
            <Smartphone className="h-5 w-5" />
            <span className="font-semibold">Fazer Recarga</span>
          </div>
        </button>

        <button
          onClick={onViewHistory}
          className="w-full bg-white text-gray-700 py-4 px-6 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
        >
          <div className="flex items-center justify-center space-x-3">
            <History className="h-5 w-5" />
            <span className="font-semibold">Ver Histórico</span>
          </div>
        </button>
      </div>

      {/* Info Cards */}
      <div className="space-y-3">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-1">Operadoras Suportadas</h3>
          <p className="text-sm text-blue-700">
            <strong>Haiti:</strong> Digicel, Natcom<br/>
            <strong>Rep. Dominicana:</strong> Claro, Orange, Viva
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-1">Reembolso Automático</h3>
          <p className="text-sm text-green-700">Se a recarga falhar, devolvemos seu dinheiro automaticamente</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-1">Saldo Reloadly</h3>
          <p className="text-sm text-purple-700">
            🚨 MODO PRODUÇÃO: Recargas REAIS usando saldo pré-pago Reloadly
          </p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-1">Modo de Teste</h3>
          <p className="text-sm text-blue-700">
            🧪 PIX: Simulado (sem cobrança) | 📱 Reloadly: REAL (com saldo)
          </p>
        </div>
      </div>
    </div>
  );
};