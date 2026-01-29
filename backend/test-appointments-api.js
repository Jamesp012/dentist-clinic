const http = require('http');
require('dotenv').config();

// First, get an auth token
const authOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(authOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200 && response.token) {
        console.log('✓ Authentication successful');
        console.log('Token:', response.token.substring(0, 50) + '...\n');

        // Now test the appointments API
        testAppointmentsAPI(response.token);
      } else {
        console.error('✗ Authentication failed:', response);
        process.exit(1);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.write(JSON.stringify({
  username: 'doctor',
  password: 'doctor123'
}));

req.end();

function testAppointmentsAPI(token) {
  const appointmentOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/appointments',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req2 = http.request(appointmentOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const appointments = JSON.parse(data);
        
        if (Array.isArray(appointments)) {
          console.log('✓ Appointments API test successful!\n');
          console.log(`Total appointments: ${appointments.length}\n`);
          
          appointments.slice(0, 3).forEach(apt => {
            console.log(`Appointment ID: ${apt.id}`);
            console.log(`  Patient: ${apt.patientName}`);
            console.log(`  Date: ${apt.date}`);
            console.log(`  Time: ${apt.time}`);
            console.log(`  DateTime: ${apt.appointmentDateTime}`);
            console.log(`  Type: ${apt.type}`);
            console.log(`  Duration: ${apt.duration} min`);
            console.log(`  Status: ${apt.status}`);
            console.log();
          });
        } else {
          console.error('✗ Unexpected response:', appointments);
        }
      } catch (e) {
        console.error('Error parsing appointments:', e.message);
        console.error('Response:', data);
        process.exit(1);
      }
    });
  });

  req2.on('error', (e) => {
    console.error('Request error:', e.message);
    process.exit(1);
  });

  req2.end();
}
