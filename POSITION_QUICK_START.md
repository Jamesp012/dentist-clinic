# Quick Reference: Position-Based Roles

## Summary
The employee management system now uses **position dropdowns** to determine which dashboard interface employees see when they log in.

## Position Options

| Position | Dashboard | Permissions |
|----------|-----------|-------------|
| **Dentist** | Doctor | Full access to patient management, treatment records, referrals, dental charting |
| **Assistant Dentist** | Doctor | Full access to patient management, treatment records, referrals, dental charting |
| **Assistant** | Assistant | Patient management, appointment scheduling, announcements, chat, service pricing |

## Steps to Add an Employee

1. **Open Employee Management**
   - Click Employee Management in the admin panel

2. **Click "Add Employee"**
   - Opens the Add Employee modal

3. **Fill in Employee Details**
   - Full Name
   - **Position** (dropdown):
     - Select "Dentist" for dentists
     - Select "Assistant Dentist" for dental assistants
     - Select "Assistant" for office assistants/receptionists
   - Phone
   - Email
   - Address
   - Date Hired

4. **Save Employee**
   - Click "Add Employee" button

5. **Generate Credentials**
   - Click the key icon next to the employee
   - System generates username & temporary password
   - Share with employee

6. **Employee Logs In**
   - Employee uses generated credentials
   - Sees appropriate dashboard based on position

## What Changed

### Before
- Position was a text field (free text input)
- Role was hardcoded during user creation

### Now
- Position is a **dropdown with 3 fixed options**
- Role is **automatically assigned** based on position:
  - Dentist & Assistant Dentist → Doctor role
  - Assistant → Assistant role

## Examples

### Adding a Dentist
1. Name: "Dr. John Smith"
2. Position: **Dentist** (from dropdown)
3. Phone: "+63 912 345 6789"
4. Email: john.smith@clinic.com
5. → When logged in: **Doctor Dashboard** appears

### Adding an Dental Assistant
1. Name: "Maria Garcia"
2. Position: **Assistant Dentist** (from dropdown)
3. Phone: "+63 912 345 6789"
4. Email: maria.garcia@clinic.com
5. → When logged in: **Doctor Dashboard** appears

### Adding a Receptionist/Office Assistant
1. Name: "Angela Santos"
2. Position: **Assistant** (from dropdown)
3. Phone: "+63 912 345 6789"
4. Email: angela.santos@clinic.com
5. → When logged in: **Assistant Dashboard** appears

## Benefits

✅ **Consistency** - All dentists and assistants have standardized positions
✅ **Automation** - No manual role assignment needed
✅ **Clarity** - Clear position options with no ambiguity
✅ **Flexibility** - Can differentiate between Assistant Dentist and general Assistant
✅ **Audit Trail** - Position stored in database for reporting

## Troubleshooting

**Q: Employee sees wrong dashboard**
A: Check their position in Employee Management. Update if needed by clicking the edit icon.

**Q: Can't change position after credentials generated**
A: Yes you can. Edit employee to change position. Next time they log in, position-based logic may apply.

**Q: Need to add a custom position**
A: Currently limited to 3 positions. Contact admin if custom positions needed.

---

**Position-based role system is active and ready to use!**
