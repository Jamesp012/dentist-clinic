# Announcement Notifications Fix - Setup & Testing Guide

## Overview
This guide helps you set up and test the announcement notification system for the Patient Portal.

## Quick Setup (Required Steps)

### 1. **Database Schema Update** (CRITICAL)
Run this script to ensure the database is properly configured:

```bash
cd backend
node fix-notification-schema.js
```

Expected output:
```
✓ patient_notifications table is accessible
✓ Database schema verification complete!
```

### 2. **Restart Backend Server**
The backend server needs to be restarted to apply logging changes:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
node server.js
```

Look for these console messages when testing:
```
Creating notifications for announcement: { title: '...', id: ... }
Found patients: X
Successfully created X notifications
```

## Testing the Feature

### Step 1: Create Test Announcement
1. Login as **Doctor** or **Assistant**
2. Navigate to Announcement Management
3. Click "Post Announcement"
4. Fill in details:
   - Title: "Test Announcement"
   - Type: Select any type
   - Message: "This is a test notification"
5. Click "Post Announcement"

### Step 2: Verify Backend Logging
Check your backend console for:
```
Creating notifications for announcement: { title: 'Test Announcement', id: 1 }
Found patients: [number of patients]
Successfully created [number] notifications
```

If you see "No patients found to notify", this means there are no patients in the database. Create a test patient first.

### Step 3: Verify Patient Notification
1. Login as **Patient**
2. Look for **Blue Bell Icon** in bottom-right corner
3. The bell should show an unread count (red badge with number)
4. Click the bell to open notification panel
5. You should see:
   - **Notification Title**: "New Announcement: Test Announcement"
   - **Icon**: Purple megaphone 🔊
   - **Color**: Purple background
   - **Message**: Full announcement message

### Step 4: Test Navigation
1. Click on the announcement notification in the panel
2. You should be automatically navigated to **Announcements** tab
3. The notification should be marked as read
4. The bell badge should decrease by 1

## Troubleshooting

### Issue: Bell icon doesn't appear
**Solution:** 
- Clear browser cache (Ctrl+F5)
- Make sure you're logged in as a patient
- Check browser console for errors (F12 → Console tab)

### Issue: Notification appears but doesn't navigate
**Solution:**
- Check browser console for errors
- Make sure PatientPortal properly exports setActiveTab
- Verify onNavigate callback is being passed correctly

### Issue: "No patients found to notify"
**Solution:**
1. Create at least one patient account first
2. Make patient record has an ID in database
3. Run: `SELECT * FROM patients;` to verify data exists

### Issue: Database errors in console
**Solution:**
```bash
# Run this to fix schema:
cd backend
node fix-notification-schema.js

# Then restart server
node server.js
```

## Expected Flow Diagram

```
Doctor Posts Announcement
         ↓
Backend creates announcement record
         ↓
Backend queries all patients
         ↓
For each patient, INSERT into patient_notifications
         ↓
Patient's notification bell updates (5-second poll)
         ↓
Patient sees notification with:
  - Purple megaphone icon
  - "New Announcement: [title]"
  - Full message text
         ↓
Patient clicks notification
         ↓
Navigates to Announcements tab
Notification marked as read
```

## Key Files Modified

1. **Backend**:
   - `backend/routes/announcements.js` - Added notification creation with logging
   - `backend/fix-notification-schema.js` - NEW: Database verification script
   - `backend/schema.sql` - Updated ENUM type

2. **Frontend**:
   - `src/components/PatientNotifications.tsx` - Added bell button, updated icons
   - `src/components/PatientPortal.tsx` - Pass onNavigate callback

## Verification Checklist

- [ ] Ran `fix-notification-schema.js` successfully
- [ ] Backend restarted and shows no errors
- [ ] Created test announcement as doctor/assistant
- [ ] See console logs about notification creation
- [ ] Logged in as patient
- [ ] Bell icon visible in bottom-right corner
- [ ] Notification appears with correct styling
- [ ] Clicking notification navigates to announcements tab
- [ ] Notification marked as read (badge decreases)

## Next Steps If Still Not Working

1. **Check Database Directly**:
   ```bash
   mysql -u root -p dental_clinic
   SELECT * FROM patient_notifications;
   ```

2. **Check API Response**:
   - Open Browser DevTools (F12)
   - Go to Network tab
   - Create announcement
   - Filter by "announcements" in Network
   - Check response for announcements POST request

3. **Check Notifications API**:
   - Refresh patient portal
   - DevTools → Network tab
   - Filter by "notifications"
   - Should see GET requests every 5 seconds
   - Check response data

4. **Enable Additional Debugging**:
   - Open browser console (F12)
   - Check for any red errors
   - Screenshot the error and check the notification creation logs

## Support

If issues persist:
1. Run the schema fix script
2. Restart the backend server
3. Check the console logs during announcement creation
4. Verify the database has the correct schema using the troubleshooting section
