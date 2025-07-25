import { Country } from '../types';

export const COUNTRIES: Country[] = [
  {
    code: 'BR',
    name: 'Brasil',
    currency: 'BRL',
    flag: '🇧🇷',
    paymentMethods: ['PIX']
  }
];

export const HAITI_OPERATORS = [
  {
    id: 'D7HT', // Digicel Haiti BRL
    name: 'Digicel Haiti BRL',
    logoUrl: '/logos/digicel.png',
    country: 'HT',
    fxRate: 1, // BRL direct
    currencyCode: 'BRL',
    denominations: [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200, 250], // BRL values
    prefixes: ['30', '31', '34', '36', '37', '38', '39', '46', '47', '48', '28'],
    minAmountBRL: 4.45, // Minimum amount in BRL
    maxAmountBRL: 278.00, // Maximum amount in BRL
    commission: 2, // 2% commission
    validationRegex: '^509([0-9]{8})$'
  },
  {
    id: 'NMHT', // Natcom Haiti
    name: 'Natcom Haiti',
    logoUrl: 'https://imagerepo.ding.com/logo/NM/HT.png',
    country: 'HT',
    fxRate: 1, // BRL direct
    currencyCode: 'BRL',
    denominations: [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200, 250, 300, 400, 500], // BRL values
    prefixes: ['32', '33', '40', '41', '42', '43', '22', '25'],
    minAmountBRL: 2.78, // Minimum amount in BRL
    maxAmountBRL: 552.53, // Maximum amount in BRL
    commission: 10, // 10% commission
    validationRegex: '^509([0-9]{8})$',
    customerCareNumber: '+50922228888'
  }
];

export const DOMINICAN_REPUBLIC_OPERATORS = [
  {
    id: 'D8DO', // Claro Dominican Republic Data
    name: 'Claro Dominican Republic Data',
    logoUrl: 'https://imagerepo.ding.com/logo/D8/DO.png',
    country: 'DO',
    fxRate: 1,
    currencyCode: 'BRL',
    denominations: [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200],
    prefixes: ['809', '829', '849'], // Códigos de área da República Dominicana
    minAmountBRL: 5.00,
    maxAmountBRL: 300.00,
    commission: 5,
    validationRegex: '^1(8(?:09|29|49|88)[0-9]{7})$',
    customerCareNumber: '+1 809 220 11111'
  },
  {
    id: 'ORDO', // Orange (Altice) Dominican Republic
    name: 'Altice (Orange) Dominican Republic',
    logoUrl: 'https://imagerepo.ding.com/logo/OR/DO.png',
    country: 'DO',
    fxRate: 1,
    currencyCode: 'BRL',
    denominations: [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200],
    prefixes: ['809', '829', '849'],
    minAmountBRL: 5.00,
    maxAmountBRL: 300.00,
    commission: 5,
    validationRegex: '^18(?:09|29|49|88|00)[0-9]{7}$',
    customerCareNumber: '+1 (809) 859-6555'
  },
  {
    id: 'VVDO', // Viva Dominican Republic
    name: 'Viva Dominican Republic',
    logoUrl: 'https://imagerepo.ding.com/logo/VV/DO.png',
    country: 'DO',
    fxRate: 1,
    currencyCode: 'BRL',
    denominations: [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200],
    prefixes: ['809', '829', '849'],
    minAmountBRL: 5.00,
    maxAmountBRL: 300.00,
    commission: 5,
    validationRegex: '^1(8(?:09|29|49|88)[0-9]{7})$',
    customerCareNumber: '+ 1 809 503 75 00'
  }
];

// Combinar todas as operadoras
export const ALL_OPERATORS = [
  ...HAITI_OPERATORS,
  ...DOMINICAN_REPUBLIC_OPERATORS
];

export const CURRENCY_SYMBOLS = {
  'BRL': 'R$',
  'CLP': 'CLP$',
  'EUR': '€',
  'MXN': 'MX$',
  'CAD': 'C$',
  'USD': '$',
  'ARS': 'AR$',
  'COP': 'CO$',
  'PEN': 'S/',
  'UYU': 'UY$',
  'PYG': '₲',
  'BOB': 'Bs',
  'VES': 'Bs.S',
  'GTQ': 'Q',
  'CRC': '₡',
  'PAB': 'B/.',
  'NIO': 'C$',
  'HNL': 'L',
  'BZD': 'BZ$',
  'CUP': '₱',
  'DOP': 'RD$',
  'JMD': 'J$',
  'TTD': 'TT$',
  'BBD': 'Bds$',
  'BSD': 'B$',
  'GBP': '£',
  'CHF': 'CHF',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'AUD': 'A$',
  'NZD': 'NZ$',
  'JPY': '¥',
  'KRW': '₩',
  'SGD': 'S$',
  'HKD': 'HK$',
  'MYR': 'RM',
  'THB': '฿',
  'PHP': '₱',
  'IDR': 'Rp',
  'VND': '₫',
  'INR': '₹',
  'CNY': '¥',
  'RUB': '₽',
  'TRY': '₺',
  'ZAR': 'R',
  'NGN': '₦',
  'KES': 'KSh',
  'GHS': '₵',
  'EGP': '£',
  'MAD': 'د.م.',
  'DZD': 'د.ج',
  'TND': 'د.ت',
  'ILS': '₪',
  'AED': 'د.إ',
  'SAR': '﷼'
};

// Taxas de câmbio aproximadas (USD para moeda local)
export const EXCHANGE_RATES = {
  'BRL': 5.20,    // 1 USD = 5.20 BRL
  'CLP': 950,     // 1 USD = 950 CLP
  'EUR': 0.92,    // 1 USD = 0.92 EUR
  'MXN': 17.50,   // 1 USD = 17.50 MXN
  'CAD': 1.35,    // 1 USD = 1.35 CAD
  'USD': 1.00,    // 1 USD = 1.00 USD
  'ARS': 350,     // 1 USD = 350 ARS
  'COP': 4200,    // 1 USD = 4200 COP
  'PEN': 3.75,    // 1 USD = 3.75 PEN
  'UYU': 39,      // 1 USD = 39 UYU
  'PYG': 7300,    // 1 USD = 7300 PYG
  'BOB': 6.90,    // 1 USD = 6.90 BOB
  'VES': 36,      // 1 USD = 36 VES
  'GTQ': 7.80,    // 1 USD = 7.80 GTQ
  'CRC': 520,     // 1 USD = 520 CRC
  'PAB': 1.00,    // 1 USD = 1.00 PAB
  'NIO': 36.50,   // 1 USD = 36.50 NIO
  'HNL': 24.70,   // 1 USD = 24.70 HNL
  'BZD': 2.00,    // 1 USD = 2.00 BZD
  'CUP': 24,      // 1 USD = 24 CUP
  'DOP': 56,      // 1 USD = 56 DOP
  'JMD': 155,     // 1 USD = 155 JMD
  'TTD': 6.75,    // 1 USD = 6.75 TTD
  'BBD': 2.00,    // 1 USD = 2.00 BBD
  'BSD': 1.00,    // 1 USD = 1.00 BSD
  'GBP': 0.79,    // 1 USD = 0.79 GBP
  'CHF': 0.88,    // 1 USD = 0.88 CHF
  'SEK': 10.80,   // 1 USD = 10.80 SEK
  'NOK': 10.90,   // 1 USD = 10.90 NOK
  'DKK': 6.85,    // 1 USD = 6.85 DKK
  'AUD': 1.52,    // 1 USD = 1.52 AUD
  'NZD': 1.65,    // 1 USD = 1.65 NZD
  'JPY': 150,     // 1 USD = 150 JPY
  'KRW': 1320,    // 1 USD = 1320 KRW
  'SGD': 1.35,    // 1 USD = 1.35 SGD
  'HKD': 7.80,    // 1 USD = 7.80 HKD
  'MYR': 4.70,    // 1 USD = 4.70 MYR
  'THB': 36,      // 1 USD = 36 THB
  'PHP': 56,      // 1 USD = 56 PHP
  'IDR': 15800,   // 1 USD = 15800 IDR
  'VND': 24500,   // 1 USD = 24500 VND
  'INR': 83,      // 1 USD = 83 INR
  'CNY': 7.25,    // 1 USD = 7.25 CNY
  'RUB': 92,      // 1 USD = 92 RUB
  'TRY': 29,      // 1 USD = 29 TRY
  'ZAR': 18.50,   // 1 USD = 18.50 ZAR
  'NGN': 780,     // 1 USD = 780 NGN
  'KES': 150,     // 1 USD = 150 KES
  'GHS': 12,      // 1 USD = 12 GHS
  'EGP': 31,      // 1 USD = 31 EGP
  'MAD': 10.20,   // 1 USD = 10.20 MAD
  'DZD': 135,     // 1 USD = 135 DZD
  'TND': 3.10,    // 1 USD = 3.10 TND
  'ILS': 3.70,    // 1 USD = 3.70 ILS
  'AED': 3.67,    // 1 USD = 3.67 AED
  'SAR': 3.75     // 1 USD = 3.75 SAR
};

// Valores de recarga base em USD
const BASE_RECHARGE_VALUES_USD = [1, 2, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100];

// Função para converter USD para moeda local e arredondar para valores amigáveis
export const getRechargeValuesForCurrency = (currency: string): number[] => {
  // Valores específicos para o Brasil em BRL
  if (currency === 'BRL') {
    return [5, 10, 15, 20, 25, 30, 35, 50, 75, 100];
  }
  
  const exchangeRate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1;
  
  return BASE_RECHARGE_VALUES_USD.map(usdValue => {
    const localValue = usdValue * exchangeRate;
    
    // Arredondamento inteligente baseado na moeda
    if (currency === 'JPY' || currency === 'KRW' || currency === 'IDR' || currency === 'VND' || 
        currency === 'CLP' || currency === 'PYG' || currency === 'COP' || currency === 'NGN') {
      // Moedas sem decimais - arredondar para centenas ou milhares
      if (localValue >= 10000) {
        return Math.round(localValue / 1000) * 1000;
      } else if (localValue >= 1000) {
        return Math.round(localValue / 100) * 100;
      } else {
        return Math.round(localValue / 10) * 10;
      }
    } else if (currency === 'EUR' || currency === 'GBP' || currency === 'CHF') {
      // Moedas fortes - manter precisão decimal
      return Math.round(localValue * 2) / 2; // Arredondar para 0.50
    } else {
      // Outras moedas - arredondar para inteiros ou 0.50
      if (localValue >= 100) {
        return Math.round(localValue);
      } else {
        return Math.round(localValue * 2) / 2;
      }
    }
  });
};

// Taxa de lucro ajustável por moeda (valor fixo de 2.50 na moeda local)
export const PROFIT_MARGIN_FEE = {
  'BRL': 0.40,  // 40% do valor da recarga
  'CLP': 10.50,  // CLP$ 2,50
  'EUR': 2.50,  // € 2,50
  'MXN': 2.50,  // MX$ 2,50
  'CAD': 2.50,  // C$ 2,50
  'USD': 2.50,  // $ 2,50
  'ARS': 2.50,  // AR$ 2,50
  'COP': 2.50,  // CO$ 2,50
  'PEN': 2.50,  // S/ 2,50
  'UYU': 2.50,  // UY$ 2,50
  'PYG': 2.50,  // ₲ 2,50
  'BOB': 2.50,  // Bs 2,50
  'VES': 2.50,  // Bs.S 2,50
  'GTQ': 2.50,  // Q 2,50
  'CRC': 2.50,  // ₡ 2,50
  'PAB': 2.50,  // B/. 2,50
  'NIO': 2.50,  // C$ 2,50
  'HNL': 2.50,  // L 2,50
  'BZD': 2.50,  // BZ$ 2,50
  'CUP': 2.50,  // ₱ 2,50
  'DOP': 2.50,  // RD$ 2,50
  'JMD': 2.50,  // J$ 2,50
  'TTD': 2.50,  // TT$ 2,50
  'BBD': 2.50,  // Bds$ 2,50
  'BSD': 2.50,  // B$ 2,50
  'GBP': 2.50,  // £ 2,50
  'CHF': 2.50,  // CHF 2,50
  'SEK': 2.50,  // kr 2,50
  'NOK': 2.50,  // kr 2,50
  'DKK': 2.50,  // kr 2,50
  'AUD': 2.50,  // A$ 2,50
  'NZD': 2.50,  // NZ$ 2,50
  'JPY': 2.50,  // ¥ 2,50
  'KRW': 2.50,  // ₩ 2,50
  'SGD': 2.50,  // S$ 2,50
  'HKD': 2.50,  // HK$ 2,50
  'MYR': 2.50,  // RM 2,50
  'THB': 2.50,  // ฿ 2,50
  'PHP': 2.50,  // ₱ 2,50
  'IDR': 2.50,  // Rp 2,50
  'VND': 2.50,  // ₫ 2,50
  'INR': 2.50,  // ₹ 2,50
  'CNY': 2.50,  // ¥ 2,50
  'RUB': 2.50,  // ₽ 2,50
  'TRY': 2.50,  // ₺ 2,50
  'ZAR': 2.50,  // R 2,50
  'NGN': 2.50,  // ₦ 2,50
  'KES': 2.50,  // KSh 2,50
  'GHS': 2.50,  // ₵ 2,50
  'EGP': 2.50,  // £ 2,50
  'MAD': 2.50,  // د.م. 2,50
  'DZD': 2.50,  // د.ج 2,50
  'TND': 2.50,  // د.ت 2,50
  'ILS': 2.50,  // ₪ 2,50
  'AED': 2.50,  // د.إ 2,50
  'SAR': 2.50   // ﷼ 2,50
};

// Função para obter a taxa de lucro por moeda
export const getProfitMarginFee = (currency: string, amount: number = 0): number => {
  if (currency === 'BRL') {
    // Para BRL, usar 40% do valor da recarga
    return Math.round(amount * 0.40 * 100) / 100;
  }
  // Para outras moedas, manter valor fixo
  return PROFIT_MARGIN_FEE[currency as keyof typeof PROFIT_MARGIN_FEE] || 2.50;
};

// Helper function to get currency for a country
export const getCurrencyForCountry = (countryCode: string): string => {
  const currencyMap: { [key: string]: string } = {
    'BR': 'BRL',
    'CL': 'CLP',
    'FR': 'EUR',
    'MX': 'MXN',
    'CA': 'CAD',
    'US': 'USD',
    'AR': 'ARS',
    'CO': 'COP',
    'PE': 'PEN',
    'EC': 'USD',
    'UY': 'UYU',
    'PY': 'PYG',
    'BO': 'BOB',
    'VE': 'VES',
    'GT': 'GTQ',
    'CR': 'CRC',
    'PA': 'PAB',
    'NI': 'NIO',
    'HN': 'HNL',
    'SV': 'USD',
    'BZ': 'BZD',
    'CU': 'CUP',
    'DO': 'DOP',
    'JM': 'JMD',
    'TT': 'TTD',
    'BB': 'BBD',
    'BS': 'BSD',
    'GB': 'GBP',
    'DE': 'EUR',
    'IT': 'EUR',
    'ES': 'EUR',
    'PT': 'EUR',
    'NL': 'EUR',
    'BE': 'EUR',
    'CH': 'CHF',
    'AT': 'EUR',
    'SE': 'SEK',
    'NO': 'NOK',
    'DK': 'DKK',
    'FI': 'EUR',
    'AU': 'AUD',
    'NZ': 'NZD',
    'JP': 'JPY',
    'KR': 'KRW',
    'SG': 'SGD',
    'HK': 'HKD',
    'MY': 'MYR',
    'TH': 'THB',
    'PH': 'PHP',
    'ID': 'IDR',
    'VN': 'VND',
    'IN': 'INR',
    'CN': 'CNY',
    'RU': 'RUB',
    'TR': 'TRY',
    'ZA': 'ZAR',
    'NG': 'NGN',
    'KE': 'KES',
    'GH': 'GHS',
    'EG': 'EGP',
    'MA': 'MAD',
    'DZ': 'DZD',
    'TN': 'TND',
    'IL': 'ILS',
    'AE': 'AED',
    'SA': 'SAR'
  };
  return currencyMap[countryCode] || 'USD';
};