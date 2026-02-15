require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const testMail = async () => {
  console.log('Attempting to send test email...');
  console.log('User:', process.env.EMAIL_USER);
  console.log('Pass:', process.env.EMAIL_PASS ? '********' : 'NOT SET');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Send to self
    subject: 'Email Test',
    text: 'If you receive this, the email service is working!',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Response:', info.response);
  } catch (error) {
    console.error('Error occurred:');
    console.error(error.message);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check your EMAIL_USER and EMAIL_PASS.');
    }
  }
};

testMail();
