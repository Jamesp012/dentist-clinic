# Photo Upload Feature - Quick Start Guide

## For Assistants: Upload Patient Photos

### Step-by-Step Guide

1. **Login to Assistant Portal**
   - Username: `assistant`
   - Password: (your password)

2. **Navigate to Patient Photos**
   - Look for the menu on the left sidebar
   - Click on "Patient Photos" option

3. **Upload a Photo**
   - Select a patient from the dropdown menu
   - Choose photo type:
     - **Before Treatment**: Photos showing the initial condition
     - **After Treatment**: Photos showing results after treatment
     - **X-Ray**: Dental X-ray images
   - Click the file input to select an image from your computer
   - (Optional) Add notes about the photo
   - Click "Upload Photo to Patient" button
   - Wait for confirmation message

4. **View Uploaded Photos**
   - Recent photos appear in the "Recent Patient Photos" section
   - Shows patient name, type, date, and notes

### Supported Image Formats
- JPG/JPEG
- PNG
- GIF
- WebP
- Any standard image format

### Image Size Recommendations
- Maximum recommended: 5-10 MB per image
- The system can handle up to 50 MB per image
- Larger files may take longer to upload
- Consider resizing very large images before uploading

---

## For Patients: View Your Photos in Patient Portal

### Step-by-Step Guide

1. **Login to Patient Portal**
   - Enter your username and password

2. **View Your Photos**
   - In the left sidebar menu, click "Photos"
   - Your photos appear in a grid view
   - Each photo shows:
     - The actual image
     - Type badge (Before/After/X-Ray)
     - Upload date

3. **View Photo Details**
   - Click on any photo to see a larger preview
   - Notes added by clinic staff are visible
   - Shows upload date

### Notes
- Photos are uploaded by clinic staff (assistants/doctors)
- You cannot upload photos yourself through the patient portal
- All photos appear in real-time once uploaded by clinic staff
- Photos are organized chronologically (newest first)

---

## Real-Time Synchronization

✅ **Instant Updates**: When an assistant uploads a photo, it appears in the patient portal immediately (no page refresh needed)

✅ **Persistent Storage**: Photos are stored in the database and persist across sessions

✅ **Offline Support**: Photos are cached locally, so they appear even if temporarily offline

---

## Troubleshooting

### Photo Upload Fails
- Ensure you've selected both a patient and an image file
- Check your file is an actual image (jpg, png, etc.)
- Try a smaller image file
- Refresh the page and try again

### Photos Don't Appear in Patient Portal
- Click the "Photos" tab to refresh
- Ensure you're looking at the correct patient record
- Try logging out and back in
- Check browser console for error messages (F12)

### File Selection Doesn't Work
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Ensure JavaScript is enabled
- Try a different browser if the issue persists

---

## Key Features Implemented

✅ File upload with preview
✅ Photo type categorization (Before/After/X-Ray)
✅ Optional notes for context
✅ Real-time sync between portals
✅ Database persistence
✅ Image preview modal
✅ Loading indicators
✅ Error messages and alerts

---

## Support

If you encounter issues:
1. Check that the server is running (`npm run dev` for frontend, `node server.js` for backend)
2. Verify you have a valid login session
3. Check browser console for specific error messages
4. Ensure database is properly initialized

For additional help, refer to PHOTO_UPLOAD_IMPLEMENTATION.md for technical details.
