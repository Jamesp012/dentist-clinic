# Patient Appointment Notifications - Quick Start Guide

## Feature Overview
Patients now automatically receive notifications in their portal whenever a doctor or staff member creates, updates, or cancels an appointment for them.

## How It Works

### 1. Doctor Creates Appointment
- Doctor logs in to the clinic system
- Navigates to Appointment Scheduler
- Selects a patient and creates an appointment
- System automatically sends notification to patient's portal

### 2. Patient Sees Notification
- Patient logs into their portal
- Notification bell icon appears in bottom-right corner with unread count
- Click bell to open notification panel
- View all appointment-related notifications
- Mark as read or delete notifications

## Testing Steps

### Setup
```bash
# 1. Initialize database (creates patient_notifications table)
cd backend
node init-db.js

# 2. Start backend server
node server.js
# Expected: "Server running on port 5000"

# 3. In another terminal, start frontend
cd ..
npm run dev
# Expected: "http://localhost:5173"
```

### Test Case 1: Create Appointment Notification
```
1. Open browser with frontend (http://localhost:5173)
2. Login as doctor
   - Username: doctor
   - Password: doctor123
3. Click "Appointments" tab
4. Click "Add Appointment"
5. Select patient: "Krista"
6. Fill in details:
   - Date: 2025-02-15
   - Time: 10:00 AM
   - Type: Regular Checkup
   - Duration: 60 minutes
7. Click "Add Appointment"
8. VERIFY: Toast shows "Successfully joined the queue!"

9. Logout (click Settings → Logout)
10. Login as patient "Krista"
    - Search for "Krista" in patient claiming or use test account
    - Or navigate directly if already claimed

11. VERIFY: Bell icon appears in bottom-right corner
12. VERIFY: Bell shows unread count badge (1)
13. Click bell icon
14. VERIFY: Notification panel shows:
    - Title: "New Appointment Scheduled"
    - Message: "Your Regular Checkup appointment has been scheduled for 2025-02-15 at 10:00. Duration: 60 minutes."
    - Blue color indicator
```

### Test Case 2: Mark Notification as Read
```
1. With notification panel open
2. Click checkmark icon on notification
3. VERIFY: Notification background changes from blue to white
4. VERIFY: Unread count on bell decreases
5. VERIFY: Toast shows "Notification updated"
```

### Test Case 3: Delete Notification
```
1. With notification panel open
2. Click trash icon on notification
3. VERIFY: Notification disappears from list
4. VERIFY: Unread count decreases
5. VERIFY: Toast shows "Notification deleted"
```

### Test Case 4: Cancel Appointment Notification
```
1. Login as doctor
2. Go to Appointments
3. Find the appointment created in Test Case 1
4. Edit it (click appointment)
5. Change status to "Cancelled"
6. Click "Update"
7. VERIFY: Toast shows success

8. Logout and login as patient "Krista"
9. Click bell icon
10. VERIFY: New red-colored notification appears
11. VERIFY: Title is "Appointment Cancelled"
12. VERIFY: Message includes appointment details
```

### Test Case 5: Mark All as Read
```
1. Create 2-3 more appointments for patient
2. Login as patient
3. Bell icon shows count (e.g., "3")
4. Click bell to open panel
5. Click "Mark all as read" button
6. VERIFY: All notifications are no longer highlighted in blue
7. VERIFY: Unread count becomes "0"
8. VERIFY: Bell icon no longer shows badge
```

## Database Verification

### Check Notifications Table
```sql
-- Connect to MySQL
mysql -u root -p dental_clinic

-- Check table structure
DESCRIBE patient_notifications;

-- View all notifications
SELECT * FROM patient_notifications;

-- Count unread notifications
SELECT COUNT(*) as unread_count FROM patient_notifications WHERE isRead = 0;

-- View notifications for specific patient
SELECT * FROM patient_notifications WHERE patientId = 1 ORDER BY createdAt DESC;
```

### Sample Query Output
```
id | patientId | appointmentId | type                 | title                      | isRead | createdAt
1  | 1         | 5             | appointment_created  | New Appointment Scheduled  | 0      | 2025-02-03 10:30:00
2  | 1         | 5             | appointment_cancelled| Appointment Cancelled      | 0      | 2025-02-03 11:15:00
```

## API Endpoints

### Get Patient's Notifications
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notifications
```

### Get Unread Count
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notifications/unread/count
```

### Mark Notification as Read
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notifications/1/read
```

### Delete Notification
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notifications/1
```

## Troubleshooting

### Issue: Bell icon not appearing in patient portal
**Solution**:
- Check browser console for errors (F12 → Console)
- Verify backend is running on port 5000
- Check network tab to see if API calls are successful
- Clear browser cache and refresh

### Issue: "patient_notifications table doesn't exist"
**Solution**:
```bash
# Reinitialize database
cd backend
node init-db.js

# If still issues, manually create table:
mysql -u root -p dental_clinic < schema.sql
```

### Issue: Notification not appearing when appointment created
**Solution**:
- Verify appointment was created for correct patient
- Check database: `SELECT * FROM patient_notifications WHERE appointmentId = XXX;`
- Check browser console for API errors
- Verify notification poll interval (should check every 5 seconds)

### Issue: "Unauthorized" errors in notifications API
**Solution**:
- Make sure you're logged in as a valid user
- Check token in browser localStorage
- Try logging out and logging back in

## Customization

### Change Notification Poll Interval
In `src/components/PatientNotifications.tsx`, line 35:
```typescript
// Change from 5000 to desired milliseconds
const interval = setInterval(loadNotifications, 5000);
```

### Customize Notification Colors
In `src/components/PatientNotifications.tsx`, `getNotificationColor()` function:
```typescript
case 'appointment_created':
  return 'bg-blue-50 border-l-4 border-blue-500'; // Change colors here
```

### Customize Notification Messages
In `backend/routes/appointments.js`:
```javascript
const notificationMessage = `Your ${type} appointment has been scheduled for ${notifDate} at ${notifTime}. Duration: ${duration} minutes.`;
// Modify message format as needed
```

## Performance Notes

- Notifications poll every 5 seconds (can be reduced for more real-time)
- Each notification loads on component mount and via interval
- Large number of notifications may impact performance (consider pagination in future)
- Consider caching unread count to reduce API calls

## Security Notes

- All notification endpoints require JWT authentication
- Patients can only access their own notifications
- Staff can view any patient's notifications
- Notification creation is restricted to staff only
- No sensitive patient data in notification messages

## Future Enhancements

1. **Push Notifications**: Browser push notifications for immediate alerts
2. **Email Notifications**: Send notifications to patient email
3. **SMS Notifications**: Send notifications to patient phone
4. **In-App Sound**: Play notification sound when new notification arrives
5. **Notification Preferences**: Let patients customize notification settings
6. **Appointment Reminders**: Auto-send reminders 24 hours before appointment
7. **Bulk Messaging**: Staff send custom messages to multiple patients
8. **Notification History**: Archive deleted notifications

## Support

For issues or questions:
1. Check [APPOINTMENT_NOTIFICATION_IMPLEMENTATION.md](APPOINTMENT_NOTIFICATION_IMPLEMENTATION.md) for detailed documentation
2. Review database schema in [schema.sql](../backend/schema.sql)
3. Check API routes in [backend/routes/notifications.js](../backend/routes/notifications.js)
4. Review component in [src/components/PatientNotifications.tsx](../src/components/PatientNotifications.tsx)
