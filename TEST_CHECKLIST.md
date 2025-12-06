# Configuration Feature - Test Checklist

## Pre-Testing Setup
- [ ] Ensure you're logged in with a valid user account
- [ ] Open browser developer console to check for errors
- [ ] Clear browser cache if testing after previous changes

---

## 1. Navigation & UI Tests

### NavBar Dropdown State
- [ ] Navigate to Dashboard → Settings should be collapsed
- [ ] Click "Settings" → Dropdown opens, shows all settings links
- [ ] Click "Configuration" → Page loads, Settings dropdown stays open ✅
- [ ] Navigate to another settings page (e.g., Edit Profile) → Settings dropdown stays open ✅
- [ ] Navigate away from settings (e.g., Dashboard) → Settings dropdown can be manually closed
- [ ] Navigate back to Configuration → Settings dropdown automatically opens ✅

### Configuration Page Load
- [ ] Navigate to `/dashboard/settings/configuration`
- [ ] Page loads without errors
- [ ] Shows three range cards: Small, Medium, Large
- [ ] Displays current weight ranges for each
- [ ] Shows "Global" or "Custom" badge in header
- [ ] Shows "Last modified" date if available

---

## 2. Configuration Loading Tests

### Initial Load
- [ ] Page loads with default/global configuration
- [ ] Badge shows "Global" (blue) if using global config
- [ ] Badge shows "Custom" (green) if user has custom config
- [ ] All three ranges display correctly

### User Configuration Priority
- [ ] If user has custom config → Shows custom values
- [ ] If no user config → Shows global values
- [ ] If no global config → Shows hardcoded defaults

---

## 3. Edit Range Tests

### Basic Editing
- [ ] Click "Edit Range" on Small → Modal opens
- [ ] Input fields show current min/max values
- [ ] Can type new values
- [ ] Click "Cancel" → Modal closes, no changes saved

### Validation Tests
- [ ] Enter min > max → Shows error "Minimum must be less than maximum"
- [ ] Enter negative values → Shows error "Values must be positive"
- [ ] Enter invalid numbers → Shows error "Please enter valid numbers"
- [ ] Save button disabled when validation errors exist

### Regular Save (No Gaps/Overlaps)
- [ ] Edit Small to valid range (e.g., 35-42) with no conflicts
- [ ] Click "Save" → Saves successfully
- [ ] Notification shows: "Small range updated to 35.00g - 42.00g"
- [ ] Page updates to show new values
- [ ] Badge changes to "Custom" (green)
- [ ] "Reset to Global Defaults" button appears

---

## 4. Smart Adjustment Tests

### Gap Detection & Smart Save
- [ ] Edit Small to 35-40 (leaving gap before Medium at 43)
- [ ] Blue info card appears: "Smart Adjustment Available"
- [ ] Message shows: "Close gap by adjusting Medium range to 40.01g - 50.00g"
- [ ] Regular "Save" button replaced with "Smart Save" button ✅
- [ ] Click "Smart Save" → Both ranges save
- [ ] Notification shows: "Small: 35.00-40.00g, Medium: 40.01-50.00g (auto-adjusted)" ✅
- [ ] Both ranges update in UI
- [ ] Check Firestore → Both ranges saved correctly ✅

### Overlap Detection & Smart Save
- [ ] Edit Small to 35-45 (overlapping with Medium at 43)
- [ ] Blue info card appears: "Smart Adjustment Available"
- [ ] Message shows: "Resolve overlap by adjusting Medium range to 45.01g - 50.00g"
- [ ] "Smart Save" button appears ✅
- [ ] Click "Smart Save" → Both ranges save
- [ ] Notification shows both ranges with "(auto-adjusted)" ✅
- [ ] Both ranges update correctly
- [ ] Check Firestore → Both ranges saved correctly ✅

### Smart Adjustment Edge Cases
- [ ] Edit Medium to create gap with Large → Smart adjustment suggests Large min adjustment
- [ ] Edit Large to create overlap with Medium → Smart adjustment suggests Medium max adjustment
- [ ] Edit Small to create gap before it → Smart adjustment suggests previous range (if exists)

---

## 5. Reset to Defaults Tests

### Reset Functionality
- [ ] With custom configuration active → "Reset to Global Defaults" button visible
- [ ] Click "Reset to Global Defaults" → Confirmation/execution
- [ ] Configuration resets to global values
- [ ] Badge changes to "Global" (blue)
- [ ] "Reset to Global Defaults" button disappears
- [ ] Notification shows: "Egg weight configuration reset to global defaults"
- [ ] Check Firestore → User configuration document deleted ✅

---

## 6. Notification Tests

### Notification Format
- [ ] Regular save → Short format: "Small range updated to 35.00g - 42.00g" ✅
- [ ] Smart save → Compact format: "Small: 35.00-40.00g, Medium: 40.01-50.00g (auto-adjusted)" ✅
- [ ] Reset → Shows: "Egg weight configuration reset to global defaults"
- [ ] All notifications appear in notification system

---

## 7. Error Handling Tests

### Network/API Errors
- [ ] Disconnect internet → Try to save → Shows error message
- [ ] Invalid account ID → Shows "Unable to identify user" message
- [ ] Firestore error → Shows appropriate error message

### Data Validation
- [ ] Try to save invalid ranges → Validation prevents save
- [ ] Try to save with overlaps (without smart adjustment) → Can still save (overlaps are warnings)
- [ ] Try to save with gaps (without smart adjustment) → Can still save (gaps are warnings)

---

## 8. UI/UX Polish Tests

### Visual States
- [ ] Range cards show correct colors (Small: blue, Medium: orange, Large: red)
- [ ] Edit buttons match range colors
- [ ] Hover effects work on all buttons
- [ ] Modal header matches range color
- [ ] Smart Save button is blue (#2563EB)

### Responsive Design
- [ ] Test on mobile → Layout adapts correctly
- [ ] Test on tablet → Layout adapts correctly
- [ ] Test on desktop → Full layout displays

### Loading States
- [ ] Initial page load → Shows loading spinner
- [ ] Saving → Button shows "Saving..." and is disabled
- [ ] Loading delay works (500ms minimum)

---

## 9. Integration Tests

### Cross-Page Navigation
- [ ] Save configuration → Navigate away → Navigate back → Configuration persists
- [ ] Reset to defaults → Navigate away → Navigate back → Shows global defaults
- [ ] Multiple users → Each user's custom config is independent

### Firestore Data Structure
- [ ] Check `user_configurations/{accountId}` → Structure is correct
- [ ] Check `global_configurations/egg_size_ranges` → Structure is correct
- [ ] Verify `isCustomized: true` flag is set correctly
- [ ] Verify `lastModifiedAt` timestamp updates

---

## 10. Edge Cases & Boundary Tests

### Boundary Values
- [ ] Test with very small values (0.01g)
- [ ] Test with large values (100g+)
- [ ] Test with decimal precision (35.99g)
- [ ] Test with exactly adjacent ranges (42.00 and 42.01)

### Multiple Edits
- [ ] Edit Small → Save → Edit Medium → Save → Both persist
- [ ] Edit all three ranges in sequence → All save correctly
- [ ] Edit → Cancel → Edit again → Previous values restored

---

## Quick Smoke Test (5 minutes)
If short on time, test these critical paths:
1. ✅ Navigate to Configuration page → Loads correctly
2. ✅ Edit Small range → Smart Save with gap → Both ranges save
3. ✅ Check Firestore → Data saved correctly
4. ✅ Reset to defaults → Works correctly
5. ✅ Settings dropdown stays open when on settings page

---

## Known Issues to Watch For
- [ ] Check console for any JavaScript errors
- [ ] Check for any Firestore permission errors
- [ ] Verify notifications are created successfully
- [ ] Check that smart adjustment calculations are accurate (43.00 not 43.01)

---

## Post-Testing
- [ ] All tests pass
- [ ] No console errors
- [ ] No Firestore errors
- [ ] UI looks correct on all screen sizes
- [ ] Ready to push changes

