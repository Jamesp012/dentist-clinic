#!/usr/bin/env node

const mysql = require('mysql2/promise');

const services = [
  { serviceName: 'Dental Consultation', category: 'Oral Examination / Check-Up', duration: '30 mins', price: 500 },
  { serviceName: 'Oral Examination', category: 'Oral Examination / Check-Up', duration: '30 mins', price: 500 },
  { serviceName: 'Diagnosis', category: 'Oral Examination / Check-Up', duration: '20 mins', price: 300 },
  { serviceName: 'Treatment Planning', category: 'Oral Examination / Check-Up', duration: '30 mins', price: 500 },
  { serviceName: 'Dental Cleaning', category: 'Oral Prophylaxis', duration: '45 mins', price: 1500 },
  { serviceName: 'Scaling', category: 'Oral Prophylaxis', duration: '45 mins', price: 1500 },
  { serviceName: 'Polishing', category: 'Oral Prophylaxis', duration: '20 mins', price: 500 },
  { serviceName: 'Stain Removal', category: 'Oral Prophylaxis', duration: '30 mins', price: 800 },
  { serviceName: 'Temporary Filling', category: 'Restoration', duration: '30 mins', price: 2000 },
  { serviceName: 'Permanent Filling', category: 'Restoration', duration: '45 mins', price: 3500 },
  { serviceName: 'Tooth Repair', category: 'Restoration', duration: '60 mins', price: 4000 },
  { serviceName: 'Dental Bonding', category: 'Restoration', duration: '45 mins', price: 3000 },
  { serviceName: 'Simple Tooth Extraction', category: 'Tooth Extraction', duration: '20 mins', price: 2500 },
  { serviceName: 'Surgical Extraction', category: 'Tooth Extraction', duration: '60 mins', price: 5000 },
  { serviceName: 'Impacted Tooth Removal', category: 'Tooth Extraction', duration: '90 mins', price: 7500 },
  { serviceName: 'Braces Installation', category: 'Orthodontic Treatment', duration: '120 mins', price: 15000 },
  { serviceName: 'Braces Adjustment', category: 'Orthodontic Treatment', duration: '30 mins', price: 1500 },
  { serviceName: 'Retainers', category: 'Orthodontic Treatment', duration: '45 mins', price: 3000 },
  { serviceName: 'Orthodontic Consultation', category: 'Orthodontic Treatment', duration: '30 mins', price: 1000 },
  { serviceName: 'Complete Dentures', category: 'Prosthodontics', duration: '180 mins', price: 25000 },
  { serviceName: 'Partial Dentures', category: 'Prosthodontics', duration: '120 mins', price: 18000 }
];

async function insertServices() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dentist_clinic'
  });

  try {
    console.log('Inserting clinic services...\n');
    let count = 0;

    for (const service of services) {
      try {
        // Check if exists
        const [rows] = await connection.execute(
          'SELECT id FROM servicePrices WHERE serviceName = ? AND category = ?',
          [service.serviceName, service.category]
        );

        if (rows.length > 0) {
          console.log(`⊘ Already exists: ${service.serviceName}`);
          continue;
        }

        await connection.execute(
          'INSERT INTO servicePrices (serviceName, category, duration, price) VALUES (?, ?, ?, ?)',
          [service.serviceName, service.category, service.duration, service.price]
        );
        console.log(`✓ Added: ${service.serviceName}`);
        count++;
      } catch (err) {
        console.error(`✗ Error with ${service.serviceName}:`, err.message);
      }
    }

    console.log(`\n✓ Completed! Added ${count} services.`);
    await connection.end();
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
}

insertServices();
