# Access Level Management - Quick Start Guide

## What is Access Level?

Access Level controls which portal interface an employee sees after login:
- **Super Admin** → Doctor Portal
- **Admin** → Assistant Portal  
- **Default Accounts** → Falls back to role-based routing

## Where to Find It

**In Employee Management**:
1. Go to **Employee Management** module
2. Click **Add Employee** button
3. Fill in employee details
4. Select **Access Level** from dropdown (new field)
5. Click **Add Employee**

To manage existing employee's access level:
1. Go to **Employee Management** module
2. Find the employee in the table
3. Click the edit icon (pencil) next to their name
4. Change the **Access Level** field
5. Click **Update**

## How It Works

### Important Rule
**Position does NOT control portal access anymore. Only Access Level does.**

Examples:
- Position = Doctor, Access Level = Admin → Employee sees Assistant Portal
- Position = Assistant, Access Level = Super Admin → Employee sees Doctor Portal

### Login Flow
1. Employee logs in with their username and OTP (temporary password)
2. System reads their Access Level from the database
3. User is directed to:
   - Doctor Portal if Access Level = Super Admin
   - Assistant Portal if Access Level = Admin
   - Based on role if Access Level = Default Accounts

### Default Assignments
These accounts are automatically set:
- **Dr. Joseph Maaño** = Super Admin (always)
- **Almira** = Admin (always)

### New Employees
When you create a new employee:
- Default Access Level = **Default Accounts**
- You can change it immediately in the Add form
- Or edit it later from the Employee Management table

## Database Setup

If you're using an existing database (pre-implementation):

```bash
cd backend
node migrate-access-level.js
```

This will:
1. Add the accessLevel column to the database
2. Set Dr. Joseph to Super Admin
3. Set Almira to Admin

For new installations, the field is already in the schema.

## Testing the Feature

### Test Case 1: Create Admin User
1. Add new employee "Jane Doe"
2. Select Position = "Dentist"  
3. Select Access Level = "Admin"
4. Generate login credentials
5. Login as Jane
6. ✓ Should see Assistant Portal (not Doctor Portal!)

### Test Case 2: Create Super Admin User
1. Add new employee "John Smith"
2. Select Position = "Assistant"
3. Select Access Level = "Super Admin"
4. Generate login credentials
5. Login as John
6. ✓ Should see Doctor Portal (not Assistant Portal!)

### Test Case 3: Edit Access Level
1. Find an existing employee in the table
2. Click edit icon
3. Change Access Level to a different option
4. Save changes
5. Have them logout and login again
6. ✓ Portal should match the new Access Level

## FAQ

**Q: What if an employee already has access but I change their Access Level?**
A: They'll see the new portal on their next login. Current session is not affected.

**Q: Can I edit Dr. Joseph's Access Level?**
A: Yes, but it will automatically revert to Super Admin when credentials are regenerated. If you need to change it permanently, edit the database directly.

**Q: What happens to Position field?**
A: It remains for record-keeping purposes only. It no longer controls which portal is shown.

**Q: What if accessLevel is not set (NULL)?**
A: System falls back to role-based routing (backward compatible).

**Q: Are changes visible immediately?**
A: No, the new Access Level takes effect on next login.

**Q: Does this affect Patients?**
A: No. Patients are unaffected. Only employee portals are affected.

## Table Display

In the Employee Management table, you'll see:
- Name
- Position
- **Access Level** (NEW) - Color coded:
  - 🟪 Purple = Super Admin
  - 🟦 Blue = Admin
  - ⬜ Gray = Default Accounts
- Email
- Phone
- Date Hired
- Account Status
- Actions (Edit, Delete, Generate Credentials)
