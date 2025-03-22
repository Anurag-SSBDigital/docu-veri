/*
  # Document Verification System Schema

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `file_path` (text)
      - `status` (enum: pending, verified, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `feedback` (text, nullable)

  2. Security
    - Enable RLS on `documents` table
    - Add policies for users to:
      - Read their own documents
      - Create new documents
      - Update their own documents
*/

-- Create enum type for document status
CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected');

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    file_path text NOT NULL,
    status document_status DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    feedback text,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'verified', 'rejected'))
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own documents"
    ON documents
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create documents"
    ON documents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
    ON documents
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();