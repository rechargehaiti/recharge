import React, { useEffect } from 'react';
import { detectOperatorFromPhone, formatPhoneNumber, isValidPhoneNumber } from '../utils/operatorDetection';

interface PhoneInputProps {
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
  onOperatorDetected?: (operatorId: string) => void;
  selectedCountry?: 'HT' | 'DO';
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  phoneNumber,
  onPhoneChange,
  onOperatorDetected,
  selectedCountry = 'HT'
}) => {
  // Usar useEffect com dependências corretas para evitar loop infinito
  useEffect(() => {
    if (phoneNumber.length >= 8 && onOperatorDetected) {
      const detectedOperator = detectOperatorFromPhone(phoneNumber, selectedCountry);
      if (detectedOperator) {
        onOperatorDetected(detectedOperator);
      }
    }
  }, [phoneNumber, selectedCountry]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove todos os caracteres não numéricos
    const cleanValue = value.replace(/\D/g, '');
    
    // Limites baseados no país
    const maxLength = selectedCountry === 'HT' ? 8 : 10; // Haiti: 8 dígitos, RD: 10 dígitos
    
    if (cleanValue.length <= maxLength) {
      // Formatar baseado no país
      if (selectedCountry === 'HT' && cleanValue.length > 4) {
        // Haiti: XXXX-XXXX
        const formatted = `${cleanValue.substring(0, 4)}-${cleanValue.substring(4, 8)}`;
        onPhoneChange(formatted);
      } else if (selectedCountry === 'DO' && cleanValue.length > 3) {
        // República Dominicana: XXX-XXX-XXXX
        if (cleanValue.length > 6) {
          const formatted = `${cleanValue.substring(0, 3)}-${cleanValue.substring(3, 6)}-${cleanValue.substring(6, 10)}`;
          onPhoneChange(formatted);
        } else {
          const formatted = `${cleanValue.substring(0, 3)}-${cleanValue.substring(3)}`;
          onPhoneChange(formatted);
        }
      } else {
        onPhoneChange(cleanValue);
      }
    }
  };

  const isValid = isValidPhoneNumber(phoneNumber, selectedCountry);
  const detectedOperator = detectOperatorFromPhone(phoneNumber, selectedCountry);
  
  const getCountryInfo = () => {
    if (selectedCountry === 'HT') {
      return {
        flag: '🇭🇹',
        code: '+509',
        name: 'Haiti',
        placeholder: '4842-4337',
        digits: 8
      };
    } else {
      return {
        flag: '🇩🇴',
        code: '+1',
        name: 'República Dominicana',
        placeholder: '809-123-4567',
        digits: 10
      };
    }
  };
  
  const countryInfo = getCountryInfo();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        Número de destino - {countryInfo.name}
      </h3>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium text-gray-700">
            {countryInfo.flag} {countryInfo.code}
          </span>
          <input
            type="text"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={countryInfo.placeholder}
            className={`flex-1 p-3 rounded-lg border-2 focus:outline-none transition-colors ${
              phoneNumber.length === 0
                ? 'border-gray-200 focus:border-blue-500'
                : isValid
                ? 'border-green-500 focus:border-green-600 bg-green-50'
                : 'border-red-500 focus:border-red-600 bg-red-50'
            }`}
          />
        </div>
        
        <p className="text-sm text-gray-600">
          Digite apenas os {countryInfo.digits} dígitos do número (sem {countryInfo.code})
        </p>
      </div>

      {/* Status do número */}
      {phoneNumber.length > 0 && (
        <div className="space-y-2">
          {phoneNumber.replace(/\D/g, '').length < countryInfo.digits && (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              ⏳ Digite {countryInfo.digits - phoneNumber.replace(/\D/g, '').length} dígito(s) restante(s)
            </div>
          )}
          
          {phoneNumber.replace(/\D/g, '').length >= countryInfo.digits && isValid && (
            <div className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">
              ✅ Número válido: {countryInfo.code} {formatPhoneNumber(phoneNumber, selectedCountry)}
              {detectedOperator && (
                <div className="mt-1 font-medium">
                  📱 Operadora detectada: {getOperatorName(detectedOperator)}
                </div>
              )}
            </div>
          )}
          
          {phoneNumber.replace(/\D/g, '').length >= countryInfo.digits && !isValid && (
            <div className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
              ❌ Número inválido para {countryInfo.name}
              {selectedCountry === 'HT' && (
                <div className="mt-1">
                  <div><strong>Digicel:</strong> 30, 31, 34, 36, 37, 38, 39, 46, 47, 48, 28</div>
                  <div><strong>Natcom:</strong> 32, 33, 40, 41, 42, 43, 22, 25</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Exemplos de números válidos */}
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Exemplos de números válidos:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          {selectedCountry === 'HT' ? (
            <>
              <div><strong>Digicel:</strong> 4842-4337, 3012-3456, 4678-9012</div>
              <div><strong>Natcom:</strong> 3223-4567, 4012-3456, 2212-3456</div>
            </>
          ) : (
            <>
              <div><strong>Claro:</strong> 809-123-4567, 829-987-6543</div>
              <div><strong>Orange:</strong> 809-555-1234, 849-777-8888</div>
              <div><strong>Viva:</strong> 829-444-5555, 849-666-7777</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get operator name
function getOperatorName(operatorId: string): string {
  const allOperators = [
    { id: 'D7HT', name: 'Digicel Haiti BRL' },
    { id: 'NMHT', name: 'Natcom Haiti' },
    { id: 'D8DO', name: 'Claro Dominican Republic Data' },
    { id: 'ORDO', name: 'Altice (Orange) Dominican Republic' },
    { id: 'VVDO', name: 'Viva Dominican Republic' }
  ];
  
  const operator = allOperators.find(op => op.id === operatorId);
  return operator?.name || 'Operadora desconhecida';
};