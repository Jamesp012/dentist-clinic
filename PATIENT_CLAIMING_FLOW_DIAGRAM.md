# Patient Record Claiming - User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PATIENT SIGNUP                            │
│                  (Click "Sign Up" → Fill Form)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Do you have existing record?                    │
│                                                                   │
│         ┌──────────────┐              ┌──────────────┐          │
│         │   YES        │              │    NO        │          │
│         │ I have record│              │   I'm new    │          │
│         └──────┬───────┘              └──────┬───────┘          │
└────────────────┼──────────────────────────────┼─────────────────┘
                 │                               │
                 │                               │
    ┌────────────▼────────────┐         ┌────────▼────────────┐
    │  CLAIMING FLOW          │         │ NORMAL REGISTRATION │
    │  (Record Linking)       │         │ (New Patient)       │
    └────────────┬────────────┘         └────────┬────────────┘
                 │                               │
                 │                               │
    ┌────────────▼────────────┐                 │
    │   SEARCH FORM           │                 │
    │                         │                 │
    │  • Full Name            │                 │
    │  • Date of Birth        │                 │
    │  • Mobile Number        │                 │
    │                         │                 │
    │  [Search My Record]     │                 │
    └────────────┬────────────┘                 │
                 │                               │
                 ▼                               │
    ┌────────────────────────┐                  │
    │   SEARCH RESULTS       │                  │
    └────────────┬───────────┘                  │
                 │                               │
         ┌───────┴────────┬──────────┐          │
         │                │          │          │
    ┌────▼────┐    ┌─────▼─────┐ ┌──▼──────┐  │
    │NO MATCH │    │1  MATCH   │ │MULTIPLE │  │
    │         │    │           │ │MATCHES  │  │
    └────┬────┘    └─────┬─────┘ └──┬──────┘  │
         │               │           │          │
         │               │      ┌────▼─────┐   │
         │               │      │ SELECT   │   │
         │               │      │ YOUR     │   │
         │               │      │ RECORD   │   │
         │               │      └────┬─────┘   │
         │               │           │          │
    ┌────▼───────────────┴───────────▼──────┐  │
    │  Show Error:                           │  │
    │  "No record found"                     │  │
    │                                        │  │
    │  → Go back to initial question         │  │
    │  → Choose "No, I'm new" ───────────────┼──┘
    └────────────────────────────────────────┘  │
                                                 │
         ┌───────────────────────────────────────┘
         │
    ┌────▼────────────────┐
    │  SEND OTP           │
    │                     │
    │  SMS to:            │
    │  (555) ***-4567     │
    │                     │
    │  Code: 123456       │
    └────────┬────────────┘
             │
             ▼
    ┌────────────────────┐
    │  OTP VERIFICATION  │
    │                    │
    │  [_ _ _ _ _ _]     │
    │  Enter 6-digit code│
    │                    │
    │  [Verify Code]     │
    │  [Resend Code]     │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │  CREATE ACCOUNT    │
    │                    │
    │  • Username        │
    │  • Password        │
    │  • Confirm Pass    │
    │  • Email (opt)     │
    │                    │
    │  [Complete Setup]  │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │     SUCCESS!       │
    │                    │
    │  ✓ Account linked  │
    │  ✓ Auto-login      │
    │  ✓ View records    │
    └────────┬───────────┘
             │
             │
┌────────────▼────────────────────────────────────────────────┐
│           PATIENT DASHBOARD                                  │
│                                                              │
│  • View all historical records (2025–present)                │
│  • Schedule new appointments                                 │
│  • Access medical history                                    │
│  • Update personal information                               │
└──────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════
                    SECURITY CHECKPOINTS
═══════════════════════════════════════════════════════════════

1. SEARCH
   ✓ Only searches records with has_account = FALSE
   ✓ Requires exact match on DOB and phone
   ✓ Name fuzzy matching with LIKE

2. OTP VERIFICATION
   ✓ 6-digit random code
   ✓ Sent to phone number on record (not user input)
   ✓ Expires after 10 minutes
   ✓ One-time use (marked verified after use)

3. ACCOUNT CREATION
   ✓ Username uniqueness check
   ✓ Password hashing (bcrypt, 10 rounds)
   ✓ Transaction ensures atomic linking
   ✓ Updates has_account = TRUE

4. POST-LINKING
   ✓ Patient can only access own records (via patientId in JWT)
   ✓ Record cannot be claimed by another account

═══════════════════════════════════════════════════════════════
                      DATABASE STATES
═══════════════════════════════════════════════════════════════

BEFORE CLAIMING:
patients table:
┌────┬──────────┬─────────┬────────────────┬──────────────┐
│ id │ name     │ user_id │ phone          │ has_account  │
├────┼──────────┼─────────┼────────────────┼──────────────┤
│ 1  │ John Doe │ NULL    │ (555) 123-4567 │ FALSE        │
└────┴──────────┴─────────┴────────────────┴──────────────┘

AFTER CLAIMING:
users table:
┌────┬──────────┬──────────┬──────┐
│ id │ username │ fullName │ role │
├────┼──────────┼──────────┼──────┤
│ 10 │ johndoe  │ John Doe │ pat. │
└────┴──────────┴──────────┴──────┘

patients table:
┌────┬──────────┬─────────┬────────────────┬──────────────┐
│ id │ name     │ user_id │ phone          │ has_account  │
├────┼──────────┼─────────┼────────────────┼──────────────┤
│ 1  │ John Doe │ 10      │ (555) 123-4567 │ TRUE         │
└────┴──────────┴─────────┴────────────────┴──────────────┘

═══════════════════════════════════════════════════════════════
                      API SEQUENCE
═══════════════════════════════════════════════════════════════

Frontend                         Backend
   │                                │
   │  POST /search                  │
   ├───────────────────────────────>│
   │  {name, dob, phone}            │
   │                                │ [Search DB]
   │                                │ [Check has_account]
   │  Result: Found 1 match         │
   │<───────────────────────────────┤
   │  {patientId: 1}                │
   │                                │
   │  POST /send-otp                │
   ├───────────────────────────────>│
   │  {patientId: 1}                │
   │                                │ [Generate OTP]
   │                                │ [Store in DB]
   │                                │ [Send SMS]
   │  OTP sent!                     │
   │<───────────────────────────────┤
   │                                │
   │  POST /verify-and-link         │
   ├───────────────────────────────>│
   │  {patientId, otp, userData}    │
   │                                │ [Verify OTP]
   │                                │ [Check expiration]
   │                                │ [BEGIN TRANSACTION]
   │                                │ [Create user]
   │                                │ [Link user_id]
   │                                │ [Set has_account]
   │                                │ [COMMIT]
   │                                │ [Generate JWT]
   │  Success + Token               │
   │<───────────────────────────────┤
   │                                │
   │  Login → Dashboard             │
   │                                │
