# How to Fix "Create Rule" Not Working

## Problem
When you click "Create Rule", you see a 404 error or "Cannot connect to backend" message.

## Solution: Start the Backend Server

The backend server must be running for the auto-reduction feature to work. Follow these steps:

### Option 1: Use the Batch File (Windows - Easiest)
1. Double-click `start-backend.bat` file in the project root directory
2. Wait for the message "Server running on port 5000"
3. Go back to your browser and try creating a rule again

### Option 2: Manual Command Line

#### On Windows (PowerShell or CMD):
```bash
cd backend
npm start
```

#### On Mac/Linux:
```bash
cd backend
npm start
```

Wait for the message: **"Server running on port 5000"**

### Option 3: Check if Backend is Already Running

Open a new PowerShell/Terminal and run:
```bash
curl http://localhost:5000/api/health
```

If you see `{"status":"OK"}`, the backend is already running.

If you get an error like "Cannot connect", the backend is NOT running and you need to start it.

## Step-by-Step to Create a Rule

1. **Make sure both servers are running:**
   - Frontend: `npm run dev` (port 5173)
   - Backend: `npm start` in the backend folder (port 5000)

2. **Open the Inventory Management page and go to "Auto-Reduction Settings" tab**

3. **Select an appointment type** from the dropdown
   - Example: "Dental consultation"

4. **Add items to the rule:**
   - Select an item from the "Item" dropdown
   - Enter the quantity (can be 0 or higher)
   - Click "+ Add Item" button
   - Repeat for more items

5. **Click "Create Rule"**
   - Button will show "Creating..." while processing
   - You'll see a success message
   - Form will clear automatically

6. **Your rule appears in "Existing Rules" section below**

## Troubleshooting

### Still Getting 404 Error?
- Check that the backend terminal shows "Server running on port 5000"
- Make sure you're using `localhost:5000` (not a different port)
- Try restarting the backend server

### Form Not Clearing?
- Check the browser console (F12) for error messages
- Look at the backend terminal for database errors
- The database tables might not exist - contact support

### Items Not Appearing in Dropdown?
- Make sure you have inventory items created first
- Go to the "Overview" tab to add inventory items if needed

## Need More Help?

Check the browser console (F12 → Console tab) for error messages that can help diagnose the issue.
