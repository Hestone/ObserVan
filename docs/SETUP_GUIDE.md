# ObserveVan Setup Guide

## Quick Start (5 Minutes) ⚡

Follow these steps to get ObserveVan running on your machine:

### Step 1: Verify Files

Make sure you have all required files:
```
✓ src/index.html
✓ src/styles.css
✓ src/config.js
✓ src/data.js
✓ src/heatmap.js
✓ src/gemini.js
✓ src/app.js
```

### Step 2: Open the Application

**Option A: Direct Open (Simplest)**
```bash
# On macOS
open src/index.html

# On Windows
start src/index.html

# On Linux
xdg-open src/index.html
```

**Option B: Local Server (Recommended for development)**
```bash
# Using Python 3
cd src
python3 -m http.server 8000
# Then visit: http://localhost:8000

# Using Node.js
npx http-server src -p 8000
# Then visit: http://localhost:8000
```

### Step 3: Configure Google Gemini (Optional)

The app works without Gemini, but for AI-powered insights:

1. **Get Free API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Sign in with Google account
   - Click "Create API Key"
   - Copy the key

2. **Update Configuration**
   - Open `src/config.js`
   - Find line: `GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE'`
   - Replace with: `GEMINI_API_KEY: 'AIzaSy...your-actual-key'`
   - Save file

3. **Test Integration**
   - Refresh the browser
   - Click "🤖 AI Analysis (Gemini)" button
   - Should see analysis in 2-5 seconds

## Features Overview

### 1. Interactive Heatmap
- **What**: Visual crime data across 24 Vancouver neighborhoods
- **How**: Each neighborhood is a card colored by threat level
- **Use**: Click any card for detailed information

### 2. Year & Crime Type Filters
- **What**: Select specific year (2020-2024) and crime type
- **How**: Use dropdown menus at top of page
- **Use**: Compare different years or focus on specific crimes

### 3. Threat Level System
- **Very Low** 🟢: 0-50 incidents (safest)
- **Low** 🟡: 51-150 incidents
- **Moderate** 🟠: 151-300 incidents
- **High** 🔴: 301-500 incidents
- **Very High** 🔴: 500+ incidents (highest concern)

### 4. AI Analysis (Google Gemini)
- **What**: Intelligent insights about crime patterns
- **How**: Click "AI Analysis" button
- **Gets**: Pattern analysis, safety tips, neighborhood comparisons

### 5. Statistics Dashboard
- **What**: City-wide crime metrics
- **Shows**: Total incidents, averages, highest/lowest areas
- **Updates**: Automatically when you change filters

## Customization

### Change Threat Level Thresholds

Edit `src/config.js`:
```javascript
THREAT_LEVELS: {
    VERY_LOW: { max: 50, color: '#2ecc71', label: 'Very Low' },
    LOW: { max: 150, color: '#f1c40f', label: 'Low' },
    // ... adjust max values as needed
}
```

### Add More Years

Edit `src/index.html`, find year selector:
```html
<select id="year-select">
    <option value="2025">2025</option>  <!-- Add new year -->
    <option value="2024">2024</option>
    <!-- ... -->
</select>
```

Then add data in `src/data.js`:
```javascript
'Central Business District': {
    crimeStats: {
        2025: { all: 1200, theft: 500, /* ... */ },
        // ... existing years
    }
}
```

### Change Color Scheme

Edit `src/styles.css`, find `:root` variables:
```css
:root {
    --primary-color: #2c3e50;      /* Change main color */
    --secondary-color: #3498db;    /* Change accent color */
    --bg-color: #f8f9fa;          /* Change background */
    /* ... */
}
```

## Troubleshooting

### Issue: Page is blank
**Solution**: 
- Open browser console (F12)
- Check for JavaScript errors
- Verify all files are in `src/` directory
- Try hard refresh (Ctrl+Shift+R)

### Issue: Gemini button does nothing
**Solution**:
- Verify API key is configured in `config.js`
- Check browser console for API errors
- Ensure you have internet connection
- Verify API key is valid at Google AI Studio

### Issue: Data doesn't update
**Solution**:
- Check if dropdown menus are working
- Open console and look for errors
- Verify `data.js` has data for selected year
- Clear browser cache

### Issue: Styling looks broken
**Solution**:
- Verify `styles.css` is loaded (check Network tab)
- Look for CSS syntax errors in console
- Try in different browser
- Clear cache and hard refresh

## Performance Tips

### Optimize for Production

1. **Minify JavaScript**
   ```bash
   # Using terser
   npm install -g terser
   terser src/app.js -o src/app.min.js
   ```

2. **Minify CSS**
   ```bash
   # Using cssnano
   npm install -g cssnano-cli
   cssnano src/styles.css src/styles.min.css
   ```

3. **Add Service Worker** (for offline support)
   ```javascript
   // In src/sw.js
   self.addEventListener('install', (e) => {
       e.waitUntil(
           caches.open('observevan-v1').then((cache) => {
               return cache.addAll([
                   './',
                   './index.html',
                   './styles.css',
                   './app.js'
               ]);
           })
       );
   });
   ```

### Cache Gemini Responses

Add to `src/gemini.js`:
```javascript
const analysisCache = new Map();

async generateAnalysis(year, crimeType) {
    const cacheKey = `${year}-${crimeType}`;
    if (analysisCache.has(cacheKey)) {
        return analysisCache.get(cacheKey);
    }
    
    const result = await this.callGeminiAPI(prompt);
    analysisCache.set(cacheKey, result);
    return result;
}
```

## Security Best Practices

### For Public Deployment

1. **Never expose API keys**
   - Use environment variables
   - Implement backend proxy
   - Add rate limiting

2. **Backend Proxy Example** (Node.js)
   ```javascript
   // server.js
   const express = require('express');
   const app = express();
   
   app.post('/api/analyze', async (req, res) => {
       const apiKey = process.env.GEMINI_API_KEY;
       const result = await fetch(GEMINI_URL, {
           method: 'POST',
           headers: { /* ... */ },
           body: JSON.stringify({ /* ... */ })
       });
       res.json(await result.json());
   });
   
   app.listen(3000);
   ```

3. **Update Frontend**
   ```javascript
   // Change gemini.js to call your backend
   async callGeminiAPI(prompt) {
       const response = await fetch('/api/analyze', {
           method: 'POST',
           body: JSON.stringify({ prompt })
       });
       return response.json();
   }
   ```

## Loading Real VPD Data

### Step 1: Download Data
1. Visit https://geodash.vpd.ca/opendata/
2. Select desired years and neighborhoods
3. Download CSV files

### Step 2: Parse CSV
```javascript
// Using Papa Parse library
Papa.parse(csvFile, {
    header: true,
    complete: function(results) {
        // Process results.data
        const crimeData = processCrimeData(results.data);
        // Update data.js with real data
    }
});
```

### Step 3: Process Data
```javascript
function processCrimeData(rows) {
    const neighborhoods = {};
    
    rows.forEach(row => {
        const name = row.NEIGHBOURHOOD;
        const year = row.YEAR;
        const type = row.TYPE;
        
        if (!neighborhoods[name]) {
            neighborhoods[name] = { crimeStats: {} };
        }
        if (!neighborhoods[name].crimeStats[year]) {
            neighborhoods[name].crimeStats[year] = {
                all: 0, theft: 0, break: 0, vehicle: 0, person: 0
            };
        }
        
        neighborhoods[name].crimeStats[year][type]++;
        neighborhoods[name].crimeStats[year].all++;
    });
    
    return neighborhoods;
}
```

## Advanced Features

### Add Dark Mode
```javascript
// Add to app.js
toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', 
        document.body.classList.contains('dark-mode'));
}

// Add to styles.css
body.dark-mode {
    --bg-color: #1a1a1a;
    --card-bg: #2d2d2d;
    --text-color: #e0e0e0;
}
```

### Add Map View
```html
<!-- Add Leaflet.js -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<div id="map" style="height: 500px;"></div>

<script>
const map = L.map('map').setView([49.2827, -123.1207], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
// Add markers for neighborhoods
</script>
```

## Getting Help

- **Documentation**: See `docs/GEMINI_INTEGRATION.md`
- **Issues**: Check README.md troubleshooting section
- **GitHub**: Open an issue at project repository
- **Community**: Join Vancouver tech community forums

## Next Steps

1. ✅ Get the app running
2. ✅ Configure Gemini API (optional)
3. ✅ Explore the features
4. 📊 Consider adding real VPD data
5. 🎨 Customize colors and styling
6. 🚀 Deploy to web hosting (Netlify, Vercel, GitHub Pages)

---

**Need More Help?** Check the main README.md or docs/GEMINI_INTEGRATION.md for detailed information.
