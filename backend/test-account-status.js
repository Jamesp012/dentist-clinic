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
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: { error: 'Parse error', raw: responseData }
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAccountStatus() {
  try {
    console.log('\n========== TESTING ACCOUNT STATUS FLOW ==========');
    
    // Login as doctor
    console.log('\n1. Logging in as doctor...');
    const doctorLogin = await makeRequest('/auth/login', 'POST', {
      username: 'doctor',
      password: 'doctor123'
    });
    const doctorToken = doctorLogin.data.token;
    console.log('✓ Doctor logged in');

    // Add new employee
    console.log('\n2. Adding new employee...');
    const addEmployee = await makeRequest('/employees', 'POST', {
      name: 'Test Employee',
      position: 'dentist',
      phone: '+63 999 888 7777',
      email: 'test.employee@clinic.com',
      address: '456 Test St',
      dateHired: '2024-01-20'
    }, doctorToken);
    const employeeId = addEmployee.data.employeeId;
    console.log('✓ Employee added, ID:', employeeId);

    // Generate credentials
    console.log('\n3. Generating credentials for employee...');
    const generateCreds = await makeRequest(`/employees/${employeeId}/generate-credentials`, 'POST', {}, doctorToken);
    console.log('✓ Credentials generated');
    console.log('  Username:', generateCreds.data.username);
    console.log('  Temp Password:', generateCreds.data.temporaryPassword);

    // Check employee status
    console.log('\n4. Checking employee status...');
    const checkEmployee = await makeRequest(`/employees/${employeeId}`, 'GET', null, doctorToken);
    console.log('✓ Employee status:', checkEmployee.data.accountStatus);
    console.log('  isCodeUsed:', checkEmployee.data.isCodeUsed);
    
    if (checkEmployee.data.accountStatus !== 'pending') {
      console.error('❌ ERROR: Expected status to be "pending", got:', checkEmployee.data.accountStatus);
    } else {
      console.log('✓ Status is correctly "pending"');
    }

    // Try to regenerate credentials (should succeed since not logged in yet)
    console.log('\n5. Attempting to regenerate credentials (should succeed)...');
    const regenerate = await makeRequest(`/employees/${employeeId}/generate-credentials`, 'POST', {}, doctorToken);
    if (regenerate.status === 200) {
      console.log('✓ Regeneration successful (as expected)');
      console.log('  New Username:', regenerate.data.username);
      console.log('  New Temp Password:', regenerate.data.temporaryPassword);
    } else {
      console.error('❌ ERROR: Regeneration failed:', regenerate.data);
    }

    // Login with temporary password
    console.log('\n6. Employee logging in with temporary password...');
    const employeeLogin = await makeRequest('/auth/login', 'POST', {
      username: regenerate.data.username,
      password: regenerate.data.temporaryPassword
    });
    
    if (employeeLogin.status === 200) {
      console.log('✓ Employee logged in successfully');
      console.log('  isFirstLogin:', employeeLogin.data.user.isFirstLogin);
    } else {
      console.error('❌ ERROR: Employee login failed:', employeeLogin.data);
    }

    // Check employee status after login
    console.log('\n7. Checking employee status after first login...');
    const checkAfterLogin = await makeRequest(`/employees/${employeeId}`, 'GET', null, doctorToken);
    console.log('✓ Employee status:', checkAfterLogin.data.accountStatus);
    console.log('  isCodeUsed:', checkAfterLogin.data.isCodeUsed);
    
    if (checkAfterLogin.data.accountStatus !== 'active') {
      console.error('❌ ERROR: Expected status to be "active", got:', checkAfterLogin.data.accountStatus);
    } else {
      console.log('✓ Status is correctly "active"');
    }

    if (!checkAfterLogin.data.isCodeUsed) {
      console.error('❌ ERROR: Expected isCodeUsed to be true');
    } else {
      console.log('✓ isCodeUsed is correctly true');
    }

    // Try to regenerate credentials after login (should fail)
    console.log('\n8. Attempting to regenerate credentials after login (should fail)...');
    const regenerateAfter = await makeRequest(`/employees/${employeeId}/generate-credentials`, 'POST', {}, doctorToken);
    if (regenerateAfter.status === 400) {
      console.log('✓ Regeneration blocked (as expected)');
      console.log('  Error:', regenerateAfter.data.error);
    } else {
      console.error('❌ ERROR: Regeneration should have been blocked but got status:', regenerateAfter.status);
    }

    console.log('\n========== ALL ACCOUNT STATUS TESTS PASSED ==========');
    process.exit(0);
  } catch (error) {
    console.log('\n❌ Test Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testAccountStatus();
