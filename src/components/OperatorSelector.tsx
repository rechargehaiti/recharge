import React from 'react';
import { ALL_OPERATORS } from '../constants/countries';
import { getOperatorInfo } from '../utils/operatorDetection';

interface OperatorSelectorProps {
  selectedOperator: string;
  onOperatorChange: (operator: string) => void;
  detectedOperator?: string | null;
  selectedCountry?: 'HT' | 'DO';
}

export const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  selectedOperator,
  onOperatorChange,
  detectedOperator,
  selectedCountry = 'HT'
}) => {
  // Filtrar operadoras baseado no país selecionado
  const availableOperators = ALL_OPERATORS.filter(op => op.country === selectedCountry);
  
  const getOperatorIcon = (operatorId: string) => {
    const info = getOperatorInfo(operatorId);
    return info?.logo || '📱';
  };

  const isDetected = (operatorId: string) => {
    return detectedOperator === operatorId;
  };
  
  const getCountryName = () => {
    return selectedCountry === 'HT' ? 'Haiti' : 'República Dominicana';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Escolha a operadora - {getCountryName()}
        </h3>
        {detectedOperator && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            Auto-detectada
          </span>
        )}
      </div>
      
      <div className={`grid gap-3 ${availableOperators.length <= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {availableOperators.map((operator) => (
          <button
            key={operator.id}
            onClick={() => onOperatorChange(operator.id)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 relative ${
              selectedOperator === operator.id
                ? 'border-green-500 bg-green-50 text-green-700'
                : isDetected(operator.id)
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isDetected(operator.id) && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg">{getOperatorIcon(operator.id)}</span>
              </div>
              <div className="text-left">
                <div className="font-medium">{operator.name}</div>
                <div className="text-sm text-gray-500">
                  {isDetected(operator.id) ? 'Detectada automaticamente' : getCountryName()}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {detectedOperator && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> A operadora foi detectada automaticamente baseada no prefixo do número.
            Você pode escolher uma diferente se necessário.
          </p>
        </div>
      )}
      
      {availableOperators.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Nenhuma operadora disponível para {getCountryName()}.
            Aguarde a configuração das operadoras.
          </p>
        </div>
      )}
    </div>
  );
};