/*
  # Create transactions table for Recharge Haiti

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (text, user identifier)
      - `phone_number` (text, destination phone number)
      - `operator` (text, operator name)
      - `amount` (decimal, recharge amount)
      - `currency` (text, currency code)
      - `status` (text, transaction status)
      - `payment_method` (text, payment method used)
      - `reloadly_transaction_id` (text, optional)
      - `payment_id` (text, optional)
      - `refund_id` (text, optional)
      - `error_message` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `transactions` table
    - Add policy for users to read their own transactions
    - Add policy for authenticated users to create transactions
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  phone_number text NOT NULL,
  operator text NOT NULL,
  amount decimal NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  reloadly_transaction_id text,
  payment_id text,
  refund_id text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);