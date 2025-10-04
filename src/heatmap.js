/**
 * Heatmap Map Visualization Module for ObserveVan
 * Handles the rendering of an interactive Leaflet map with crime data
 */

const HeatmapRenderer = {
    map: null,
    markers: [],
    
    /**
     * Initialize the map
     */
    initMap() {
        // Create map centered on Vancouver
        this.map = L.map('map').setView([49.2827, -123.1207], 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            minZoom: 10
        }).addTo(this.map);
        
        // Add Vancouver boundary circle
        L.circle([49.2827, -123.1207], {
            color: '#3498db',
            fillColor: '#3498db',
            fillOpacity: 0.05,
            radius: 12000,
            weight: 2,
            dashArray: '5, 10'
        }).addTo(this.map);
    },

    /**
     * Determine threat level based on incident count
     */
    getThreatLevel(incidents) {
        if (incidents <= 50) return 'very-low';
        if (incidents <= 150) return 'low';
        if (incidents <= 300) return 'moderate';
        if (incidents <= 500) return 'high';
        return 'very-high';
    },

    /**
     * Get threat level label
     */
    getThreatLevelLabel(incidents) {
        const level = this.getThreatLevel(incidents);
        return CONFIG.THREAT_LEVELS[level.toUpperCase().replace('-', '_')].label;
    },
    
    /**
     * Get color for threat level
     */
    getThreatColor(incidents) {
        const level = this.getThreatLevel(incidents);
        return CONFIG.THREAT_LEVELS[level.toUpperCase().replace('-', '_')].color;
    },

    /**
     * Render the heatmap with neighborhood markers
     */
    render(year, crimeType) {
        if (!this.map) {
            this.initMap();
        }
        
        // Clear existing markers
        this.clearMarkers();
        
        // Get neighborhood data
        const neighborhoods = Object.keys(CrimeData.neighborhoods).map(name => {
            const neighborhood = CrimeData.neighborhoods[name];
            const data = CrimeData.getNeighborhoodData(name, year, crimeType);
            return {
                ...data,
                coordinates: neighborhood.coordinates
            };
        });
        
        // Sort by incidents (highest first)
        neighborhoods.sort((a, b) => b.incidents - a.incidents);
        
        // Create markers for each neighborhood
        neighborhoods.forEach(neighborhood => {
            this.createMarker(neighborhood);
        });
        
        // Update stats
        this.updateStats(year, crimeType);
    },
    
    /**
     * Create a marker for a neighborhood
     */
    createMarker(neighborhood) {
        const color = this.getThreatColor(neighborhood.incidents);
        const threatLevel = this.getThreatLevel(neighborhood.incidents);
        const threatLabel = this.getThreatLevelLabel(neighborhood.incidents);
        
        // Create circle marker with size based on incidents
        const radius = Math.min(Math.max(neighborhood.incidents / 20, 10), 50);
        
        const circle = L.circle(neighborhood.coordinates, {
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            radius: radius * 50,
            weight: 2
        }).addTo(this.map);
        
        // Create popup content
        const popupContent = `
            <div class="popup-neighborhood">${neighborhood.name}</div>
            <div class="popup-incidents">${neighborhood.incidents} incidents</div>
            <div class="popup-threat threat-${threatLevel}" style="background-color: ${color}">
                ${threatLabel}
            </div>
            <small style="display: block; margin-top: 0.5rem; color: #7f8c8d;">
                Year: ${neighborhood.year} | Type: ${neighborhood.crimeType === 'all' ? 'All Crimes' : neighborhood.crimeType}
            </small>
        `;
        
        circle.bindPopup(popupContent);
        
        // Add label marker (text overlay)
        const marker = L.marker(neighborhood.coordinates, {
            icon: L.divIcon({
                className: 'neighborhood-label',
                html: `<div style="
                    background: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    white-space: nowrap;
                    border: 1px solid ${color};
                ">${neighborhood.name}</div>`,
                iconSize: null
            })
        }).addTo(this.map);
        
        // Store markers for cleanup
        this.markers.push(circle);
        this.markers.push(marker);
        
        // Add click handler
        circle.on('click', () => {
            this.map.flyTo(neighborhood.coordinates, 14, {
                duration: 1
            });
        });
    },
    
    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    },

    /**
     * Update statistics display
     */
    updateStats(year, crimeType) {
        const statsGrid = document.getElementById('stats-grid');
        const stats = CrimeData.getCityStats(year, crimeType);
        
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h4>Total Incidents</h4>
                <div class="stat-value">${stats.total.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <h4>Average per Area</h4>
                <div class="stat-value">${stats.average}</div>
            </div>
            <div class="stat-card">
                <h4>Highest Area</h4>
                <div class="stat-value">${stats.max}</div>
            </div>
            <div class="stat-card">
                <h4>Lowest Area</h4>
                <div class="stat-value">${stats.min}</div>
            </div>
            <div class="stat-card">
                <h4>Neighborhoods</h4>
                <div class="stat-value">${stats.neighborhoods}</div>
            </div>
        `;
    },
    
    /**
     * Get neighborhood by name for chatbot queries
     */
    findNeighborhood(query) {
        const normalizedQuery = query.toLowerCase();
        for (const name in CrimeData.neighborhoods) {
            if (normalizedQuery.includes(name.toLowerCase())) {
                return name;
            }
        }
        return null;
    }
};
