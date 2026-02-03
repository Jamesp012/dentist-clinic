# Access Level Management Feature Implementation

## Overview
The Access Level Management feature has been implemented to control portal access based on employee access levels rather than position. This allows fine-grained control over which portal (Doctor or Assistant) each employee accesses after login.

## What Changed

### 1. Database Schema Updates
- Added `accessLevel` ENUM column to `users` table
  - Values: 'Admin', 'Super Admin', 'Default Accounts'
  - Default: 'Default Accounts'
- Added `accessLevel` ENUM column to `employees` table for consistency

### 2. Backend Changes

#### `/backend/routes/auth.js`
- Updated login endpoint to return `accessLevel` in JWT token and response
- User object now includes `accessLevel` field

#### `/backend/routes/employees.js`
- **POST /api/employees**: Now accepts and saves `accessLevel` from request
- **PUT /api/employees/:id**: Now accepts and updates `accessLevel` for both employee and user records
- **POST /api/employees/:id/generate-credentials**: 
  - Sets accessLevel when creating user account
  - **Default values**: 
    - Dr. Joseph Maaño or 'Dr. Joseph' → Always 'Super Admin'
    - Almira → Always 'Admin'
    - All others → 'Default Accounts' (or whatever is specified)

### 3. Frontend Changes

#### `/src/components/AuthPage.tsx`
- Updated `User` type to include `accessLevel` field
- Type: `'Admin' | 'Super Admin' | 'Default Accounts'`

#### `/src/components/EmployeeManagement.tsx`
- Updated `Employee` type to include `accessLevel` field
- Added Access Level field to Add Employee form (dropdown)
- Added Access Level field to Edit Employee form (dropdown)
- Added Access Level column to employee table display with color coding:
  - Super Admin: Purple badge
  - Admin: Blue badge
  - Default Accounts: Gray badge
- Table colspan updated to reflect new column

#### `/src/App.tsx`
- **Routing Logic Changed**:
  - **OLD**: Routed based on `role` and `position`
  - **NEW**: Routes based on `accessLevel` with fallback to `role`
  
- **New Routing Rules**:
  - `accessLevel === 'Super Admin'` → **Doctor Portal**
  - `accessLevel === 'Admin'` → **Assistant Portal**
  - `role === 'doctor'` → **Doctor Portal** (fallback for backward compatibility)
  - `role === 'assistant'` → **Assistant Portal** (fallback for backward compatibility)

### 4. Key Features

✓ **Manage Access Section** in Employee Management:
- View all employees with their current access levels
- Edit employee access level through edit modal
- Visual indicators for access levels using color-coded badges

✓ **Default Rules**:
- Dr. Joseph Maaño account automatically gets 'Super Admin' access
- Almira account automatically gets 'Admin' access
- All new employees get 'Default Accounts' unless specified

✓ **Position Independence**:
- Position field remains unchanged and serves no role in routing
- Example: A Doctor with 'Admin' access level will see Assistant Portal
- Example: An Assistant with 'Super Admin' access level will see Doctor Portal

✓ **Backward Compatibility**:
- If accessLevel is not set, falls back to role-based routing
- Existing systems continue to work without immediate migration

## Migration Guide

### For Existing Databases

Run the migration script to add the accessLevel column:

```bash
cd backend
node migrate-access-level.js
```

This script:
1. Adds `accessLevel` column to both `users` and `employees` tables
2. Sets Dr. Joseph Maaño to 'Super Admin'
3. Sets Almira to 'Admin'
4. Defaults all others to 'Default Accounts'

### For New Installations

The schema.sql already includes the `accessLevel` field, so no migration is needed.

## API Changes

### Login Response

**Before**:
```json
{
  "token": "...",
  "user": {
    "id": 1,
    "username": "doctor",
    "role": "doctor",
    "fullName": "Dr. Joseph Maaño",
    "email": "doctor@clinic.com",
    "isFirstLogin": false,
    "patientId": null
  }
}
```

**After**:
```json
{
  "token": "...",
  "user": {
    "id": 1,
    "username": "doctor",
    "role": "doctor",
    "fullName": "Dr. Joseph Maaño",
    "email": "doctor@clinic.com",
    "accessLevel": "Super Admin",
    "isFirstLogin": false,
    "patientId": null
  }
}
```

### Add/Update Employee Endpoints

**POST /api/employees**:
```json
{
  "name": "Jane Smith",
  "position": "dentist",
  "phone": "+63-9123-456-789",
  "email": "jane@clinic.com",
  "address": "123 Medical Plaza",
  "dateHired": "2024-01-15",
  "accessLevel": "Super Admin"  // NEW
}
```

**PUT /api/employees/:id**:
```json
{
  "name": "Jane Smith",
  "position": "dentist",
  "phone": "+63-9123-456-789",
  "email": "jane@clinic.com",
  "address": "123 Medical Plaza",
  "dateHired": "2024-01-15",
  "accessLevel": "Admin"  // NEW - Can be updated
}
```

## Landing Page & Authentication

- Landing Page behavior remains **unchanged**
- Same for all users regardless of role or access level
- Authentication flow is unchanged

## What Was NOT Changed

✓ Position field in Employee Management remains as-is
✓ Patient Portal and Patients module are unaffected
✓ All other system features/modules remain unchanged
✓ Landing Page and its behavior
✓ Appointment scheduling, treatment records, payments, etc.

## Testing Checklist

- [ ] Create new employee with 'Admin' access level
  - Verify they see Assistant Portal after login
- [ ] Create new employee with 'Super Admin' access level
  - Verify they see Doctor Portal after login
- [ ] Create new employee with 'Default Accounts' access level
  - Verify they see appropriate portal based on role fallback
- [ ] Edit existing employee's access level
  - Verify the change takes effect on next login
- [ ] Verify Dr. Joseph Maaño has 'Super Admin' access
- [ ] Verify Almira has 'Admin' access
- [ ] Test that Position field doesn't affect portal routing
- [ ] Verify OTP-based login still works correctly
- [ ] Test backward compatibility with existing users

## Notes for Developers

1. The `accessLevel` in the database takes precedence over `role` for portal routing
2. When no `accessLevel` is set (null), the system falls back to role-based routing
3. Both `users` and `employees` tables store `accessLevel` for data consistency
4. The JWT token includes `accessLevel` for immediate client-side access control
5. All Employee Management operations (add, edit, view) now handle the access level field
