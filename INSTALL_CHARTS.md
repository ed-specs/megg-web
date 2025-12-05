# Install Chart Library for Overview Page

## Quick Install

Run this command in your project directory:

```bash
cd D:\CAPSTONE\megg-web-tech
npm install recharts
```

## What is Recharts?

Recharts is a composable charting library built with React and D3. It provides:
- ✅ Beautiful, responsive charts
- ✅ Easy to use with React
- ✅ Fully customizable
- ✅ TypeScript support
- ✅ Great documentation

## Charts Added to Overview Page

### 1. **Bar Charts**
- Size Distribution (Small, Medium, Large)
- Quality Distribution (Good, Dirty, Cracked)
- Total Eggs per Batch

### 2. **Pie Charts**
- Size Percentage breakdown
- Quality Percentage breakdown

### 3. **Line Charts**
- Size Trends across batches
- Quality Trends across batches

## What You'll See

After installing, the overview page will display:

```
┌────────────────────────────────────────┐
│  [Bar Chart] | [Pie Chart]            │
│  Size Data   | Size %                 │
├────────────────────────────────────────┤
│  [Line Chart - Full Width]            │
│  Size Trends Across Batches           │
└────────────────────────────────────────┘
```

And similarly for Quality view.

## Features

- 📊 Interactive tooltips on hover
- 📈 Smooth animations
- 🎨 Color-coded by category
- 📱 Fully responsive
- 🔄 Toggle between Size and Quality views

## Installation Steps

1. **Navigate to project:**
   ```bash
   cd D:\CAPSTONE\megg-web-tech
   ```

2. **Install recharts:**
   ```bash
   npm install recharts
   ```

3. **Wait for installation** (should take ~30 seconds)

4. **Refresh your dashboard** - charts will appear!

## Alternative: If NPM Fails

If npm install fails, try:

```bash
# Clear cache
npm cache clean --force

# Install again
npm install recharts

# Or use yarn
yarn add recharts
```

## Package Already Added

I've already added `recharts` to your `package.json`, so you just need to run `npm install` to install it.

---

**Package Version:** recharts@^2.15.0  
**Size:** ~500KB (small and lightweight)  
**Documentation:** https://recharts.org/

