const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email server is ready to take our messages');
  }
});

/**
 * Send credentials to a new patient
 * @param {string} email - Patient's email
 * @param {string} fullName - Patient's full name
 * @param {string} username - Generated username
 * @param {string} password - Generated temporary password
 */
const sendPatientCredentials = async (email, fullName, username, password) => {
  if (!email) return;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to Maaño Dental Care - Your Account Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #14b8a6; text-align: center;">Welcome to Maaño Dental Care!</h2>
        <p>Dear <strong>${fullName}</strong>,</p>
        <p>An account has been created for you at Maaño Dental Care. You can now access your patient portal to view your records, appointments, and more.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; margin-bottom: 10px;"><strong>Your Login Credentials:</strong></p>
          <p style="margin: 0; margin-bottom: 5px;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
        </div>
        
        <p>For security reasons, we recommend that you change your password after your first login.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:5173" style="background-color: #14b8a6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Patient Portal</a>
        </div>
        
        <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #666; text-align: center;">
          This is an automated message. Please do not reply directly to this email.<br />
          If you have any questions, please contact us at (042) 7171156.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Credentials email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    // We don't throw here to avoid failing the registration if only email fails
  }
};

module.exports = {
  sendPatientCredentials,
  transporter,
};
