-- Create leads table for consultation prospects
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  assigned_to UUID REFERENCES users(id),
  assigned_doctor UUID REFERENCES users(id),
  assigned_staff UUID REFERENCES users(id),
  consultation_reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_consultation', 'completed', 'converted', 'cancelled', 'contacted', 'follow_up')),
  notes TEXT,
  consultation_date DATE,
  consultation_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_doctor ON leads(assigned_doctor);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_staff ON leads(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_leads_consultation_date ON leads(consultation_date);

-- Disable RLS for leads table
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
