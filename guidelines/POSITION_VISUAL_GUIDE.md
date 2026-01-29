# Position-Based Roles: Visual Guide

## Employee Management Interface

### Add Employee Modal - Position Dropdown

```
┌─────────────────────────────────────────────┐
│         Add New Employee                    │
├─────────────────────────────────────────────┤
│                                             │
│ Full Name *                                 │
│ [_____________________________]              │
│                                             │
│ Position *                    ▼             │
│ [Select a position____________]             │
│  • Dentist                                  │
│  • Assistant Dentist                        │
│  • Assistant                                │
│                                             │
│ Phone *              Email *                │
│ [_________]          [_________]            │
│                                             │
│ Address                                     │
│ [________________________________]         │
│                                             │
│ Date Hired *                                │
│ [_____________________________]              │
│                                             │
│ [Add Employee]  [Cancel]                   │
│                                             │
└─────────────────────────────────────────────┘
```

### Employee Table with Position Column

```
┌──────────────┬──────────────────┬────────────┬─────────────┐
│ Name         │ Position         │ Email      │ Status      │
├──────────────┼──────────────────┼────────────┼─────────────┤
│ Dr. John     │ Dentist          │ john@...   │ Active  ✓   │
│ Dr. Maria    │ Assistant Dentist│ maria@...  │ Active  ✓   │
│ Angela       │ Assistant        │ angela@... │ Active  ✓   │
│ Jose         │ Assistant        │ jose@...   │ No Account  │
└──────────────┴──────────────────┴────────────┴─────────────┘
```

---

## Dashboard Selection Logic

### Scenario 1: Dentist Employee

```
Employee Created
    ↓
Position: "Dentist" selected
    ↓
Generate Credentials Clicked
    ↓
System Mapping:
  Position = dentist
  → Role = doctor
    ↓
User Account Created:
  - Username: john.smith
  - Role: doctor
  - Position: dentist
    ↓
Employee Logs In
    ↓
App.tsx Checks:
  if (role === 'doctor' OR position === 'dentist') 
    ↓
DOCTOR DASHBOARD SHOWN ✓
├─ Patient Management
├─ Appointment Scheduler
├─ Dental Charting
├─ Referral Generation
├─ Inventory Management
└─ Financial Reports
```

### Scenario 2: Assistant Dentist Employee

```
Employee Created
    ↓
Position: "Assistant Dentist" selected
    ↓
Generate Credentials Clicked
    ↓
System Mapping:
  Position = assistant_dentist
  → Role = doctor
    ↓
User Account Created:
  - Username: maria.garcia
  - Role: doctor
  - Position: assistant_dentist
    ↓
Employee Logs In
    ↓
App.tsx Checks:
  if (role === 'doctor' OR position === 'assistant_dentist')
    ↓
DOCTOR DASHBOARD SHOWN ✓
├─ Patient Management
├─ Appointment Scheduler
├─ Dental Charting
├─ Referral Generation
├─ Inventory Management
└─ Financial Reports
```

### Scenario 3: Assistant Employee

```
Employee Created
    ↓
Position: "Assistant" selected
    ↓
Generate Credentials Clicked
    ↓
System Mapping:
  Position = assistant
  → Role = assistant
    ↓
User Account Created:
  - Username: angela.santos
  - Role: assistant
  - Position: assistant
    ↓
Employee Logs In
    ↓
App.tsx Checks:
  if (role === 'assistant' OR position === 'assistant')
    ↓
ASSISTANT DASHBOARD SHOWN ✓
├─ Patient Management
├─ Appointment Scheduler
├─ Announcements
├─ Patient Chat
├─ Service Pricing
└─ Notifications
```

---

## Database Structure

### Users Table

```sql
┌────────────────────────────────────────────┐
│ users table                                │
├────────────────────────────────────────────┤
│ id (INT)                   [1]             │
│ username (VARCHAR)         ['john.smith']  │
│ password (VARCHAR hashed)  [***hash***]    │
│ fullName (VARCHAR)         ['Dr. John']    │
│ email (VARCHAR)            ['john@...']    │
│ phone (VARCHAR)            ['+63...']      │
│ role (ENUM)                ['doctor']      │
│ position (ENUM)            ['dentist']     │◄─ NEW
│ isFirstLogin (BOOLEAN)     [FALSE]         │
│ createdAt (TIMESTAMP)      ['2026-01-19']  │
└────────────────────────────────────────────┘
```

### Employees Table

```sql
┌────────────────────────────────────────────┐
│ employees table                            │
├────────────────────────────────────────────┤
│ id (INT)                   [5]             │
│ user_id (INT FK)           [1]             │
│ name (VARCHAR)             ['Dr. John']    │
│ position (ENUM)            ['dentist']     │◄─ CHANGED
│ phone (VARCHAR)            ['+63...']      │
│ email (VARCHAR)            ['john@...']    │
│ address (TEXT)             ['123 Main St'] │
│ dateHired (DATE)           ['2026-01-01']  │
│ generatedCode (VARCHAR)    ['ABC123DE']    │
│ isCodeUsed (BOOLEAN)       [TRUE]          │
│ createdAt (TIMESTAMP)      ['2026-01-19']  │
└────────────────────────────────────────────┘
```

---

## Code Flow Example

### 1. Creating Employee with Position Dropdown

```tsx
// In EmployeeManagement.tsx
<select name="position" required>
  <option value="">Select a position</option>
  <option value="dentist">Dentist</option>
  <option value="assistant_dentist">Assistant Dentist</option>
  <option value="assistant">Assistant</option>
</select>
```

### 2. Backend Mapping Position to Role

```javascript
// In employees.js
const employee = employees[0];

// Map position to role
let role = 'assistant';
if (employee.position === 'dentist' || 
    employee.position === 'assistant_dentist') {
  role = 'doctor';
}

// Create user with position
const [userResult] = await pool.query(
  'INSERT INTO users (..., role, position, ...) 
   VALUES (..., ?, ?, ...)',
  [..., role, employee.position, ...]
);
```

### 3. Frontend Dashboard Routing

```tsx
// In App.tsx
if (currentUser.role === 'doctor' || 
    currentUser.position === 'dentist' || 
    currentUser.position === 'assistant_dentist') {
  return <DoctorDashboard {...props} />;
}

if (currentUser.role === 'assistant' || 
    currentUser.position === 'assistant') {
  return <AssistantDashboard {...props} />;
}
```

---

## Position Matrix

```
┌─────────────────┬──────────────┬─────────────────────────┐
│ Position        │ User Role    │ Dashboard               │
├─────────────────┼──────────────┼─────────────────────────┤
│ Dentist         │ doctor       │ 👨‍⚕️ Doctor Dashboard     │
│ Assistant       │ doctor       │ 👨‍⚕️ Doctor Dashboard     │
│ Dentist         │ assistant    │ 👩‍💼 Assistant Dashboard   │
└─────────────────┴──────────────┴─────────────────────────┘
```

---

## Important Notes

🔹 **Position is the source of truth** for determining dashboard
- Both position in dropdown AND database role are used
- Fallback: If position not set, role determines dashboard

🔹 **Backward Compatible**
- Old employees without position field still work
- Role-based routing still active

🔹 **Position Field**
- Stored in users table for quick reference
- Stored in employees table for record keeping

🔹 **Automatic Mapping**
- No manual role assignment needed
- Position automatically determines role on credential generation

---

## Troubleshooting Flowchart

```
Employee sees wrong dashboard?
    ↓
Check position in Employee Management
    ├─ Position incorrect?
    │   └─ Edit → Change position → Save
    │       (Next login will show correct dashboard)
    │
    └─ Position correct?
        └─ Check users table in database
            ├─ Role field matches position?
            │   ├─ YES → Check App.tsx routing logic
            │   └─ NO → Regenerate credentials
            │
            └─ Position field in users table populated?
                ├─ YES → Clear browser cache & reload
                └─ NO → Position might not be saved
```

---

**Visual guide complete! Ready for implementation.**
