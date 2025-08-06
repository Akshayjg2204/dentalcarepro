-- Create leads table for consultation prospects
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  assigned_to UUID REFERENCES users(id),
  consultation_reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_consultation', 'completed', 'converted', 'cancelled')),
  notes TEXT,
  consultation_date DATE,
  consultation_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_consultation_date ON leads(consultation_date);

-- Add RLS policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view all leads
CREATE POLICY "Users can view all leads" ON leads
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert leads
CREATE POLICY "Users can insert leads" ON leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update leads
CREATE POLICY "Users can update leads" ON leads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete leads
CREATE POLICY "Users can delete leads" ON leads
  FOR DELETE USING (auth.role() = 'authenticated');
