import { HAITI_OPERATORS, DOMINICAN_REPUBLIC_OPERATORS } from '../constants/countries';

export const OPERATOR_PREFIXES = {
  HT: {
    DIGICEL: [
      // Móveis
      '30', '31', '34', '36', '37', '38', '39', '46', '47', '48',
      // Fixos (Porto-Príncipe)
      '28'
    ],
    NATCOM: [
      // Móveis
      '32', '33', '40', '41', '42', '43',
      // Fixos (Porto-Príncipe)
      '22', '25'
    ]
  },
  DO: {
    CLARO: ['809', '829', '849'],
    ORDO: ['809', '829', '849', '800'], // Altice (Orange)
    VVDO: ['809', '829', '849']
  }
};

export const detectOperatorFromPhone = (phoneNumber: string, country: 'HT' | 'DO' = 'HT'): string | null => {
  // Remove espaços, hífens e outros caracteres não numéricos
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Verifica se o número tem o tamanho correto
  const minLength = country === 'HT' ? 8 : 10;
  if (cleanNumber.length < minLength) {
    return null;
  }
  
  console.log('Detectando operadora para número:', phoneNumber, 'País:', country);
  console.log('Número limpo:', cleanNumber);
  
  if (country === 'HT') {
    // Haiti: primeiros 2 dígitos
    const prefix = cleanNumber.substring(0, 2);
    console.log('Prefixo Haiti extraído:', prefix);
    
    // Verifica se é Digicel
    if (OPERATOR_PREFIXES.HT.DIGICEL.includes(prefix)) {
      console.log('✅ Detectado como Digicel Haiti (prefixo:', prefix, ')');
      return 'D7HT'; // ID da Digicel DingConnect
    }
    
    // Verifica se é Natcom
    if (OPERATOR_PREFIXES.HT.NATCOM.includes(prefix)) {
      console.log('✅ Detectado como Natcom Haiti (prefixo:', prefix, ')');
      return 'NMHT'; // ID da Natcom DingConnect
    }
  } else if (country === 'DO') {
    // República Dominicana: primeiros 3 dígitos
    const prefix = cleanNumber.substring(0, 3);
    console.log('Prefixo República Dominicana extraído:', prefix);
    
    // Para República Dominicana, todos os operadores usam os mesmos códigos de área
    // Retornar o primeiro operador por padrão (será refinado com dados reais do DingConnect)
    if (OPERATOR_PREFIXES.DO.CLARO.includes(prefix) || 
        OPERATOR_PREFIXES.DO.ORDO.includes(prefix) || 
        OPERATOR_PREFIXES.DO.VVDO.includes(prefix)) {
      console.log('✅ Detectado como operadora República Dominicana (prefixo:', prefix, ')');
      return 'D8DO'; // Retorna Claro DingConnect
    }
  }
  
  console.log('❌ Operadora não detectada');
  
  return null;
};

export const getOperatorInfo = (operatorId: string) => {
  const allOperators = [...HAITI_OPERATORS, ...DOMINICAN_REPUBLIC_OPERATORS];
  const operator = allOperators.find(op => op.id === operatorId);
  if (!operator) return null;
  
  return {
    id: operator.id,
    name: operator.name,
    logo: getOperatorLogo(operator.id),
    country: operator.country,
    prefixes: operator.prefixes
  };
};

function getOperatorLogo(operatorId: string): string {
  const logoMap: { [key: string]: string } = {
    'D7HT': '📱', // Digicel Haiti BRL
    'NMHT': '📞', // Natcom Haiti
    'D8DO': '📱', // Claro Dominican Republic Data
    'ORDO': '🍊', // Altice (Orange) RD
    'VVDO': '💫' // Viva Dominican Republic
  };
  return logoMap[operatorId] || '📱';
}

export const formatPhoneNumber = (phoneNumber: string, country: 'HT' | 'DO' = 'HT'): string => {
  // Remove todos os caracteres não numéricos
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (country === 'HT') {
    // Haiti: XXXX-XXXX
    if (cleanNumber.length >= 8) {
      const first8 = cleanNumber.substring(0, 8);
      return `${first8.substring(0, 4)}-${first8.substring(4)}`;
    }
    if (cleanNumber.length >= 4) {
      return `${cleanNumber.substring(0, 4)}-${cleanNumber.substring(4)}`;
    }
  } else if (country === 'DO') {
    // República Dominicana: XXX-XXX-XXXX
    if (cleanNumber.length >= 10) {
      const first10 = cleanNumber.substring(0, 10);
      return `${first10.substring(0, 3)}-${first10.substring(3, 6)}-${first10.substring(6)}`;
    }
    if (cleanNumber.length >= 6) {
      return `${cleanNumber.substring(0, 3)}-${cleanNumber.substring(3, 6)}-${cleanNumber.substring(6)}`;
    }
    if (cleanNumber.length >= 3) {
      return `${cleanNumber.substring(0, 3)}-${cleanNumber.substring(3)}`;
    }
  }
  
  return cleanNumber;
};

export const isValidPhoneNumber = (phoneNumber: string, country: 'HT' | 'DO' = 'HT'): boolean => {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Verificar tamanho correto
  const expectedLength = country === 'HT' ? 8 : 10;
  if (cleanNumber.length !== expectedLength) {
    return false;
  }
  
  if (country === 'HT') {
    // Haiti: deve começar com um prefixo válido
    const prefix = cleanNumber.substring(0, 2);
    const allPrefixes = [
      ...OPERATOR_PREFIXES.HT.DIGICEL,
      ...OPERATOR_PREFIXES.HT.NATCOM
    ];
    return allPrefixes.includes(prefix);
  } else if (country === 'DO') {
    // República Dominicana: deve começar com código de área válido
    const prefix = cleanNumber.substring(0, 3);
    const allPrefixes = [
      ...OPERATOR_PREFIXES.DO.CLARO,
      ...OPERATOR_PREFIXES.DO.ORDO,
      ...OPERATOR_PREFIXES.DO.VVDO
    ];
    return allPrefixes.includes(prefix);
  }
  
  return false;
};