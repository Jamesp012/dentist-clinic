const https = require('https');
const path = require('path');
const env = (process.env.NODE_ENV || 'development').trim();
const envFile = env === 'test' ? '.env.test' : (env === 'production' ? '.env.production' : '.env');
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

/**
 * Send SMS using PhilSMS API
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS message content
 */
const sendSMS = async (phone, message) => {
  if (!phone) return { success: false, error: 'Phone number is required' };

  const apiToken = process.env.PHILSMS_API_TOKEN;
  const senderName = process.env.PHILSMS_SENDER_NAME || 'PhilSMS';

  if (!apiToken) {
    console.warn('PHILSMS_API_TOKEN not configured in .env. SMS will be simulated.');
    console.log(`[SIMULATED SMS] To ${phone}: ${message}`);
    return { success: true, simulated: true };
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const recipient = cleanPhone.startsWith('63') ? cleanPhone : '63' + cleanPhone.substring(1);

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      recipient: recipient,
      sender_id: senderName,
      type: 'plain',
      message: message
    });

    const options = {
      hostname: 'dashboard.philsms.com',
      port: 443,
      path: '/api/v3/sms/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${apiToken}`
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`SMS successfully sent to ${cleanPhone} via PhilSMS`);
          resolve({ success: true, data: JSON.parse(responseBody) });
        } else {
          console.error(`PhilSMS API Error (${res.statusCode}):`, responseBody);
          resolve({ success: false, error: `API Error: ${res.statusCode}`, details: responseBody });
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTPS Request Error:', error);
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
};

module.exports = {
  sendSMS
};
