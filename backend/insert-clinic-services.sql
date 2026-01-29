-- Clinic Services Data
INSERT INTO servicePrices (serviceName, category, duration, price) VALUES
-- ORAL EXAMINATION / CHECK-UP
('Dental Consultation', 'Oral Examination / Check-Up', '30 mins', 500),
('Oral Examination', 'Oral Examination / Check-Up', '30 mins', 500),
('Diagnosis', 'Oral Examination / Check-Up', '20 mins', 300),
('Treatment Planning', 'Oral Examination / Check-Up', '30 mins', 500),

-- ORAL PROPHYLAXIS
('Dental Cleaning', 'Oral Prophylaxis', '45 mins', 1500),
('Scaling', 'Oral Prophylaxis', '45 mins', 1500),
('Polishing', 'Oral Prophylaxis', '20 mins', 500),
('Stain Removal', 'Oral Prophylaxis', '30 mins', 800),

-- RESTORATION (PERMANENT OR TEMPORARY)
('Temporary Filling', 'Restoration', '30 mins', 2000),
('Permanent Filling', 'Restoration', '45 mins', 3500),
('Tooth Repair', 'Restoration', '60 mins', 4000),
('Dental Bonding', 'Restoration', '45 mins', 3000),

-- TOOTH EXTRACTION
('Simple Tooth Extraction', 'Tooth Extraction', '20 mins', 2500),
('Surgical Extraction', 'Tooth Extraction', '60 mins', 5000),
('Impacted Tooth Removal', 'Tooth Extraction', '90 mins', 7500),

-- ORTHODONTIC TREATMENT
('Braces Installation', 'Orthodontic Treatment', '120 mins', 15000),
('Braces Adjustment', 'Orthodontic Treatment', '30 mins', 1500),
('Retainers', 'Orthodontic Treatment', '45 mins', 3000),
('Orthodontic Consultation', 'Orthodontic Treatment', '30 mins', 1000),

-- PROSTHODONTICS
('Complete Dentures', 'Prosthodontics', '180 mins', 25000),
('Partial Dentures', 'Prosthodontics', '120 mins', 18000);
