/**
 * Configuration file for ObserveVan
 * Contains API keys and application settings
 */

const CONFIG = {
    // Google Gemini API Configuration
    // The API key is now loaded from src/.env.js, which is not committed to git.
    // See src/.env.js to add your key.
    GEMINI_API_KEY: (window.ENV && window.ENV.GEMINI_API_KEY) || '',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    
    // Application Settings
    APP_NAME: 'ObserVan',
    APP_VERSION: '1.0.0',
    
    // Threat Level Thresholds
    THREAT_LEVELS: {
        VERY_LOW: { max: 50, color: '#2ecc71', label: 'Very Low' },
        LOW: { max: 150, color: '#f1c40f', label: 'Low' },
        MODERATE: { max: 300, color: '#e67e22', label: 'Moderate' },
        HIGH: { max: 500, color: '#e74c3c', label: 'High' },
        VERY_HIGH: { max: Infinity, color: '#c0392b', label: 'Very High' }
    },
    
    // VPD Data Source
    DATA_SOURCE: {
        url: 'https://geodash.vpd.ca/opendata/',
        description: 'Vancouver Police Department Open Data'
    },
    
    // Default Settings
    DEFAULT_YEAR: '2025',
    DEFAULT_CRIME_TYPE: 'all'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
