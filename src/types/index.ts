export interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
  paymentMethods: string[];
}

export interface Operator {
  id: string;
  name: string;
  logoUrl: string;
  country: string;
  fxRate?: number;
  currencyCode?: string;
  denominations: number[];
  prefixes?: string[];
  minAmountBRL?: number;
  maxAmountBRL?: number;
  commission?: number;
}

export interface RechargeData {
  originCountry: string;
  phoneNumber: string;
  operator: string;
  amount: number;
  paymentMethod: string;
}

export interface Transaction {
  id: string;
  userId: string;
  phoneNumber: string;
  operator: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentMethod: string;
  dingconnectTransactionId?: string;
  paymentId?: string;
  refundId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DingConnectResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
  message?: string;
  isDeferred?: boolean;
  correlationId?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  error?: string;
  status?: string;
  message?: string;
}