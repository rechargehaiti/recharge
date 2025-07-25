import { createClient } from '@supabase/supabase-js';
import { Transaction } from '../types';

// Supabase configuration with fallback for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Log current configuration for debugging
console.log('🔧 Supabase Configuration:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT_SET',
  keyPreview: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT_SET',
  isValidUrl: supabaseUrl && supabaseUrl.includes('.supabase.co'),
  isValidKey: supabaseKey && supabaseKey.startsWith('eyJ')
});

// Check if Supabase is properly configured
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isSupabaseConfigured = supabaseUrl && supabaseKey && 
  isValidUrl(supabaseUrl) &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' && 
  supabaseUrl !== 'your_supabase_url' &&
  supabaseKey !== 'your-supabase-anon-key' &&
  supabaseKey !== 'your_supabase_anon_key' &&
  supabaseKey.startsWith('eyJ'); // Supabase anon keys start with eyJ

if (!isSupabaseConfigured) {
  console.error('🚨 Supabase não está configurado corretamente!');
  console.error('📋 Para configurar:');
  console.error('1. Acesse seu projeto no Supabase Dashboard');
  console.error('2. Vá em Settings → API');
  console.error('3. Copie a URL do projeto e a chave anônima');
  console.error('4. Configure no arquivo .env:');
  console.error('   VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=eyJ...');
  console.error('5. Reinicie o servidor de desenvolvimento');
}

// Create client only if properly configured
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

// Helper function to check if Supabase is available
const checkSupabaseConnection = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não está configurado. Clique em "Connect to Supabase" no topo da aplicação.');
  }
  if (!supabase) {
    throw new Error('Cliente Supabase não foi inicializado corretamente.');
  }
};

export const supabaseService = {
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    try {
      checkSupabaseConnection();
      
      // Verificar se já existe uma transação com o mesmo payment_id para evitar duplicatas
      if (transaction.paymentId) {
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('payment_id', transaction.paymentId)
          .limit(1);
          
        if (existingTransaction && existingTransaction.length > 0) {
          console.log('⚠️ Transação já existe com payment_id:', transaction.paymentId);
          throw new Error('Transação duplicada detectada');
        }
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: transaction.userId,
          phone_number: transaction.phoneNumber,
          operator: transaction.operator,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          payment_method: transaction.paymentMethod,
          dingconnect_transaction_id: transaction.dingconnectTransactionId,
          payment_id: transaction.paymentId,
          refund_id: transaction.refundId,
          error_message: transaction.errorMessage,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return this.mapDatabaseToTransaction(data);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    try {
      checkSupabaseConnection();
      
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      // Map camelCase to snake_case
      if (updates.userId) dbUpdates.user_id = updates.userId;
      if (updates.phoneNumber) dbUpdates.phone_number = updates.phoneNumber;
      if (updates.operator) dbUpdates.operator = updates.operator;
      if (updates.amount) dbUpdates.amount = updates.amount;
      if (updates.currency) dbUpdates.currency = updates.currency;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.paymentMethod) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.dingconnectTransactionId) dbUpdates.dingconnect_transaction_id = updates.dingconnectTransactionId;
      if (updates.paymentId) dbUpdates.payment_id = updates.paymentId;
      if (updates.refundId) dbUpdates.refund_id = updates.refundId;
      if (updates.errorMessage) dbUpdates.error_message = updates.errorMessage;
      
      const { data, error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.mapDatabaseToTransaction(data);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  },

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    try {
      checkSupabaseConnection();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapDatabaseToTransaction);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      checkSupabaseConnection();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return this.mapDatabaseToTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  },

  // Map database snake_case to TypeScript camelCase
  mapDatabaseToTransaction(dbData: any): Transaction {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      phoneNumber: dbData.phone_number,
      operator: dbData.operator,
      amount: dbData.amount,
      currency: dbData.currency,
      status: dbData.status,
      paymentMethod: dbData.payment_method,
      dingconnectTransactionId: dbData.dingconnect_transaction_id,
      paymentId: dbData.payment_id,
      refundId: dbData.refund_id,
      errorMessage: dbData.error_message,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  },
  // Check if Supabase is properly configured
  isConfigured(): boolean {
    return isSupabaseConfigured;
  }
};

export { isSupabaseConfigured };