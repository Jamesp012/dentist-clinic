const pool = require('../config/database');
const { sendSMS } = require('../utils/smsService');

/**
 * Checks for appointments scheduled for tomorrow and sends SMS reminders.
 */
async function sendAppointmentReminders() {
  console.log('Running appointment reminders check...');
  
  try {
    // 1. Calculate date for tomorrow (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // 2. Fetch appointments for tomorrow that haven't been notified yet
    // We'll use a new column 'reminderSent' to track this, but for now we'll just fetch all scheduled for tomorrow
    // and let the SMS service handle potential duplicates (or we can just send them once)
    const [appointments] = await pool.query(
      `SELECT a.id, a.patientName, a.appointmentDateTime, a.type, p.phone 
       FROM appointments a
       JOIN patients p ON a.patientId = p.id
       WHERE DATE(a.appointmentDateTime) = ? 
         AND a.status = 'scheduled'
         AND (a.reminderSent IS FALSE OR a.reminderSent IS NULL)`,
      [tomorrowStr]
    );

    console.log(`Found ${appointments.length} appointments for ${tomorrowStr}`);

    for (const apt of appointments) {
      if (!apt.phone) {
        console.warn(`No phone number for patient ${apt.patientName} (Apt ID: ${apt.id})`);
        continue;
      }

      const time = apt.appointmentDateTime.split(' ')[1].substring(0, 5);
      // Convert to 12h format
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      const formattedTime = `${hour12}:${minutes} ${ampm}`;

      const message = `Hello ${apt.patientName}, this is a reminder for your ${apt.type} appointment tomorrow, ${tomorrowStr} at ${formattedTime}. See you! - Maaño Dental Care`;

      console.log(`Sending reminder to ${apt.patientName} (${apt.phone})...`);
      const result = await sendSMS(apt.phone, message);

      if (result.success) {
        // Mark as sent so we don't send it again
        await pool.query('UPDATE appointments SET reminderSent = TRUE WHERE id = ?', [apt.id]);
        console.log(`Reminder sent successfully to ${apt.phone}`);
      } else {
        console.error(`Failed to send reminder to ${apt.phone}:`, result.error);
      }
    }

    console.log('Appointment reminders check completed.');
  } catch (error) {
    console.error('Error in sendAppointmentReminders:', error);
  }
}

module.exports = { sendAppointmentReminders };

// If run directly
if (require.main === module) {
  sendAppointmentReminders().then(() => process.exit(0));
}
