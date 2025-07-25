import React from 'react';
import { ChevronDown } from 'lucide-react';
import { COUNTRIES } from '../constants/countries';

interface CountrySelectorProps {
  selectedCountry: string;
  onCountryChange: (country: string) => void;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onCountryChange
}) => {
  // Auto-select Brazil if no country is selected
  React.useEffect(() => {
    if (!selectedCountry) {
      onCountryChange('BR');
    }
  }, [selectedCountry, onCountryChange]);

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">País de origem</h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🇧🇷</span>
          <div>
            <div className="font-semibold text-blue-800">Brasil</div>
            <div className="text-sm text-blue-600">
              Moeda: BRL (Real)
            </div>
            <div className="text-xs text-blue-500 mt-1">
              Método: PIX (Instantâneo)
            </div>
          </div>
        </div>
        <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800">
          ✅ <strong>PIX:</strong> Pagamento instantâneo e sem taxas bancárias
        </div>
      </div>
    </div>
  );
};