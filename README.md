# ObserveVan 🗺️

A crime heatmap visualization website for Vancouver that displays regions/areas with color-coded threat levels based on historical crime data from the Vancouver Police Department.

![ObserveVan Preview](https://img.shields.io/badge/status-active-success) ![Built with HTML](https://img.shields.io/badge/HTML-orange) ![Built with CSS](https://img.shields.io/badge/CSS-blue) ![Built with JavaScript](https://img.shields.io/badge/JavaScript-yellow) ![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-purple)

## Features ✨

- **Interactive Heatmap**: Visual representation of crime data across 24 Vancouver neighborhoods
- **Color-Coded Threat Levels**: Five-tier system (Very Low to Very High) for easy understanding
- **Year Selection**: View crime data from 2020-2024
- **Crime Type Filtering**: Filter by specific crime types (theft, break & enter, vehicle-related, person-related)
- **AI-Powered Analysis**: Google Gemini integration provides intelligent insights and safety recommendations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Statistics**: City-wide crime statistics and neighborhood comparisons

## Technology Stack 🛠️

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI Integration**: Google Gemini API
- **Data Source**: Vancouver Police Department Open Data
- **Architecture**: Modular JavaScript with separation of concerns

## Project Structure 📁

```
ObserveVan/
├── src/
│   ├── index.html          # Main HTML structure
│   ├── styles.css          # Styling and responsive design
│   ├── config.js           # Configuration and API keys
│   ├── data.js             # Crime data management
│   ├── heatmap.js          # Visualization rendering
│   ├── gemini.js           # Google Gemini AI integration
│   └── app.js              # Main application logic
├── docs/
│   └── GEMINI_INTEGRATION.md  # Detailed Gemini integration guide
├── design/                 # Design assets (if any)
├── LICENSE
└── README.md
```

## Getting Started 🚀

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for Google Fonts and Gemini API)
- Google Gemini API key (free - optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ObserveVan.git
   cd ObserveVan
   ```

2. **Configure Google Gemini API (Optional but Recommended)**
   
   Get your free API key:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Copy the key

   Update `src/config.js`:
   ```javascript
   const CONFIG = {
       GEMINI_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE',
       // ... rest of config
   };
   ```

3. **Launch the application**
   
   Simply open `src/index.html` in your web browser:
   ```bash
   # On macOS
   open src/index.html
   
   # On Linux
   xdg-open src/index.html
   
   # On Windows
   start src/index.html
   ```

   Or use a local development server:
   ```bash
   # Using Python 3
   cd src
   python3 -m http.server 8000
   # Visit http://localhost:8000
   
   # Using Node.js (with http-server)
   npx http-server src -p 8000
   # Visit http://localhost:8000
   ```

## Usage 📖

### Basic Usage

1. **Select a Year**: Choose from 2020-2024 to view crime data for that year
2. **Filter by Crime Type**: Select specific crime categories or view all crimes
3. **View Neighborhood Cards**: Each card shows:
   - Neighborhood name
   - Total incidents
   - Color-coded threat level
4. **Click for Details**: Click any neighborhood card for more information

### AI Analysis

1. Click the "🤖 AI Analysis (Gemini)" button
2. Wait for analysis to generate (usually 2-5 seconds)
3. Read AI-powered insights about:
   - Crime patterns and trends
   - Neighborhood comparisons
   - Safety recommendations
   - Statistical interpretations

### Threat Level System

- 🟢 **Very Low**: 0-50 incidents
- 🟡 **Low**: 51-150 incidents
- 🟠 **Moderate**: 151-300 incidents
- 🔴 **High**: 301-500 incidents
- 🔴 **Very High**: 500+ incidents

## Google Gemini Integration 🤖

### Why Gemini?

Google Gemini adds intelligence to ObserveVan by:
- Analyzing crime patterns and trends
- Providing contextual insights about neighborhoods
- Generating personalized safety recommendations
- Making complex data accessible to everyone

### How It Works

1. **Data Collection**: App gathers crime statistics for selected filters
2. **Prompt Engineering**: Creates structured analysis request
3. **API Communication**: Sends data to Gemini Pro model
4. **Response Processing**: Formats and displays AI insights

### Integration Details

For comprehensive information about the Gemini integration, including:
- Architecture and data flow
- API configuration
- Security considerations
- Production best practices
- Troubleshooting

See: [docs/GEMINI_INTEGRATION.md](docs/GEMINI_INTEGRATION.md)

### Is Gemini Integration Possible?

**Yes, Google Gemini integration is fully possible and implemented!** ✅

**Why it works:**
- Gemini provides a REST API accessible via JavaScript
- No server-side code required for basic implementation
- Free API tier available for personal/demo projects
- Supports client-side JavaScript with fetch API
- Returns JSON responses that are easy to parse

**Limitations to be aware of:**
- API key visible in browser (client-side limitation)
- Rate limits apply (free tier: 60 requests/minute)
- For production apps, consider backend proxy for security
- Requires internet connection

**See the working implementation in:**
- `src/gemini.js` - Full integration code
- `docs/GEMINI_INTEGRATION.md` - Complete documentation

## Data Source 📊

### Vancouver Police Department Open Data

- **Source**: [VPD GeoDASH](https://geodash.vpd.ca/opendata/)
- **Update Frequency**: Weekly (Sundays)
- **Privacy**: Location data intentionally randomized
- **Coverage**: 24 Vancouver neighborhoods
- **Years Available**: 2003-2025 (current year partial)

### Sample Data

The application includes sample crime data based on typical Vancouver statistics. In production, you would:

1. Download CSV files from VPD Open Data
2. Parse using a CSV library (e.g., Papa Parse)
3. Update `src/data.js` with actual statistics

### Crime Categories

- **All Crimes**: Combined total of all crime types
- **Theft**: Includes shoplifting, theft of property (over/under $5000), mail theft
- **Break and Enter**: Commercial and residential break-ins
- **Vehicle Collision or Theft**: Vehicle-related incidents
- **Offence Against a Person**: Violent crimes (assault, robbery, etc.)

## Architecture & Best Practices 🏗️

### Software Engineering Principles

1. **Separation of Concerns**
   - Each module has a single responsibility
   - `data.js` - Data management
   - `heatmap.js` - Visualization
   - `gemini.js` - AI integration
   - `app.js` - Application orchestration

2. **Modular Design**
   - Independent, reusable modules
   - Clear interfaces between components
   - Easy to test and maintain

3. **Configuration Management**
   - Centralized config in `config.js`
   - Easy to modify settings
   - Environment-specific configurations

4. **Error Handling**
   - Graceful degradation
   - User-friendly error messages
   - Console logging for debugging

5. **Responsive Design**
   - Mobile-first approach
   - Flexbox and Grid layouts
   - Media queries for different screen sizes

6. **Code Documentation**
   - JSDoc comments
   - Inline explanations
   - Comprehensive README

7. **Performance**
   - Minimal dependencies
   - Efficient DOM manipulation
   - Lazy loading where appropriate

## Browser Compatibility 🌐

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Security Considerations 🔒

### API Key Management

⚠️ **Important**: 
- Never commit API keys to public repositories
- For production, use backend API proxy
- Consider adding `config.js` to `.gitignore`

### Production Recommendations

1. **Use Environment Variables**
   ```javascript
   GEMINI_API_KEY=your_key_here
   ```

2. **Implement Backend Proxy**
   - Hide API key on server
   - Add rate limiting
   - Implement authentication

3. **Add CORS Headers**
   - Restrict origins
   - Validate requests
   - Monitor usage

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Future Enhancements 🔮

- [ ] Real-time data updates from VPD API
- [ ] Interactive map with geolocation
- [ ] Historical trend visualization (charts/graphs)
- [ ] User accounts and saved preferences
- [ ] Email/SMS alerts for high-threat areas
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Export reports as PDF
- [ ] Mobile native app version
- [ ] Community safety tips integration

## Troubleshooting 🔧

### Common Issues

**1. Gemini AI button doesn't work**
- Ensure API key is configured in `config.js`
- Check browser console for errors
- Verify internet connection

**2. Data doesn't load**
- Check browser console for JavaScript errors
- Ensure all files are in correct locations
- Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

**3. Styling looks broken**
- Verify `styles.css` is loaded
- Check for CSS syntax errors
- Clear browser cache

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- Vancouver Police Department for providing open crime data
- Google for Gemini AI API
- Vancouver community for ongoing safety awareness

## Contact 📧

Project Link: [https://github.com/Hestone/ObserveVan](https://github.com/Hestone/ObserveVan)

## Disclaimer ⚠️

This application is for informational purposes only. Crime data is sourced from public records and may not reflect real-time conditions. Location data is intentionally randomized for privacy protection. Users should not rely solely on this information for making decisions about personal safety. Always follow official guidance from local authorities.

---

**Built with ❤️ for Vancouver** | Powered by Google Gemini AI
