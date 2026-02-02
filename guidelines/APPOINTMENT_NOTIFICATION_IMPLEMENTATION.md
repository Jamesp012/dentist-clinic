# Patient Appointment Notification System - Implementation Guide

## Overview
This document describes the implementation of a notification system that alerts patients when a doctor or staff member creates an appointment for them in the dental clinic management system.

## Changes Made

### 1. Database Schema Updates

#### Added `patient_notifications` table to `schema.sql`
- **Location**: `backend/schema.sql`
- **Fields**:
  - `id`: Primary key
  - `patientId`: Foreign key to patients table
  - `appointmentId`: Foreign key to appointments table (optional)
  - `type`: Notification type (appointment_created, appointment_updated, appointment_cancelled, reminder)
  - `title`: Notification title
  - `message`: Notification message body
  - `isRead`: Boolean flag for read status
  - `createdAt`: Timestamp when notification was created
  - `readAt`: Timestamp when notification was read
- **Indexes**: 
  - `idx_patient_read`: For efficient filtering by patient and read status
  - `idx_created`: For sorting by creation date

#### Updated `init-db.js`
- Added CREATE TABLE statement for `patient_notifications` table with proper character encoding and foreign key constraints

### 2. Backend API Implementation

#### Created `backend/routes/notifications.js`
New API endpoints for managing patient notifications:

**GET `/api/notifications`**
- Retrieve all notifications for current patient
- Patients see only their own notifications
- Staff can filter by specific patient

**GET `/api/notifications/unread/count`**
- Get count of unread notifications for current patient

**GET `/api/notifications/patient/:patientId`**
- Get all notifications for specific patient (staff only)

**PUT `/api/notifications/:id/read`**
- Mark individual notification as read

**PUT `/api/notifications/read-all`**
- Mark all notifications as read for patient

**POST `/api/notifications`**
- Create new notification (internal use, staff only)

**DELETE `/api/notifications/:id`**
- Delete notification

#### Updated `backend/routes/appointments.js`
- **CREATE appointment**: Automatically creates a notification when staff creates an appointment
  - Generates notification title: "New Appointment Scheduled"
  - Message includes: appointment type, date, time, and duration
  - Notification type: `appointment_created`

- **UPDATE appointment**: Creates notifications for status changes
  - If status changed to `cancelled`: Generates cancellation notification
  - If status changed to `completed`: Generates completion notification
  - If appointment is rescheduled: Generates update notification

#### Updated `backend/server.js`
- Registered the new notifications route: `app.use('/api/notifications', notificationsRoutes);`

### 3. Frontend API Integration

#### Updated `src/api.js`
Added `notificationAPI` object with methods:
```javascript
notificationAPI = {
  getAll(),           // Get all notifications
  getUnreadCount(),   // Get unread count
  getByPatientId(),   // Get notifications for specific patient
  markAsRead(),       // Mark single notification as read
  markAllAsRead(),    // Mark all as read
  create(),           // Create notification
  delete()            // Delete notification
}
```

### 4. Frontend UI Components

#### Created `src/components/PatientNotifications.tsx`
New notification panel component with:
- **Bell icon button** with unread count badge
- **Notification panel** showing:
  - List of all notifications with timestamps
  - Color-coded notification types (blue for creation, red for cancellation, orange for updates, yellow for reminders)
  - Read/unread status indicators
  - Inline actions: Mark as read, Delete
  - "Mark all as read" button
  - Empty state when no notifications

**Features**:
- Real-time polling every 5 seconds to fetch new notifications
- Smooth animations for notifications appearing/disappearing
- Click backdrop to close panel
- Responsive design for mobile devices
- Toast notifications for user actions

#### Updated `src/components/PatientPortal.tsx`
- Added import for `PatientNotifications` component
- Integrated `<PatientNotifications />` component into patient portal
- Displays notification bell icon in bottom-right corner

## User Flow

### When Doctor Creates Appointment:
1. Doctor navigates to Appointment Scheduler
2. Doctor selects a patient and creates appointment
3. System stores appointment in database
4. **Backend automatically creates notification for patient**
5. Notification sent: "New Appointment Scheduled - [Type] on [Date] at [Time]"
6. Patient sees notification in their portal with:
   - Bell icon (bottom right) showing unread count
   - Clicking bell opens notification panel
   - Can mark as read or delete notifications

### When Appointment is Updated/Cancelled:
1. Doctor updates or cancels appointment
2. **Backend automatically creates appropriate notification**
3. Patient receives notification about change:
   - Update: "Appointment Updated - New time is [Date] [Time]"
   - Cancellation: "Appointment Cancelled - [Type] on [Date]"

## Testing the Feature

### Prerequisites:
1. Run database initialization: `node backend/init-db.js`
2. Start backend server: `node backend/server.js`
3. Start frontend: `npm run dev`

### Test Steps:
1. **Create test appointment**:
   - Login as doctor
   - Go to Appointment Scheduler
   - Create appointment for a patient
   - Verify notification is created in database

2. **View notification in patient portal**:
   - Login as patient
   - Click bell icon in bottom-right corner
   - Verify notification appears with correct details
   - Mark as read/delete

3. **Update/Cancel appointment**:
   - Login as doctor
   - Update or cancel existing appointment
   - Switch to patient account
   - Verify new notification appears

## Database Schema Diagram

```
patients table
      ↓ (patientId)
patient_notifications table
      ↓ (appointmentId)
appointments table
```

## API Response Examples

### Get Notifications
```json
[
  {
    "id": 1,
    "patientId": 1,
    "appointmentId": 5,
    "type": "appointment_created",
    "title": "New Appointment Scheduled",
    "message": "Your Regular Checkup appointment has been scheduled for 2025-02-10 at 10:00. Duration: 60 minutes.",
    "isRead": false,
    "createdAt": "2025-02-03T10:30:00.000Z",
    "readAt": null
  }
]
```

### Unread Count
```json
{
  "unreadCount": 2
}
```

## Security Considerations

1. **Authentication**: All notification endpoints require JWT authentication
2. **Authorization**:
   - Patients can only view/manage their own notifications
   - Staff can view any patient's notifications
   - Only staff can create notifications
3. **Data Validation**: All inputs validated before database operations
4. **Error Handling**: Notification failures don't block appointment creation

## Future Enhancements

1. **Email/SMS Notifications**: Send notifications to patient's email or phone
2. **In-App Sound**: Play sound for new notifications
3. **Push Notifications**: Browser push notifications for real-time alerts
4. **Notification Preferences**: Let patients choose notification methods and frequency
5. **Appointment Reminders**: Auto-generate reminders 24 hours before appointment
6. **Bulk Notifications**: Staff can send custom messages to multiple patients

## Troubleshooting

**Issue**: Notifications not appearing in patient portal
- **Solution**: Check that appointments table has patientId and that patient_notifications table exists
- **Verify**: Run `SELECT * FROM patient_notifications;` in MySQL

**Issue**: Database errors when creating appointments
- **Solution**: Ensure init-db.js was run to create notifications table
- **Check**: Verify foreign key constraints are satisfied

**Issue**: Notification API returns 401 Unauthorized
- **Solution**: Ensure valid JWT token is provided in Authorization header
- **Check**: Login again to get fresh token

## Files Modified/Created

### Created:
- `backend/routes/notifications.js` - Notification API routes
- `src/components/PatientNotifications.tsx` - Notification UI component

### Modified:
- `backend/schema.sql` - Added patient_notifications table
- `backend/init-db.js` - Added table creation and initialization
- `backend/server.js` - Registered notifications route
- `backend/routes/appointments.js` - Added notification creation logic
- `src/api.js` - Added notificationAPI object
- `src/components/PatientPortal.tsx` - Integrated PatientNotifications component

## Version History
- **v1.0** - Initial implementation (Feb 2025)
  - Appointment creation notifications
  - Appointment update/cancellation notifications
  - Patient notification panel UI
  - Real-time notification polling
