// Algoritmo de Luhn para validar números de cartão
export const validateCardNumber = (cardNumber: string): boolean => {
  // Remove espaços e caracteres não numéricos
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Deve ter entre 13 e 19 dígitos
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  // Algoritmo de Luhn
  let sum = 0;
  let isEven = false;
  
  // Processa da direita para esquerda
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Detecta o tipo de cartão baseado no número
export const getCardType = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Visa
  if (/^4/.test(cleanNumber)) {
    return 'visa';
  }
  
  // Mastercard
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
    return 'mastercard';
  }
  
  // American Express
  if (/^3[47]/.test(cleanNumber)) {
    return 'amex';
  }
  
  // Discover
  if (/^6/.test(cleanNumber)) {
    return 'discover';
  }
  
  // Diners Club
  if (/^3[0689]/.test(cleanNumber)) {
    return 'diners';
  }
  
  return 'unknown';
};

// Formatar número do cartão com espaços
export const formatCardNumber = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const cardType = getCardType(cleanNumber);
  
  // American Express: XXXX XXXXXX XXXXX
  if (cardType === 'amex') {
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  }
  
  // Outros cartões: XXXX XXXX XXXX XXXX
  return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
};

// Validar CVV baseado no tipo de cartão
export const validateCVV = (cvv: string, cardType: string): boolean => {
  const cleanCVV = cvv.replace(/\D/g, '');
  
  // American Express: 4 dígitos
  if (cardType === 'amex') {
    return cleanCVV.length === 4;
  }
  
  // Outros cartões: 3 dígitos
  return cleanCVV.length === 3;
};

// Validar data de expiração
export const validateExpiryDate = (expiry: string): boolean => {
  const cleanExpiry = expiry.replace(/\D/g, '');
  
  if (cleanExpiry.length !== 4) {
    return false;
  }
  
  const month = parseInt(cleanExpiry.substring(0, 2));
  const year = parseInt('20' + cleanExpiry.substring(2, 4));
  
  // Mês deve ser entre 1 e 12
  if (month < 1 || month > 12) {
    return false;
  }
  
  // Ano deve ser atual ou futuro
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }
  
  return true;
};

// Verificar se é um número de teste conhecido (para rejeitar)
export const isTestCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  const testNumbers = [
    '4242424242424242', // Visa teste
    '4000000000000002', // Visa teste - declined
    '4000000000000010', // Visa teste - address_line1_check fail
    '4000000000000028', // Visa teste - address_zip_check fail
    '4000000000000036', // Visa teste - address_zip_check and address_line1_check fail
    '4000000000000044', // Visa teste - address_line1_check unavailable
    '4000000000000101', // Visa teste - cvc_check fail
    '4000000000000341', // Visa teste - attaching this card to a Customer object succeeds, but attempts to charge the customer fail
    '4000000000000002', // Visa teste - generic decline
    '4000000000009995', // Visa teste - insufficient_funds decline
    '4000000000009987', // Visa teste - lost_card decline
    '4000000000009979', // Visa teste - stolen_card decline
    '4000000000000069', // Visa teste - expired_card decline
    '4000000000000127', // Visa teste - incorrect_cvc decline
    '4000000000000119', // Visa teste - processing_error decline
    '5555555555554444', // Mastercard teste
    '5200828282828210', // Mastercard teste - debit
    '5105105105105100', // Mastercard teste - prepaid
    '2223003122003222', // Mastercard teste
    '378282246310005',  // Amex teste
    '371449635398431',  // Amex teste
    '378734493671000',  // Amex teste - Corporate
    '6011111111111117', // Discover teste
    '6011000990139424', // Discover teste
    '30569309025904',   // Diners teste
    '3056930009020004', // Diners teste - 14 digit
    '5200828282828210', // Debit teste
    '4000056655665556', // Visa teste - debit
    '4242424242424242', // Visa teste - PRINCIPAL
    '4000000000000002', // Visa teste - declined
  ];
  
  return testNumbers.includes(cleanNumber);
};