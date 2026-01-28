# 🚀 Quick Start Guide

## Step 1: Start MySQL from XAMPP
1. Open **XAMPP Control Panel**
2. Click **Start** next to **MySQL**
3. Wait until it shows "Running" with green indicator
4. Do NOT close XAMPP Control Panel (keep it running in background)

## Step 2: Reset Database & Users
Open PowerShell in the backend folder and run:
```powershell
cd "C:\xampp\htdocs\DENTAL WEBSITE1\backend"
node start-and-reset.js
```

You should see:
```
✓ Connected to MySQL
✓ Database reset successfully!

Test Credentials:
  Doctor:    doctor / doctor123 (Dr. Joseph Maaño)
  Assistant: assistant / assistant123 (Maria Santos)
```

## Step 3: Start Backend Server
In the same PowerShell window (or new one), run:
```powershell
node server.js
```

You should see: `Server running on port 5000`

## Step 4: Start Frontend
Open **another** PowerShell window in the root folder:
```powershell
cd "C:\xampp\htdocs\DENTAL WEBSITE1"
npm run dev
```

Browser should open to `http://localhost:5173`

## Step 5: Login
- **Doctor**: username `doctor`, password `doctor123`
- **Assistant**: username `assistant`, password `assistant123`

## ✅ Now You Can:
- Change doctor/assistant username and password in Settings
- Changes are saved to database
- Works across all roles (doctor, assistant, patient)

---

## 🔧 Troubleshooting

### Can't login?
- Check MySQL is running (netstat -ano | findstr ":3306" should show port 3306)
- Check backend is running (http://localhost:5000/api/auth/check-username?username=test should return {"available":true})
- Run `node start-and-reset.js` again to reset users

### Settings update fails?
- Same as above - MySQL must be running
- Check browser console (F12) for error message

### Port already in use?
- Backend port 5000: `Get-Process node | Stop-Process -Force` then restart `node server.js`
- Frontend port 5173: Use different port with `npm run dev -- --port 5174`
