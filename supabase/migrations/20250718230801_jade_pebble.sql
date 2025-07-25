/*
  # Add payment_method column to transactions table

  1. Changes
    - Add `payment_method` column to `transactions` table
    - Column is required (NOT NULL) with no default value
    - This matches the application's expected schema

  2. Notes
    - This resolves the "Could not find the 'paymentMethod' column" error
    - The column stores the payment method used for each transaction
*/

-- Add payment_method column to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payment_method text NOT NULL;
  END IF;
END $$;