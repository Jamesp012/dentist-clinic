const pool = require('./config/database');

const clinicServices = [
  // ORAL EXAMINATION / CHECK-UP
  {
    serviceName: 'Dental Consultation',
    category: 'Oral Examination / Check-Up',
    duration: '30 mins',
    price: 500
  },
  {
    serviceName: 'Oral Examination',
    category: 'Oral Examination / Check-Up',
    duration: '30 mins',
    price: 500
  },
  {
    serviceName: 'Diagnosis',
    category: 'Oral Examination / Check-Up',
    duration: '20 mins',
    price: 300
  },
  {
    serviceName: 'Treatment Planning',
    category: 'Oral Examination / Check-Up',
    duration: '30 mins',
    price: 500
  },

  // ORAL PROPHYLAXIS
  {
    serviceName: 'Dental Cleaning',
    category: 'Oral Prophylaxis',
    duration: '45 mins',
    price: 1500
  },
  {
    serviceName: 'Scaling',
    category: 'Oral Prophylaxis',
    duration: '45 mins',
    price: 1500
  },
  {
    serviceName: 'Polishing',
    category: 'Oral Prophylaxis',
    duration: '20 mins',
    price: 500
  },
  {
    serviceName: 'Stain Removal',
    category: 'Oral Prophylaxis',
    duration: '30 mins',
    price: 800
  },

  // RESTORATION (PERMANENT OR TEMPORARY)
  {
    serviceName: 'Temporary Filling',
    category: 'Restoration',
    duration: '30 mins',
    price: 2000
  },
  {
    serviceName: 'Permanent Filling',
    category: 'Restoration',
    duration: '45 mins',
    price: 3500
  },
  {
    serviceName: 'Tooth Repair',
    category: 'Restoration',
    duration: '60 mins',
    price: 4000
  },
  {
    serviceName: 'Dental Bonding',
    category: 'Restoration',
    duration: '45 mins',
    price: 3000
  },

  // TOOTH EXTRACTION
  {
    serviceName: 'Simple Tooth Extraction',
    category: 'Tooth Extraction',
    duration: '20 mins',
    price: 2500
  },
  {
    serviceName: 'Surgical Extraction',
    category: 'Tooth Extraction',
    duration: '60 mins',
    price: 5000
  },
  {
    serviceName: 'Impacted Tooth Removal',
    category: 'Tooth Extraction',
    duration: '90 mins',
    price: 7500
  },

  // ORTHODONTIC TREATMENT
  {
    serviceName: 'Braces Installation',
    category: 'Orthodontic Treatment',
    duration: '120 mins',
    price: 15000
  },
  {
    serviceName: 'Braces Adjustment',
    category: 'Orthodontic Treatment',
    duration: '30 mins',
    price: 1500
  },
  {
    serviceName: 'Retainers',
    category: 'Orthodontic Treatment',
    duration: '45 mins',
    price: 3000
  },
  {
    serviceName: 'Orthodontic Consultation',
    category: 'Orthodontic Treatment',
    duration: '30 mins',
    price: 1000
  },

  // PROSTHODONTICS
  {
    serviceName: 'Complete Dentures',
    category: 'Prosthodontics',
    duration: '180 mins',
    price: 25000
  },
  {
    serviceName: 'Partial Dentures',
    category: 'Prosthodontics',
    duration: '120 mins',
    price: 18000
  }
];

async function seedServices() {
  try {
    console.log('Starting to seed clinic services...');
    
    // Clear existing services (optional - comment out if you want to keep existing ones)
    // await pool.query('TRUNCATE TABLE servicePrices');
    // console.log('Cleared existing services');

    let addedCount = 0;
    let skippedCount = 0;

    for (const service of clinicServices) {
      try {
        // Check if service already exists
        const [existing] = await pool.query(
          'SELECT id FROM servicePrices WHERE serviceName = ? AND category = ?',
          [service.serviceName, service.category]
        );

        if (existing.length > 0) {
          console.log(`⊘ Service already exists: ${service.serviceName}`);
          skippedCount++;
          continue;
        }

        await pool.query(
          'INSERT INTO servicePrices (serviceName, category, duration, price) VALUES (?, ?, ?, ?)',
          [service.serviceName, service.category, service.duration, service.price]
        );
        
        console.log(`✓ Added: ${service.serviceName} (${service.category})`);
        addedCount++;
      } catch (error) {
        console.error(`✗ Error adding ${service.serviceName}:`, error.message);
      }
    }

    console.log(`\n✓ Seeding completed!`);
    console.log(`  Added: ${addedCount} services`);
    console.log(`  Skipped: ${skippedCount} services (already exist)`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding services:', error);
    process.exit(1);
  }
}

seedServices();
