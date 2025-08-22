-- Billing Records Management System
-- This script sets up comprehensive billing and payment tracking

-- Create billing_records table
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
    
    -- Bill details
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Financial information
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Status and metadata
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    payment_method VARCHAR(50),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_amounts CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        discount_amount >= 0 AND 
        total_amount >= 0 AND 
        paid_amount >= 0 AND 
        balance_amount >= 0
    ),
    CONSTRAINT valid_balance CHECK (balance_amount = total_amount - paid_amount)
);

-- Create billing_items table for itemized billing
CREATE TABLE IF NOT EXISTS billing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Metadata
    item_type VARCHAR(50) DEFAULT 'service', -- service, medication, equipment, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_billing_values CHECK (
        quantity > 0 AND 
        unit_price >= 0 AND 
        total_price >= 0
    ),
    CONSTRAINT valid_total_price CHECK (total_price = quantity * unit_price)
);

-- Create payment_records table
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    
    -- Status and notes
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_payment_amount CHECK (amount > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billing_records_patient_id ON billing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_billing_records_bill_date ON billing_records(bill_date);
CREATE INDEX IF NOT EXISTS idx_billing_records_due_date ON billing_records(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_items_billing_record_id ON billing_items(billing_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_billing_record_id ON payment_records(billing_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_payment_date ON payment_records(payment_date);

-- Function to generate unique bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current year and month
    new_number := 'BILL-' || TO_CHAR(NOW(), 'YYYY-MM') || '-';
    
    -- Get the next sequential number for this month
    SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM LENGTH(new_number) + 1) AS INTEGER)), 0) + 1
    INTO counter
    FROM billing_records
    WHERE bill_number LIKE new_number || '%';
    
    -- Format with leading zeros
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$;

-- Function to update billing record totals
CREATE OR REPLACE FUNCTION update_billing_totals(billing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    new_subtotal DECIMAL(10,2);
    current_tax_rate DECIMAL(5,4) := 0.08; -- 8% tax rate, adjust as needed
    record_data billing_records%ROWTYPE;
BEGIN
    -- Calculate subtotal from billing items
    SELECT COALESCE(SUM(total_price), 0)
    INTO new_subtotal
    FROM billing_items
    WHERE billing_record_id = billing_id;
    
    -- Get current record data
    SELECT * INTO record_data FROM billing_records WHERE id = billing_id;
    
    -- Update the billing record with calculated values
    UPDATE billing_records
    SET 
        subtotal = new_subtotal,
        tax_amount = new_subtotal * current_tax_rate,
        total_amount = new_subtotal + (new_subtotal * current_tax_rate) - COALESCE(discount_amount, 0),
        balance_amount = (new_subtotal + (new_subtotal * current_tax_rate) - COALESCE(discount_amount, 0)) - COALESCE(paid_amount, 0),
        updated_at = NOW()
    WHERE id = billing_id;
END;
$$;

-- Function to update paid amount when payments are made
CREATE OR REPLACE FUNCTION update_paid_amount(billing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    total_paid DECIMAL(10,2);
    record_total DECIMAL(10,2);
    new_status VARCHAR(20);
BEGIN
    -- Calculate total paid amount
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM payment_records
    WHERE billing_record_id = billing_id AND status = 'completed';
    
    -- Get total amount
    SELECT total_amount INTO record_total
    FROM billing_records
    WHERE id = billing_id;
    
    -- Determine new status
    IF total_paid = 0 THEN
        new_status := 'pending';
    ELSIF total_paid >= record_total THEN
        new_status := 'paid';
    ELSE
        new_status := 'partial';
    END IF;
    
    -- Update the billing record
    UPDATE billing_records
    SET 
        paid_amount = total_paid,
        balance_amount = record_total - total_paid,
        status = new_status,
        updated_at = NOW()
    WHERE id = billing_id;
END;
$$;

-- Trigger to update billing totals when items are modified
CREATE OR REPLACE FUNCTION trigger_update_billing_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_billing_totals(OLD.billing_record_id);
        RETURN OLD;
    ELSE
        PERFORM update_billing_totals(NEW.billing_record_id);
        RETURN NEW;
    END IF;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS billing_items_update_totals ON billing_items;
CREATE TRIGGER billing_items_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON billing_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_billing_totals();

-- Trigger to update paid amounts when payments are modified
CREATE OR REPLACE FUNCTION trigger_update_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_paid_amount(OLD.billing_record_id);
        RETURN OLD;
    ELSE
        PERFORM update_paid_amount(NEW.billing_record_id);
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS payment_records_update_paid ON payment_records;
CREATE TRIGGER payment_records_update_paid
    AFTER INSERT OR UPDATE OR DELETE ON payment_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_paid_amount();

-- Function to create a new bill
CREATE OR REPLACE FUNCTION create_billing_record(
    p_patient_id UUID,
    p_appointment_id UUID DEFAULT NULL,
    p_treatment_id UUID DEFAULT NULL,
    p_due_days INTEGER DEFAULT 30,
    p_discount_amount DECIMAL(10,2) DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_bill_id UUID;
    bill_num TEXT;
BEGIN
    -- Generate bill number
    bill_num := generate_bill_number();
    
    -- Create the billing record
    INSERT INTO billing_records (
        patient_id,
        appointment_id,
        treatment_id,
        bill_number,
        due_date,
        discount_amount,
        notes
    ) VALUES (
        p_patient_id,
        p_appointment_id,
        p_treatment_id,
        bill_num,
        CURRENT_DATE + INTERVAL '1 day' * p_due_days,
        p_discount_amount,
        p_notes
    ) RETURNING id INTO new_bill_id;
    
    RETURN new_bill_id;
END;
$$;

-- Function to add billing item
CREATE OR REPLACE FUNCTION add_billing_item(
    p_billing_record_id UUID,
    p_description TEXT,
    p_quantity INTEGER,
    p_unit_price DECIMAL(10,2),
    p_item_type VARCHAR(50) DEFAULT 'service'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_item_id UUID;
BEGIN
    INSERT INTO billing_items (
        billing_record_id,
        description,
        quantity,
        unit_price,
        total_price,
        item_type
    ) VALUES (
        p_billing_record_id,
        p_description,
        p_quantity,
        p_unit_price,
        p_quantity * p_unit_price,
        p_item_type
    ) RETURNING id INTO new_item_id;
    
    RETURN new_item_id;
END;
$$;

-- Function to record a payment
CREATE OR REPLACE FUNCTION record_payment(
    p_billing_record_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_method VARCHAR(50),
    p_reference_number VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_payment_id UUID;
BEGIN
    INSERT INTO payment_records (
        billing_record_id,
        amount,
        payment_method,
        reference_number,
        notes
    ) VALUES (
        p_billing_record_id,
        p_amount,
        p_payment_method,
        p_reference_number,
        p_notes
    ) RETURNING id INTO new_payment_id;
    
    RETURN new_payment_id;
END;
$$;

-- Function to get billing summary for a patient
CREATE OR REPLACE FUNCTION get_patient_billing_summary(p_patient_id UUID)
RETURNS TABLE (
    total_bills BIGINT,
    total_amount DECIMAL(10,2),
    total_paid DECIMAL(10,2),
    total_balance DECIMAL(10,2),
    overdue_bills BIGINT,
    overdue_amount DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(br.total_amount), 0) as total_amount,
        COALESCE(SUM(br.paid_amount), 0) as total_paid,
        COALESCE(SUM(br.balance_amount), 0) as total_balance,
        COUNT(*) FILTER (WHERE br.due_date < CURRENT_DATE AND br.status != 'paid') as overdue_bills,
        COALESCE(SUM(br.balance_amount) FILTER (WHERE br.due_date < CURRENT_DATE AND br.status != 'paid'), 0) as overdue_amount
    FROM billing_records br
    WHERE br.patient_id = p_patient_id;
END;
$$;

-- RLS Policies
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Policies for billing_records
CREATE POLICY "Users can view their own billing records" ON billing_records
    FOR SELECT USING (
        patient_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'staff'))
    );

CREATE POLICY "Admin and staff can manage billing records" ON billing_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
    );

-- Policies for billing_items
CREATE POLICY "Users can view billing items for their records" ON billing_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM billing_records br 
            WHERE br.id = billing_record_id 
            AND (br.patient_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'staff')))
        )
    );

CREATE POLICY "Admin and staff can manage billing items" ON billing_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
    );

-- Policies for payment_records
CREATE POLICY "Users can view payment records for their bills" ON payment_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM billing_records br 
            WHERE br.id = billing_record_id 
            AND (br.patient_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'staff')))
        )
    );

CREATE POLICY "Admin and staff can manage payment records" ON payment_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff'))
    );

-- Grant permissions
GRANT ALL ON billing_records TO authenticated;
GRANT ALL ON billing_items TO authenticated;
GRANT ALL ON payment_records TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_bill_number() TO authenticated;
GRANT EXECUTE ON FUNCTION update_billing_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_paid_amount(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record(UUID, UUID, UUID, INTEGER, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_billing_item(UUID, TEXT, INTEGER, DECIMAL, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment(UUID, DECIMAL, VARCHAR, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_billing_summary(UUID) TO authenticated;

-- Insert some sample data for testing
DO $$
DECLARE
    sample_patient_id UUID;
    sample_bill_id UUID;
BEGIN
    -- Get a sample patient (first patient in the system)
    SELECT id INTO sample_patient_id FROM users WHERE role = 'patient' LIMIT 1;
    
    IF sample_patient_id IS NOT NULL THEN
        -- Create a sample billing record
        sample_bill_id := create_billing_record(
            sample_patient_id,
            NULL,
            NULL,
            30,
            0,
            'Sample billing record for testing'
        );
        
        -- Add some billing items
        PERFORM add_billing_item(sample_bill_id, 'Dental Cleaning', 1, 150.00, 'service');
        PERFORM add_billing_item(sample_bill_id, 'X-Ray', 2, 75.00, 'diagnostic');
        PERFORM add_billing_item(sample_bill_id, 'Fluoride Treatment', 1, 50.00, 'service');
        
        -- Record a partial payment
        PERFORM record_payment(sample_bill_id, 200.00, 'credit_card', 'CC123456', 'Partial payment');
        
        RAISE NOTICE 'Sample billing data created successfully';
    END IF;
END $$;
