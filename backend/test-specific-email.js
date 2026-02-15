const { sendPatientCredentials, transporter } = require('./utils/emailService');

async function testEmail() {
  const testEmail = 'jamespatrickurquiza@gmail.com';
  console.log(`Attempting to send test email to: ${testEmail}`);
  
  try {
    console.log('Verifying transporter configuration...');
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('Transporter verification failed:', error);
          reject(error);
        } else {
          console.log('Transporter is ready.');
          resolve(success);
        }
      });
    });

    console.log('Sending patient credentials email...');
    // In emailService.js, sendPatientCredentials doesn't return the promise from sendMail if not awaited,
    // but here we can just call it and it has its own try/catch.
    // However, the original function in emailService.js is:
    // const sendPatientCredentials = async (email, fullName, username, password) => { ... }
    
    await sendPatientCredentials(testEmail, 'James Patrick Urquiza', 'jamesp', 'temp1234');
    console.log('Test completed. Check console for "Credentials email sent" message.');
  } catch (err) {
    console.error('Email test script failed:', err);
  } finally {
    process.exit();
  }
}

testEmail();
