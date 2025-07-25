import React from 'react';
import { CreditCard, Smartphone } from 'lucide-react';
import { COUNTRIES } from '../constants/countries';

interface PaymentMethodProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  country: string;
}

export const PaymentMethod: React.FC<PaymentMethodProps> = ({
  selectedMethod,
  onMethodChange,
  country
}) => {
  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const paymentMethods = selectedCountry?.paymentMethods || [];

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <Smartphone className="h-6 w-6" />;
      case 'CARD':
        return <CreditCard className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'PIX':
        return 'PIX';
      case 'CARD':
        return 'Cartão de Crédito';
      case 'LOCAL':
        return 'Método Local';
      case 'SEPA':
        return 'SEPA';
      case 'OXXO':
        return 'OXXO';
      case 'INTERAC':
        return 'Interac';
      case 'ACH':
        return 'ACH';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Método de pagamento</h3>
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <button
            key={method}
            onClick={() => onMethodChange(method)}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedMethod === method
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              {getMethodIcon(method)}
              <div className="text-left">
                <div className="font-medium">{getMethodName(method)}</div>
                <div className="text-sm text-gray-500">
                  {method === 'PIX' && 'Pagamento instantâneo'}
                  {method === 'CARD' && 'Visa, Mastercard, etc.'}
                  {method === 'LOCAL' && 'Métodos locais do país'}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};