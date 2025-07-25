import React from 'react';
import { Globe } from 'lucide-react';

interface CountryDestinationSelectorProps {
  selectedCountry: 'HT' | 'DO';
  onCountryChange: (country: 'HT' | 'DO') => void;
}

export const CountryDestinationSelector: React.FC<CountryDestinationSelectorProps> = ({
  selectedCountry,
  onCountryChange
}) => {
  const countries = [
    {
      code: 'HT' as const,
      name: 'Haiti',
      flag: '🇭🇹',
      phoneCode: '+509',
      operators: ['Digicel', 'Natcom'],
      description: 'Recargas para operadoras haitianas'
    },
    {
      code: 'DO' as const,
      name: 'República Dominicana',
      flag: '🇩🇴',
      phoneCode: '+1',
      operators: ['Claro', 'Orange', 'Viva'],
      description: 'Recargas para operadoras dominicanas'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Globe className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">País de destino</h3>
      </div>
      
      <p className="text-sm text-gray-600">
        Escolha o país para onde deseja enviar a recarga
      </p>
      
      <div className="space-y-3">
        {countries.map((country) => (
          <button
            key={country.code}
            onClick={() => onCountryChange(country.code)}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedCountry === country.code
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-4">
              <span className="text-3xl">{country.flag}</span>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-lg">{country.name}</h4>
                  <span className="text-sm text-gray-500">{country.phoneCode}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {country.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {country.operators.map((operator) => (
                    <span
                      key={operator}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                    >
                      {operator}
                    </span>
                  ))}
                </div>
              </div>
              {selectedCountry === country.code && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>Dica:</strong> Você pode enviar recargas para ambos os países usando seu saldo DingConnect.
          As operadoras serão carregadas automaticamente baseado no país selecionado.
        </p>
      </div>
    </div>
  );
};