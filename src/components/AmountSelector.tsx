import React from 'react';
import { ALL_OPERATORS, CURRENCY_SYMBOLS, getProfitMarginFee, getRechargeValuesForCurrency, EXCHANGE_RATES } from '../constants/countries';

interface AmountSelectorProps {
  selectedAmount: number;
  onAmountChange: (amount: number) => void;
  operator: string;
  currency: string;
}

export const AmountSelector: React.FC<AmountSelectorProps> = ({
  selectedAmount,
  onAmountChange,
  operator,
  currency
}) => {
  const selectedOperator = ALL_OPERATORS.find(op => op.id === operator);
  
  // Filter denominations based on operator support and currency conversion
  const allDenominations = getRechargeValuesForCurrency(currency);
  const exchangeRate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1;
  
  // Filter amounts based on operator limits and valid USD conversions
  const denominations = allDenominations.filter(amount => {
    if (selectedOperator) {
      if (currency === 'BRL') {
        // Check operator-specific BRL limits for Brazil
        const minBRL = selectedOperator.minAmountBRL || 2.78;
        const maxBRL = selectedOperator.maxAmountBRL || 552.53;
        if (amount < minBRL || amount > maxBRL) {
          return false;
        }
      } else {
        // For international currencies, convert to BRL and check limits
        const brlAmount = Math.round(amount * exchangeRate * 100) / 100;
        const minBRL = selectedOperator.minAmountBRL || 2.78;
        const maxBRL = selectedOperator.maxAmountBRL || 552.53;
        if (brlAmount < minBRL || brlAmount > maxBRL) {
          return false;
        }
      }
    }
    return true;
  });
  
  const currencySymbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || '$';
  const profitFee = getProfitMarginFee(currency, selectedAmount);
  const totalAmount = selectedAmount > 0 ? selectedAmount + profitFee : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Valor da recarga</h3>
      <p className="text-sm text-gray-600">
        Valores em {currency} (moeda local)
      </p>
      <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
        {denominations.map((amount) => (
          <button
            key={amount}
            onClick={() => onAmountChange(amount)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedAmount === amount
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-center">
              <div className="font-bold text-lg">{currencySymbol}{amount.toLocaleString()}</div>
              <div className="text-sm text-gray-500">{currency}</div>
            </div>
          </button>
        ))}
      </div>
      
      {selectedAmount > 0 && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-blue-700">
                <strong>Valor da recarga:</strong> {currencySymbol}{selectedAmount.toLocaleString()} {currency}
              </p>
              {selectedOperator && (
                <p className="text-xs text-blue-600">
                  Limites BRL: R$ {selectedOperator.minAmountBRL} - R$ {selectedOperator.maxAmountBRL} • Comissão: {selectedOperator.commission}%
                </p>
              )}
            </div>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Recarga:</span>
                <span className="font-medium">{currencySymbol}{selectedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxa de serviço:</span>
                <span className="font-medium text-green-600">+{currencySymbol}{profitFee.toFixed(2)} (40%)</span>
              </div>
              <hr className="border-green-200" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-green-800">Total a pagar:</span>
                <span className="text-green-800">{currencySymbol}{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {selectedAmount === 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Selecione um valor para ver o total com taxa de serviço
          </p>
        </div>
      )}
    </div>
  );
};