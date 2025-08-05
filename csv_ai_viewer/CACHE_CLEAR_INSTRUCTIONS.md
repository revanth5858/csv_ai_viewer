# How to Clear Cached Data in CSV AI Viewer

## Problem
The application stores data in browser cache (localStorage) and automatically restores it when you refresh the page, even if you want to start fresh.

## Solutions

### Method 1: Use the "Clear All & Cache" Button
1. Open the CSV AI Viewer application
2. Go to the "Data Table" tab
3. Look for the "Clear All & Cache" button (red button with trash icon)
4. Click it and confirm when prompted
5. The page will return to the upload screen

### Method 2: Use Browser Console (Advanced)
1. Open the CSV AI Viewer application
2. Press F12 to open Developer Tools
3. Go to the Console tab
4. Type: `clearCache()` and press Enter
5. Refresh the page

### Method 3: Manual Browser Cache Clear
1. Open your browser settings
2. Go to Privacy/Security settings
3. Clear browsing data
4. Select "Local storage" and "Session storage"
5. Clear the data for the CSV AI Viewer site

### Method 4: Hard Refresh
1. Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. This forces a complete page reload and clears some cache

## What Was Fixed
- ✅ Disabled automatic data restoration on page load
- ✅ Added comprehensive cache clearing function
- ✅ Added "Clear All & Cache" button to the UI
- ✅ Added global `clearCache()` function for console use
- ✅ Enhanced `clearData()` function to clear all storage

## Technical Details
The application was storing data in:
- `localStorage.csvViewerData` - Main data storage
- `localStorage.darkMode` - Dark mode preference
- `sessionStorage` - Session-specific data

All of these are now properly cleared when using the cache clearing functions. 