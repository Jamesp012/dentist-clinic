# My Profile Redesign - Visual Specification & Implementation Guide

## 🎨 Premium Card Component Specification

### Base Card Structure
```tsx
<div className="group relative bg-white border border-slate-200 rounded-2xl p-6 
  hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
  {/* Hover gradient overlay (invisible until hover) */}
  <div className="absolute inset-0 bg-gradient-to-br from-[COLOR-1]-50 to-[COLOR-2]-50 
    rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
  
  {/* Label */}
  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
    Field Name
  </label>
  
  {/* Value or Input */}
  <p className="text-lg font-semibold text-slate-900">Value Here</p>
</div>
```

### Visual Breakdown

```
┌─────────────────────────────────────────────┐  ← border-slate-200
│  FULL NAME                                  │  ← text-xs bold uppercase
│  (smaller gray text)                        │
│                                             │
│  John Doe                                   │  ← text-lg semibold slate-900
│                                             │
│  [On Hover: shadow-lg + -translate-y-1]    │  ← smooth animation
│  [On Hover: gradient overlay reveals]      │  ← gradient-to-br
└─────────────────────────────────────────────┘
  ↑ bg-white border rounded-2xl p-6 ↑
```

---

## 📊 Card Color Mapping

Each information card has a unique clinic-themed color gradient for its hover state:

### Personal Details Section
| Field | Gradient | Psychology |
|-------|----------|------------|
| Full Name | `teal-50 → cyan-50` | **Trust** - Primary identity |
| Age | `blue-50 → indigo-50` | **Professional** - Demographics |
| Sex | `green-50 → emerald-50` | **Wellness** - Health attribute |
| Date of Birth | `purple-50 → pink-50` | **Care** - Important milestone |

### Contact Information Section
| Field | Gradient | Psychology |
|-------|----------|------------|
| Phone | `cyan-50 → sky-50` | **Communication** - Direct contact |
| Email | `amber-50 → orange-50` | **Warmth** - Alternative contact |
| Address | `rose-50 → red-50` | **Location** - Physical address |

### Medical Information Section
| Field | Gradient | Psychology |
|-------|----------|------------|
| Medical History | `teal-50 → emerald-50` | **Care** - Health records |
| Allergies | `red-50 → rose-50` | **Safety** - Critical info |

---

## 🎯 Layout Grid System

### Overall Container
```tsx
<div className="p-8 space-y-8 max-w-6xl mx-auto">
```
- **Padding:** `p-8` (32px on all sides - generous whitespace)
- **Spacing:** `space-y-8` (32px between major sections)
- **Max Width:** `max-w-6xl` (prevents overly wide layouts)
- **Centering:** `mx-auto` (centers in viewport)

### Section Grid (2 columns)
```tsx
<div className="grid grid-cols-2 gap-6">
```
- **Grid:** `grid-cols-2` (2 equal columns on desktop)
- **Gap:** `gap-6` (24px between cards)

### Full-Width Card
```tsx
<div className="col-span-2 ...">
```
- **Spans:** `col-span-2` (occupies both columns)

---

## 📝 Typography Hierarchy

### Page Title
```tsx
<h3 className="text-3xl font-bold text-slate-900 tracking-tight">
  Personal Information
</h3>
```
- **Size:** `text-3xl` (30px)
- **Weight:** `font-bold` (700)
- **Color:** `text-slate-900` (almost black)
- **Tracking:** `tracking-tight` (professional kerning)

### Subtitle
```tsx
<p className="text-slate-500 mt-1 text-sm font-medium">
  Manage your profile details and contact information
</p>
```
- **Size:** `text-sm` (14px)
- **Weight:** `font-medium` (500)
- **Color:** `text-slate-500` (gray)
- **Margin:** `mt-1` (4px space from title)

### Section Header
```tsx
<h4 className="text-lg font-bold text-slate-900">
  Contact Information
</h4>
```
- **Size:** `text-lg` (18px)
- **Weight:** `font-bold` (700)
- **Color:** `text-slate-900` (dark)
- **Border:** `pb-3 border-b-2 border-slate-200` (subtle separator)

### Card Label
```tsx
<label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
  Phone Number
</label>
```
- **Size:** `text-xs` (12px)
- **Weight:** `font-bold` (700)
- **Color:** `text-slate-500` (light gray)
- **Style:** `uppercase` (capital letters)
- **Tracking:** `tracking-wider` (professional spacing)
- **Margin:** `mb-2` (8px below label)
- **Display:** `block` (full width)

### Card Value
```tsx
<p className="text-lg font-semibold text-slate-900">
  +63 912 345 6789
</p>
```
- **Size:** `text-lg` (18px)
- **Weight:** `font-semibold` (600)
- **Color:** `text-slate-900` (dark)
- **Readable:** Clear, prominent display

### Body Text
```tsx
<p className="text-base font-medium text-slate-700 leading-relaxed">
  {content}
</p>
```
- **Size:** `text-base` (16px)
- **Weight:** `font-medium` (500)
- **Color:** `text-slate-700` (medium gray)
- **Line Height:** `leading-relaxed` (1.625 for readability)

---

## 🎮 Interactive Elements

### Edit Button (Call-to-Action)
```tsx
<button className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 
  text-white rounded-xl hover:shadow-xl hover:-translate-y-0.5 
  transition-all duration-300 flex items-center gap-2 font-semibold text-sm">
  <Edit className="w-4 h-4" />
  Edit Profile
</button>
```

**Hover Effects:**
- `hover:shadow-xl` - Deep shadow (elevation)
- `hover:-translate-y-0.5` - Move up 2px
- `transition-all duration-300` - Smooth 300ms animation

**Colors:**
- Gradient: `from-teal-500 to-cyan-600` (medical/trust)
- Text: `text-white` (high contrast)
- Icon: `w-4 h-4` (small, proportional)

### Save Button
```tsx
<button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 
  text-white rounded-xl hover:shadow-xl hover:-translate-y-0.5 
  transition-all duration-300 flex items-center gap-2 font-semibold text-sm">
  <Save className="w-4 h-4" />
  Save Changes
</button>
```
- **Color:** Green gradient (success, confirmation)
- **Size:** `px-6 py-3` (larger, more clickable)
- **Corners:** `rounded-xl` (modern, not too rounded)

### Cancel Button
```tsx
<button className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl 
  hover:bg-slate-300 transition-colors flex items-center gap-2 font-semibold text-sm">
  <XCircle className="w-4 h-4" />
  Cancel
</button>
```
- **Color:** Neutral gray (secondary action)
- **Hover:** `hover:bg-slate-300` (darker gray)
- **Interaction:** Simple color transition

---

## 💬 Input Fields (Edit Mode)

### Text Input
```tsx
<input type="text" 
  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white 
  text-slate-900 font-semibold focus:outline-none focus:ring-2 
  focus:ring-teal-500 focus:border-transparent transition-all" />
```

**States:**
- **Default:** `border-slate-300` (light gray border)
- **Focus:** `focus:ring-2 focus:ring-teal-500` (teal accent ring)
- **Focus:** `focus:border-transparent` (hide original border)

### Textarea
```tsx
<textarea 
  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white 
  text-slate-900 font-medium focus:outline-none focus:ring-2 
  focus:ring-teal-500 focus:border-transparent transition-all resize-none"
  rows={3} />
```
- **Resize:** `resize-none` (controlled height)
- **Rows:** `rows={3}` (3 line default height)
- **Font:** `font-medium` (readable, not as bold as labels)

### Select Dropdown
```tsx
<select 
  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white 
  text-slate-900 font-semibold focus:outline-none focus:ring-2 
  focus:ring-teal-500 focus:border-transparent transition-all">
  <option value="Male">Male</option>
  <option value="Female">Female</option>
</select>
```
- **Styling:** Same as text input for consistency
- **Background:** `bg-white` (necessary for dropdown visibility)

---

## 🎬 Animation & Transition Specifications

### Hover Card Animation
```css
transition: all 300ms ease-out
transform: translateY(-4px)
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

### Gradient Overlay Animation
```css
opacity: 0 → 1
transition: opacity 300ms ease-out
```

### Button Hover Animation
```css
transition: all 300ms ease-out
transform: translateY(-2px)
box-shadow: enhanced with hover:shadow-xl
```

### Focus Ring Animation
```css
outline: none
ring: 2px solid teal-500
transition: smooth on focus
```

---

## 📱 Responsive Behavior

### Desktop (Default)
- 2-column grid for cards
- Full width address field (`col-span-2`)
- Full spacing applied

### Mobile (if needed)
- Would collapse to 1 column automatically with media queries
- All functionality preserved
- Full-width cards

---

## ♿ Accessibility Features

✅ **Labels:** Every input has associated label
✅ **Focus States:** Clear focus ring on inputs
✅ **Color Contrast:** 
  - Text on white: `text-slate-900` (excellent contrast)
  - Labels: `text-slate-500` (sufficient contrast)
✅ **Font Sizes:** 
  - Minimum `text-sm` for labels
  - `text-base` and up for readable content
✅ **Button Targets:** Minimum 48px height (touch-friendly)
✅ **Semantic HTML:** Proper `<label>`, `<button>` elements

---

## 🔧 Implementation Checklist

✅ Personal Details section with 4 premium cards
✅ Contact Information section with 3 cards (address full-width)
✅ Medical Information section with 2 cards
✅ Professional typography hierarchy
✅ Clinic-themed color gradients
✅ Smooth hover animations
✅ Edit/Save/Cancel button functionality
✅ Input field focus states
✅ Responsive grid layout
✅ Proper spacing and alignment
✅ Clean, professional appearance
✅ Full functionality preservation

---

## 🎓 Design Philosophy

### Three-Tier Visual System
1. **Information (Cards):** White background, subtle borders, clinic colors on hover
2. **Interactions (Buttons):** Gradient fills, shadow effects, upward movement
3. **Inputs (Fields):** Clean borders, teal focus states, smooth transitions

### Color Psychology in Healthcare
- **Teal/Cyan:** Trust, healing, professionalism
- **Green/Emerald:** Wellness, health, growth
- **Blue:** Stability, medical, confidence
- **Gray:** Neutrality, calming, professional

### Micro-interactions
Every element responds to user interaction:
- Cards elevate on hover
- Buttons move upward when hovered
- Inputs highlight with teal focus ring
- Gradients smoothly fade in/out

---

**The result:** A premium, modern Patient Portal "My Profile" page that conveys trust, professionalism, and healthcare expertise while maintaining perfect functionality. 🏥✨

