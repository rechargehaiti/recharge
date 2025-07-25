/*
  # Rename reloadly_transaction_id to dingconnect_transaction_id

  1. Schema Changes
    - Rename column `reloadly_transaction_id` to `dingconnect_transaction_id` in transactions table
    - Maintain all existing data and constraints
    - Update any indexes or references

  2. Data Migration
    - All existing data will be preserved
    - Column type and constraints remain the same
*/

-- Rename the column from reloadly_transaction_id to dingconnect_transaction_id
ALTER TABLE transactions 
RENAME COLUMN reloadly_transaction_id TO dingconnect_transaction_id;