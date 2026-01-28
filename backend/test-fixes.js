const http = require('http');

function makeRequest(path, method, data, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(responseData)
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testFixes() {
  try {
    console.log('\n========== TESTING DOCTOR LOGIN ==========');
    const doctorLogin = await makeRequest('/auth/login', 'POST', {
      username: 'doctor',
      password: 'doctor123'
    });
    console.log('Doctor Login Status:', doctorLogin.status);
    console.log('Doctor Login Success:', doctorLogin.status === 200);
    const doctorToken = doctorLogin.data.token;

    console.log('\n========== TESTING ASSISTANT LOGIN ==========');
    const assistantLogin = await makeRequest('/auth/login', 'POST', {
      username: 'assistant',
      password: 'assistant123'
    });
    console.log('Assistant Login Status:', assistantLogin.status);
    console.log('Assistant Login Success:', assistantLogin.status === 200);
    const assistantToken = assistantLogin.data.token;

    console.log('\n========== TESTING ADD EMPLOYEE ==========');
    const addEmployee = await makeRequest('/employees', 'POST', {
      name: 'John Doe',
      position: 'dentist',
      phone: '+63 912 345 6789',
      email: 'john@clinic.com',
      address: '123 Main St',
      dateHired: '2024-01-20'
    }, doctorToken);
    console.log('Add Employee Status:', addEmployee.status);
    console.log('Add Employee Response:', addEmployee.data);
    console.log('Add Employee Success:', addEmployee.status === 201);

    if (addEmployee.status === 201) {
      const employeeId = addEmployee.data.employeeId;
      console.log('\n========== TESTING GENERATE CREDENTIALS ==========');
      const generateCreds = await makeRequest(`/employees/${employeeId}/generate-credentials`, 'POST', {}, doctorToken);
      console.log('Generate Credentials Status:', generateCreds.status);
      console.log('Username:', generateCreds.data.username);
      console.log('Temporary Password:', generateCreds.data.temporaryPassword);
    }

    console.log('\n========== ALL TESTS COMPLETED ==========');
    process.exit(0);
  } catch (error) {
    console.error('Test Error:', error.message);
    process.exit(1);
  }
}

testFixes();
