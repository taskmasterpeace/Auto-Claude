# BMAD Builder - Manual Testing Guide

**Quick Start:** This guide shows you exactly how to test the BMAD Builder in the running Auto Claude app.

---

## 🚀 Step 1: Launch Auto Claude

```bash
cd auto-claude-ui
npm run dev
```

**Expected:** Electron app window opens

---

## 🧪 Test Scenario A: New User Experience

### Test the Onboarding Flow

1. **Reset Onboarding** (to simulate new user):
   - Click Settings (gear icon in sidebar)
   - Go to "Application" tab
   - Click "Re-run Onboarding Wizard"
   - Confirm

2. **Complete Onboarding:**
   - Welcome screen → Click "Get Started"
   - OAuth step → Skip or complete
   - Memory step → Skip or complete
   - **Completion screen should show:**

3. **Verify BMAD Builder Appears First:**
   ```
   ┌─────────────────────────────────────────────────┐
   │ 💰 Revenue-First Spec (Recommended)             │
   │ Build a business-focused spec with revenue      │
   │ projections, competitor analysis, and pricing   │
   │ strategy.                                       │
   │ [Open BMAD Builder →]                           │
   └─────────────────────────────────────────────────┘
   ```

   ✅ **CHECK:** BMAD Builder is the FIRST option (above "Create a Task")
   ✅ **CHECK:** Has DollarSign (💰) icon
   ✅ **CHECK:** Description mentions "revenue projections"
   ✅ **CHECK:** Has clickable "Open BMAD Builder" link

4. **Click "Open BMAD Builder":**
   - Onboarding should close
   - BMAD Builder dialog should open

---

## 🧪 Test Scenario B: Existing User Experience

### Test the Sidebar Button

1. **Select a Project:**
   - Ensure you have a project selected
   - Ensure project is initialized (has .auto-claude folder)

2. **Find the Button:**
   - Look at left sidebar (bottom section)
   - Scroll to bottom if needed

3. **Verify Button Appearance:**
   ```
   ┌─────────────────────────┐
   │  ┌───────────────────┐  │
   │  │  ➕ New Task      │  │ ← Solid button
   │  └───────────────────┘  │
   │  ┌───────────────────┐  │
   │  │ 💰 Revenue-First  │  │ ← Outline button
   │  │    Spec           │  │
   │  └───────────────────┘  │
   └─────────────────────────┘
   ```

   ✅ **CHECK:** "Revenue-First Spec" button exists
   ✅ **CHECK:** Has DollarSign (💰) icon
   ✅ **CHECK:** Styled as outline variant (different from "New Task")
   ✅ **CHECK:** Hover shows tooltip

4. **Hover Over Button:**
   - **Expected tooltip:** "Build a revenue-focused spec with competitor analysis and pricing strategy"

5. **Click "Revenue-First Spec":**
   - BMAD Builder dialog should open

---

## 🧪 Test Scenario C: Complete BMAD Wizard

### Category 1: Revenue Model

1. **Dialog Opens:**
   ✅ Title: "Build Revenue-First Spec"
   ✅ Progress indicator shows "Step 1 of 7: Revenue Model"
   ✅ Category 1 circle is highlighted

2. **Form Fields:**
   - Revenue Type: Select "Subscription (Recurring)"
   - Current MRR: Enter `5000`
   - Target Revenue: Enter `10000` (required)
   - Target Timeframe: Select "60 Days"

3. **Summary Card Should Show:**
   ```
   Revenue Goal Summary
   Increase from $5,000 MRR to $15,000 in 60 days
   Target increase: $10,000
   ```

4. **Try clicking Next without filling Target Revenue:**
   ✅ Next button should be disabled
   ✅ Clicking should show error: "Please complete all required fields"

5. **Fill all fields and click Next:**
   ✅ Should advance to Category 2
   ✅ Progress indicator: Category 1 has checkmark, Category 2 highlighted

---

### Category 2: Target Market

1. **Form Fields:**
   - Customer Segment: `B2B SaaS companies with 10-50 employees`
   - Total Addressable Market: `10000`
   - Conversion Rate: `2.5` (%)
   - Customer Pain Points:
     - Type: `Manual data entry is time-consuming`
     - Click "Add" or press Enter
     - ✅ Should appear in list
     - Type: `No analytics visibility`
     - Add it
     - ✅ Should see 2 pain points

2. **Test Remove:**
   - Click trash icon on first pain point
   - ✅ Should remove it from list

3. **Test Validation:**
   - Try entering conversion rate `150`
   - ✅ Should show error: "Conversion rate must be between 0 and 100"
   - Fix to `2.5`

4. **Summary Card Should Show:**
   ```
   Market Opportunity
   With a TAM of 10,000 and 2.5% conversion rate:
   Potential customers: 250
   ```

5. **Click Next:**
   ✅ Advance to Category 3

---

### Category 3: Competitor Analysis

1. **Add First Competitor:**
   - Name: `Stripe`
   - URL: `https://stripe.com/pricing`
   - Price: `99`
   - Click "Add Competitor"
   - ✅ Should appear in list
   - ✅ Average Market Price should auto-fill to `99`

2. **Test Invalid URL:**
   - Name: `Test`
   - URL: `not-a-valid-url`
   - Price: `50`
   - ✅ Should show error: "Invalid URL format"
   - ✅ Add button should be disabled
   - Fix URL to: `https://test.com`
   - ✅ Error should clear
   - Click Add

3. **Verify Auto-Calculation:**
   - ✅ Average Market Price should update to `75` ((99 + 50) / 2 = 74.5, rounded to 75)

4. **Summary Card Should Show:**
   ```
   Competitive Landscape
   Tracking 2 competitor(s)
   Price range: $50 - $99
   Average price: $75
   ```

5. **Fill Key Differentiators:**
   - Enter: `Our solution integrates directly with existing tools and provides real-time analytics`

6. **Click Next:**
   ✅ Advance to Category 4

---

### Category 4: Feature Scope

1. **Form Fields:**
   - Feature Name: `Advanced Analytics Dashboard`
   - Description: `Comprehensive analytics dashboard that provides real-time insights into business metrics with customizable reporting and automated alerts.`
   - Capabilities:
     - Add: `Real-time data visualization`
     - Add: `Custom report builder`
     - Add: `Automated email alerts`
     - Add: `Export to CSV/PDF`
   - Core Value: `Enables data-driven decision making by surfacing insights that were previously hidden in raw data.`

2. **Test Capability Management:**
   - ✅ Can add multiple capabilities
   - ✅ Can remove capabilities with trash button
   - ✅ Must have at least 1 capability to proceed

3. **Summary Card Should Show:**
   ```
   Advanced Analytics Dashboard
   Comprehensive analytics dashboard that provides...
   4 key capabilities defined
   ```

4. **Click Next:**
   ✅ Advance to Category 5

---

### Category 5: Pricing Strategy

1. **Form Fields:**
   - Base Price Point: `99`
   - Billing Frequency: Select "Monthly"
   - Discounts:
     - ✅ Check "Annual discount"
     - ✅ Check "Enterprise discount"
     - Leave "Volume discount" unchecked

2. **Add Pricing Tier (Optional):**
   - Tier name: `Pro`
   - Price: `199`
   - Features: `Advanced analytics, API access, Priority support`
   - Click "Add Tier"
   - ✅ Should appear in list

3. **Summary Card Should Show:**
   ```
   Pricing Summary
   Base price: $99/monthly
   1 pricing tier(s) configured
   Discounts: Annual, Enterprise
   ```

4. **Click Next:**
   ✅ Advance to Category 6

---

### Category 6: Implementation Plan

1. **Form Fields:**
   - Build Approach: Select "MVP (Minimum Viable Product)"
   - Estimated Effort (Days): `45`
   - Dependencies:
     - Add: `recharts (charting library)`
     - Add: `date-fns (date handling)`
   - Technical Requirements: `React dashboard with recharts, REST API backend, PostgreSQL database, Redis caching for real-time data`

2. **Summary Card Should Show:**
   ```
   Implementation Summary
   Approach: MVP
   Timeline: 45 days (9 weeks)
   Dependencies: 2 identified
   ```

3. **Click Next:**
   ✅ Advance to Category 7 (FINAL)

---

### Category 7: Success Metrics

1. **Form Fields:**
   - Primary Success Metric: Select "Revenue (MRR/ARR)"
   - 7-Day Target: `500`
   - 30-Day Target: `2000`
   - 60-Day Target: `5000`
   - Secondary Metrics:
     - Add: `Daily active users`
     - Add: `Feature adoption rate`

2. **Test Progressive Validation:**
   - Try setting 30-Day Target to `400` (less than 7-Day Target of 500)
   - ✅ Should show error: "30-day target should be greater than 7-day target"
   - Fix to `2000`

3. **Summary Card Should Show:**
   ```
   Success Tracking
   Primary Metric: revenue
   7 days: 500 $
   30 days: 2,000 $
   60 days: 5,000 $
   + 2 secondary metric(s)
   ```

4. **Final Step:**
   - ✅ "Next" button should be replaced with "Generate Spec" button
   - ✅ Button should have DollarSign icon
   - Click "Generate Spec"

---

### Spec Generation

1. **During Generation:**
   ✅ Button changes to "Generating Spec..." with spinner
   ✅ All form fields become disabled
   ✅ Previous/Next buttons disabled

2. **On Success:**
   ✅ Dialog closes automatically
   ✅ Console log shows: `BMAD spec generated: <path>`
   ✅ File created at: `.auto-claude/bmad_spec_temp.json`

3. **Verify File Contents:**
   ```bash
   cat .auto-claude/bmad_spec_temp.json
   ```

   Should contain:
   ```json
   {
     "metadata": {
       "created_via": "ui_interactive_bmad_builder",
       "version": "1.0"
     },
     "revenue_model": {
       "revenueType": "subscription",
       "currentMRR": 5000,
       "targetRevenue": 10000,
       "timeframe": "60-days"
     },
     "target_market": {
       "customerSegment": "B2B SaaS companies with 10-50 employees",
       "marketSize": 10000,
       "expectedConversionRate": 2.5,
       "customerPainPoints": [...]
     },
     "competitors": {
       "competitors": [
         { "name": "Stripe", "url": "https://stripe.com/pricing", "pricePoint": 99 },
         { "name": "Test", "url": "https://test.com", "pricePoint": 50 }
       ],
       "averageMarketPrice": 75,
       "keyDifferentiators": "..."
     },
     "features": {
       "featureName": "Advanced Analytics Dashboard",
       "description": "...",
       "capabilities": ["Real-time data visualization", ...],
       "coreValue": "..."
     },
     "pricing": {
       "pricePoint": 99,
       "billingFrequency": "monthly",
       "discounts": {
         "annual": true,
         "volume": false,
         "enterprise": true
       },
       "pricingTiers": [...]
     },
     "implementation": {
       "buildApproach": "mvp",
       "estimatedEffortDays": 45,
       "dependencies": ["recharts (charting library)", ...],
       "technicalRequirements": "..."
     },
     "validation": {
       "primaryMetric": "revenue",
       "sevenDayTarget": 500,
       "thirtyDayTarget": 2000,
       "sixtyDayTarget": 5000,
       "secondaryMetrics": [...]
     }
   }
   ```

4. **On Error:**
   ✅ Dialog stays open
   ✅ Error message displays at bottom
   ✅ User can fix data and retry

---

## 🧪 Additional Tests

### Test Navigation

1. **Click on Category 1 in progress indicator:**
   - ✅ Should navigate back to Revenue Model
   - ✅ Data should be preserved

2. **Try clicking on uncompleted Category 5:**
   - ✅ Should NOT navigate (disabled)

3. **Click Previous button:**
   - ✅ Should go back one step
   - ✅ Data preserved

### Test Validation Blocking

1. **On any category, leave required field empty:**
   - ✅ Next button should be disabled (grayed out)
   - ✅ Clicking shows error message

2. **Fill required field:**
   - ✅ Next button should enable immediately
   - ✅ Error message should clear

### Test Data Persistence

1. **Fill Category 1 → Next**
2. **Fill Category 2 → Next**
3. **Go back to Category 1:**
   - ✅ All data should still be there
4. **Go back to Category 2:**
   - ✅ All data should still be there

### Test Form Lists

1. **In any category with a list (pain points, competitors, capabilities):**
   - Add 5 items
   - Remove item 3
   - ✅ Items 1, 2, 4, 5 remain
   - ✅ Order preserved

2. **Test Enter key:**
   - Type in input
   - Press Enter (not clicking Add button)
   - ✅ Should add item
   - ✅ Input should clear

### Test Auto-Calculations

1. **Competitor Analysis:**
   - Add competitor with price $100
   - ✅ Average = $100
   - Add competitor with price $50
   - ✅ Average updates to $75
   - Remove first competitor
   - ✅ Average updates to $50

2. **Target Market:**
   - TAM: 10,000
   - Conversion: 5%
   - ✅ Summary shows: "Potential customers: 500"

3. **Implementation Plan:**
   - Effort Days: 30
   - ✅ Summary shows: "45 days (9 weeks)"

### Test Number Inputs

1. **Enter `0` in Current MRR:**
   - ✅ Should display as "0" (not blank)
   - ✅ Should be valid

2. **Clear Target Revenue field:**
   - ✅ Should show as blank
   - ✅ Should show validation error
   - ✅ Next button disabled

3. **Enter negative number in Market Size:**
   - Should be prevented by browser (min=1)

---

## 🎯 Success Criteria

### Visual Checklist

- [ ] Dialog opens when button clicked
- [ ] Title shows "Build Revenue-First Spec" with dollar icon
- [ ] Progress indicator shows 7 steps
- [ ] Step 1 highlighted on open
- [ ] All form fields render correctly
- [ ] Validation errors show in red
- [ ] Summary cards display calculations
- [ ] Next/Previous buttons work
- [ ] Generate Spec button appears on last step
- [ ] Loading spinner shows during generation
- [ ] Dialog closes on success

### Functional Checklist

- [ ] Can navigate forward through all 7 categories
- [ ] Can navigate backward to completed categories
- [ ] Cannot skip ahead to incomplete categories
- [ ] Validation blocks navigation correctly
- [ ] Required fields enforce completion
- [ ] Lists (add/remove) work correctly
- [ ] Auto-calculations update in real-time
- [ ] URL validation works
- [ ] Number inputs handle 0 correctly
- [ ] Spec generation creates JSON file
- [ ] Error handling displays messages
- [ ] Dialog can be closed and reopened

### Integration Checklist

- [ ] Sidebar button appears for initialized projects
- [ ] Sidebar button disabled for uninitialized projects
- [ ] Onboarding completion shows BMAD Builder as first option
- [ ] Clicking onboarding card opens dialog
- [ ] Clicking sidebar button opens dialog
- [ ] Both entry points work identically
- [ ] Console shows no errors
- [ ] TypeScript shows no errors

---

## 🐛 Known Issues to Watch For

### None! ✅

All critical bugs have been fixed:
- ✅ Category ID mismatch resolved
- ✅ React hook dependencies fixed
- ✅ Number input type safety fixed
- ✅ URL validation added

---

## 📊 Expected Performance

- Dialog open: < 100ms
- Category navigation: Instant
- Validation feedback: Real-time
- Spec generation: < 500ms
- Total wizard completion: 3-5 minutes (depending on user)

---

## 🔍 Debugging

### If Dialog Doesn't Open:

1. **Check Console:**
   ```javascript
   // Open DevTools (Ctrl+Shift+I or Cmd+Opt+I)
   // Look for errors in Console tab
   ```

2. **Check Project Initialization:**
   - Project must have `.auto-claude` folder
   - Sidebar should show "New Task" button enabled
   - If "New Task" is disabled, project needs initialization

3. **Check IPC:**
   ```javascript
   // In DevTools Console
   window.electronAPI.revenue.generateBMADSpec
   // Should show: [Function]
   ```

### If Spec Generation Fails:

1. **Check Project Path:**
   - Ensure projectPath is valid absolute path
   - Ensure `.auto-claude` folder exists

2. **Check Console Errors:**
   - Look for IPC errors
   - Look for file write errors

3. **Check IPC Handler:**
   ```bash
   # Check if revenue-handlers.ts is registered
   # Should see in console: "[IPC] All handler modules registered successfully"
   ```

---

## ✅ Success Indicators

**You know it's working when:**

1. ✅ Button appears in sidebar
2. ✅ Clicking opens dialog
3. ✅ All 7 forms render
4. ✅ Validation provides feedback
5. ✅ Can complete all categories
6. ✅ Spec generates successfully
7. ✅ File created in `.auto-claude/`
8. ✅ No console errors
9. ✅ Dialog closes after generation

**Then you have a working BMAD Builder!** 🎉

---

## 📝 Notes

- This is a GUI alternative to the CLI `python -m revenue.cli interactive-bmad`
- The generated spec can be used with the existing Auto Claude system
- All data is validated before being sent to backend
- The wizard can be abandoned and resumed (state resets on close)
- No data is sent to backend until "Generate Spec" is clicked

---

## 🚀 Next Steps After Testing

1. Use the generated spec to create a task
2. Review the spec file to ensure all data captured correctly
3. Report any bugs or UX improvements
4. Consider adding more validation rules if needed
5. Add custom calculations or business logic

---

**Ready to test? Run `npm run dev` and follow the scenarios above!**
