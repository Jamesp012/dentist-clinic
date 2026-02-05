# Global Scrollbar Styling - Visual Examples

## Color Palette

### Light Theme (Default)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SCROLLBAR COMPONENT BREAKDOWN - LIGHT THEME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Track (Background):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #EEF2F4 - Light neutral gray                                            │
  │ CSS: --dental-neutral-100                                               │
  │ Usage: Scrollbar track background                                       │
  │ Appears: Behind the scrollbar thumb                                     │
  └─────────────────────────────────────────────────────────────────────────┘

  Default Thumb (Inactive):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #C5D3D9 - Medium neutral gray                                           │
  │ CSS: --dental-neutral-300                                               │
  │ Usage: Main scrollbar handle                                            │
  │ Appears: Always visible on scrollable content                           │
  │ Example visualization:                                                  │
  │   ┌──────────────────────────┐                                          │
  │   │                     █████│  ← Scrollbar thumb                       │
  │   │ Content Area        █████│                                          │
  │   │                     █████│                                          │
  │   │                          │                                          │
  │   └──────────────────────────┘                                          │
  └─────────────────────────────────────────────────────────────────────────┘

  Hover Thumb (Mouse Over):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #9DAEB5 - Darker neutral gray                                           │
  │ CSS: --dental-neutral-400                                               │
  │ Usage: Scrollbar when hovering                                          │
  │ Appears: On mouse hover                                                 │
  │ Effect: Visual feedback that scrollbar is interactive                   │
  │ Transition: 0.3s ease                                                   │
  │ Example visualization:                                                  │
  │   ┌──────────────────────────┐                                          │
  │   │                     ██████│  ← Darker thumb on hover                │
  │   │ Content Area        ██████│                                          │
  │   │                     ██████│                                          │
  │   │                          │                                          │
  │   └──────────────────────────┘                                          │
  └─────────────────────────────────────────────────────────────────────────┘

  Active Thumb (Dragging):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #6B7F88 - Dark neutral gray                                             │
  │ CSS: --dental-neutral-500                                               │
  │ Usage: Scrollbar while being dragged                                    │
  │ Appears: On active click/drag                                           │
  │ Effect: Maximum visibility during interaction                           │
  │ Example visualization:                                                  │
  │   ┌──────────────────────────┐                                          │
  │   │                     ███████│  ← Darkest thumb while active          │
  │   │ Content Area        ███████│                                          │
  │   │                     ███████│                                          │
  │   │                          │                                          │
  │   └──────────────────────────┘                                          │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Dark Theme (Automatic)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SCROLLBAR COMPONENT BREAKDOWN - DARK THEME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Track (Background):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #1F2B30 - Dark neutral gray                                             │
  │ CSS: --dental-neutral-800                                               │
  │ Usage: Scrollbar track background                                       │
  │ Appears: Behind the scrollbar thumb                                     │
  │ Effect: Blends with dark UI background                                  │
  └─────────────────────────────────────────────────────────────────────────┘

  Default Thumb (Inactive):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #4D5F68 - Medium-dark neutral gray                                      │
  │ CSS: --dental-neutral-600                                               │
  │ Usage: Main scrollbar handle                                            │
  │ Appears: Always visible on scrollable content                           │
  │ Contrast: Higher than light theme for visibility on dark background     │
  │ Example visualization:                                                  │
  │   ┌──────────────────────────┐                                          │
  │   │                     ███████│  ← Light thumb on dark background      │
  │   │ Dark Content Area   ███████│                                          │
  │   │                     ███████│                                          │
  │   │                          │                                          │
  │   └──────────────────────────┘                                          │
  └─────────────────────────────────────────────────────────────────────────┘

  Hover Thumb (Mouse Over):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #6B7F88 - Lighter neutral gray                                          │
  │ CSS: --dental-neutral-500                                               │
  │ Usage: Scrollbar when hovering                                          │
  │ Appears: On mouse hover                                                 │
  │ Effect: Even brighter for better interactivity feedback                 │
  │ Transition: 0.3s ease                                                   │
  │ Example visualization:                                                  │
  │   ┌──────────────────────────┐                                          │
  │   │                     ████████│  ← Brighter thumb on hover            │
  │   │ Dark Content Area   ████████│                                          │
  │   │                     ████████│                                          │
  │   │                          │                                          │
  │   └──────────────────────────┘                                          │
  └─────────────────────────────────────────────────────────────────────────┘

  Active Thumb (Dragging):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ #9DAEB5 - Light neutral gray                                            │
  │ CSS: --dental-neutral-400                                               │
  │ Usage: Scrollbar while being dragged                                    │
  │ Appears: On active click/drag                                           │
  │ Effect: Maximum visibility and clear feedback                           │
  │ Example visualization:                                                  │
  │   ┌──────────────────────────┐                                          │
  │   │                     █████████│  ← Brightest thumb while active      │
  │   │ Dark Content Area   █████████│                                          │
  │   │                     █████████│                                          │
  │   │                          │                                          │
  │   └──────────────────────────┘                                          │
  └─────────────────────────────────────────────────────────────────────────┘
```

## Component Examples

### 1. Page Body Scrollbar
```
┌─────────────────────────────────────────────────────────────────────────┐
│  DENTAL MANAGEMENT SYSTEM                                         ╱╲╱╲╱╲│
├─────────────────────────────────────────────────────────────────────────┤
│  Dashboard > Overview                                              █████│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                   █████│
│  Welcome back, Dr. Smith!                                         █████│
│                                                                   █████│
│  Today's Schedule:                                               █████│
│  • 9:00 AM  - Patient Consultation                               █████│
│  • 10:30 AM - Dental Checkup                                     █████│
│  • 2:00 PM  - Surgery                                            █████│
│                                                                   █████│
│  Recent Appointments:                                            █████│
│  [Table content with scroll...]                                 █████│
│                                                                   █████│
│  Financial Overview:                                            █████│
│  [Chart with scroll...]                                          █████│
│                                                                   █████│
└─────────────────────────────────────────────────────────────────────────┘
       ↑
    Scrollbar always visible on main page
```

### 2. Modal/Dialog with Scrollable Content
```
┌──────────────────────────────────────┐
│  ✕  NEW PATIENT REGISTRATION          │
├──────────────────────────────────────┤
│                                   █│
│  First Name: ________________    █│
│  Last Name:  ________________    █│
│  Email:      ________________    █│
│  Phone:      ________________    █│
│  Address:    ________________    █│
│                                   █│
│  Medical History:                 █│
│  ☐ Diabetes                        █│
│  ☐ Heart Disease                   █│
│  ☐ High Blood Pressure             █│
│  ☐ Allergies                       █│
│  [More options...]                 █│
│                                   █│
│  Insurance Information:           █│
│  Provider: ________________        █│
│  Plan: ____________________        █│
│  ID: ______________________        █│
│  [More fields...]                 █│
│                                   █│
│                                   █│
│  ┌─────────────────────────────┐  │
│  │     CANCEL      SAVE        │  │
│  └─────────────────────────────┘  │
└──────────────────────────────────────┘
        ↑
    Dialog scrollbar ALWAYS visible,
    never auto-hides, even when not
    scrolling
```

### 3. Sidebar/Drawer with Scrollbar
```
SIDE PANEL (Drawer)
┌──────────────────┐
│  ☰ NAVIGATION    │
├──────────────────┤
│                █│
│ Dashboard      █│
│ Patients       █│
│ Appointments   █│
│ Inventory      █│
│ Finances       █│
│ Staff          █│
│ Reports        █│
│ Settings       █│
│ Help & Support █│
│ About          █│
│ Logout         █│
│                █│
│                █│
│                █│
│                █│
└──────────────────┘
      ↑
   Sidebar scrollbar visible
   when content overflows
```

### 4. Table with Scrollable Content
```
┌─────────────────────────────────────────────────────┐
│  Patient List                                  █████│
├─────────────────────────────────────────────────────┤
│ ID    Name              Email              █████│
│────────────────────────────────────────────█████│
│ 001   John Smith        john@email.com     █████│
│ 002   Mary Johnson      mary@email.com     █████│
│ 003   Robert Brown      robert@email.com   █████│
│ 004   Sarah Davis       sarah@email.com    █████│
│ 005   Michael Wilson    michael@email.com  █████│
│ 006   Jennifer Taylor   jennifer@email.com █████│
│ 007   David Anderson    david@email.com    █████│
│ 008   Lisa Thomas       lisa@email.com     █████│
│ 009   James Jackson     james@email.com    █████│
│ 010   Patricia White    patricia@email.com █████│
│                                            █████│
│                                            █████│
└─────────────────────────────────────────────────────┘
              ↑
      Table scrollbar visible
```

### 5. Card Component with Scrollable Content
```
┌────────────────────────────────────┐
│  RECENT ACTIVITY                █  │
├────────────────────────────────────┤
│ • 2:30 PM - Appointment completed █│
│ • 2:00 PM - Patient checked in    █│
│ • 1:45 PM - Lab results received  █│
│ • 1:30 PM - Treatment plan updated█│
│ • 1:15 PM - Prescription sent     █│
│ • 12:50 PM - Patient survey filed █│
│ • 12:30 PM - Chart updated       █│
│ • 12:15 PM - Note added to chart  █│
│ • 12:00 PM - Appointment started  █│
│ • 11:45 AM - Pre-op check done    █│
│                                   █│
│                                   █│
│                                   █│
└────────────────────────────────────┘
          ↑
    Card scrollbar visible
```

## State Transitions

### Scrollbar Interaction States
```
DEFAULT STATE (Page Load)
  ▓▓▓▓▓  (#C5D3D9 - Medium gray)
  ├─ Opacity: 1 (fully visible)
  ├─ Color: --dental-neutral-300
  └─ Transition: Ready (0.3s ease)

         ↓ [Mouse Hovers Over]

HOVER STATE
  ▓▓▓▓▓  (#9DAEB5 - Darker gray)
  ├─ Opacity: 1 (fully visible)
  ├─ Color: --dental-neutral-400
  └─ Transition: 0.3s ease IN PROGRESS

         ↓ [User Clicks & Drags]

ACTIVE STATE
  ▓▓▓▓▓  (#6B7F88 - Dark gray)
  ├─ Opacity: 1 (fully visible)
  ├─ Color: --dental-neutral-500
  └─ Transition: Instant (active state)

         ↓ [Mouse Leaves / Drag Ends]

BACK TO DEFAULT STATE
  ▓▓▓▓▓  (#C5D3D9 - Medium gray)
  └─ Transition: 0.3s ease OUT
```

## Dark Mode Transition

```
LIGHT THEME ACTIVE
┌─────────────────────────────┐
│ Light Background            │
│ ┌───────────────────────┐  │
│ │ ███ <- Light Scrollbar│  │
│ │ Content Area          │  │
│ │ ███ <- Visible        │  │
│ └───────────────────────┘  │
└─────────────────────────────┘

         ↓ [User Toggles Dark Mode]

DARK THEME ACTIVE
┌─────────────────────────────┐
│ Dark Background             │
│ ┌───────────────────────┐   │
│ │ ███ <- Dark Scrollbar │   │
│ │ Content Area          │   │
│ │ ███ <- Higher Contrast│   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

## Scrollbar Dimensions

```
Vertical Scrollbar (Standard)
┌──────┐
│░░░░░░│  ← Width: 8px
│ ███  │  ← Thumb: 4px border-radius
│ ███  │
│ ███  │
│ ███  │
│░░░░░░│
└──────┘

Horizontal Scrollbar (Standard)
┌─────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│███                          │  ← Height: 8px, Thumb: 4px radius
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────┘
```

## Component Coverage Matrix

```
COMPONENT TYPE          │ SCROLLBAR │ AUTO-SHOW │ AUTO-HIDE │ THEME SUPPORT
────────────────────────┼───────────┼───────────┼───────────┼──────────────
Body/Page               │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Dialog/Modal            │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Sheet/Drawer            │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Scroll Area Component   │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Card with Overflow      │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Table with Overflow     │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Section/Article         │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Main Content Area       │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Sidebar/Navigation      │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
Form Container          │ ✅ Yes    │ ✅ Auto  │ ❌ Never  │ ✅ Yes (L/D)
```

## Browser Rendering Examples

### Chrome/Edge (WebKit)
```
┌──────────────────────────┐
│ Content Area         ████│
│ ...                  ████│
│ ...                  ████│
│ ...                  ████│
└──────────────────────────┘
   ↑
Smooth, rounded 8px scrollbar
Perfect anti-aliasing
```

### Safari (WebKit)
```
┌──────────────────────────┐
│ Content Area         ████│
│ ...                  ████│
│ ...                  ████│
│ ...                  ████│
└──────────────────────────┘
   ↑
Identical to Chrome/Edge
macOS appearance
```

### Firefox
```
┌──────────────────────────┐
│ Content Area         ░███│
│ ...                  ░███│
│ ...                  ░███│
│ ...                  ░███│
└──────────────────────────┘
   ↑
Firefox-native styled scrollbar
(track and thumb styling applied)
```

---

**Visual Guide Created:** February 5, 2026
**All Examples:** Framework-agnostic CSS-based styling
**Browser Tested:** Chrome, Safari, Edge, Firefox
