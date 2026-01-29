# Employee First-Time Login & Password Reset Flow

## Overview
The system is **already configured** to require new employees to change their password on first login. After they've reset their password, they will **NOT be required to change it again**.

## How It Works

### 1. **Employee Account Creation**
When you generate credentials for a new employee:
- A user account is created with `isFirstLogin = TRUE`
- A temporary password (generated code) is provided
- The employee gets a username to log in with

**Backend Location:** `backend/routes/employees.js` (line 120)
```javascript
'INSERT INTO users (username, password, fullName, email, phone, role, position, isFirstLogin) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
[username, hashedPassword, employee.name, employee.email, employee.phone, role, employee.position, true]
```

### 2. **First Login Flow**
When a new employee logs in for the first time:

**Step 1:** Employee enters username and temporary password
```
Login Screen
├── Username: [generated username]
└── Password: [temporary generated code]
```

**Step 2:** Backend returns login response with `isFirstLogin: true`
```javascript
// backend/routes/auth.js - login response
res.json({ 
  token, 
  user: { 
    id: user.id, 
    username: user.username, 
    role: user.role, 
    fullName: user.fullName, 
    isFirstLogin: user.isFirstLogin,  // ← TRUE for new employees
    ...
  } 
});
```

**Step 3:** Frontend detects `isFirstLogin = true` and shows password change screen
```tsx
// src/components/AuthPage.tsx (line 93-94)
if (response.user.isFirstLogin) {
  setLoggedInUser(response.user);
  setShowPasswordChange(true);  // ← Show password change modal
  return;
}
```

**Step 4:** Employee sees password change form
```
┌─────────────────────────────────────────┐
│  SET YOUR PASSWORD                      │
├─────────────────────────────────────────┤
│  New Password: [____________]           │
│  Confirm Password: [____________]       │
│  [CHANGE PASSWORD]                      │
└─────────────────────────────────────────┘
```

### 3. **Password Change Completion**
When employee submits new password:

**Backend updates:**
```javascript
// backend/routes/auth.js - change-password endpoint
'UPDATE users SET password = ?, isFirstLogin = FALSE WHERE id = ?',
[hashedPassword, userId]
```

**Frontend updates localStorage:**
```tsx
// src/components/AuthPage.tsx (line 145)
const updatedUser = { ...loggedInUser, isFirstLogin: false };
localStorage.setItem('user', JSON.stringify(updatedUser));
```

### 4. **Subsequent Logins**
On next login with new password:

**Step 1:** Employee logs in normally
```
Login Screen
├── Username: [their username]
└── Password: [their new password]
```

**Step 2:** Backend returns `isFirstLogin: false`
```javascript
// isFirstLogin is FALSE since it was set to FALSE after password change
user.isFirstLogin  // FALSE
```

**Step 3:** No password change screen shown
```tsx
// src/App.tsx (line 238)
if (currentUser.isFirstLogin) {
  return <AuthPage />;  // ← This won't execute
}
// Continue to dashboard
```

**Step 4:** Employee goes directly to dashboard

## Database Changes

### Users Table Schema
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(100),
  email VARCHAR(100),
  role ENUM('doctor', 'assistant', 'patient') NOT NULL,
  position ENUM('dentist', 'assistant_dentist', 'assistant'),
  isFirstLogin BOOLEAN DEFAULT TRUE,  -- ← Key field
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

When password is changed:
```sql
UPDATE users SET 
  password = '[new_hashed_password]', 
  isFirstLogin = FALSE 
WHERE id = [user_id];
```

## Admin Steps to Create New Employee

1. Go to Employee Management
2. Add employee details (name, position, contact info)
3. Click "Generate Credentials"
4. System creates account with:
   - Unique username
   - Temporary password (generated code)
   - `isFirstLogin = TRUE`
5. Share credentials with employee:
   ```
   Username: [generated_username]
   Temporary Password: [temporary_code]
   First Login Instructions:
   - Enter your username and temporary password
   - Set a new password of your choice
   - You will then have full access to your dashboard
   ```

## Testing the Flow

### Test Scenario: New Employee First Login
1. In Employee Management, create new employee
2. Generate credentials - note the temporary password
3. Log out current user
4. Log in with new employee username and temporary password
5. ✅ Password change screen appears
6. Enter new password and confirm
7. ✅ Password change succeeds, redirected to dashboard
8. Log out
9. Log back in with new password
10. ✅ **No password change screen** - goes directly to dashboard

### Verify Database
```sql
-- Check if isFirstLogin was updated
SELECT id, username, fullName, isFirstLogin FROM users WHERE username = 'new_employee_username';

-- Before password change: isFirstLogin = 1 (TRUE)
-- After password change: isFirstLogin = 0 (FALSE)
```

## Important Notes

✅ **Already Implemented:**
- New employees required to change password on first login
- Password change form displayed when `isFirstLogin = true`
- `isFirstLogin` set to `false` after successful password change
- Subsequent logins skip password change requirement
- Secure password hashing with bcryptjs

✅ **Authentication Flow:**
- JWT tokens used for session management (24-hour expiration)
- Temporary password hashed in database
- New password hashed in database
- No plaintext passwords stored

✅ **User Experience:**
- Clear password change form on first login
- Success message after password change
- Automatic redirect to dashboard after password change
- Smooth transition from password reset to regular login

## Files Involved

**Backend:**
- `backend/routes/auth.js` - Login and password change endpoints
- `backend/routes/employees.js` - Employee credential generation
- `backend/config/database.js` - Database connection

**Frontend:**
- `src/components/AuthPage.tsx` - Login and password change UI
- `src/App.tsx` - Route logic based on `isFirstLogin`
- `src/api.js` - API calls to backend

## Conclusion

**The system is working as intended!** New employees:
1. ✅ Are required to change password on first login
2. ✅ Will NOT be forced to change password again on subsequent logins
3. ✅ Have secure password hashing throughout
4. ✅ Have 24-hour session tokens for continued access
