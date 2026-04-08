/**
 * Heatmap Map Visualization Module for ObserveVan
 * Handles the rendering of an interactive Leaflet map with crime data
 */

const HeatmapRenderer = {
    map: null,
    markers: [],
    markerCluster: null,

    /**
     * Initialize the map
     */
    initMap() {
        // Create map centered on Vancouver
        this.map = L.map('map').setView([49.2827, -123.1207], 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);
        
        // Remove the large boundary circle for a cleaner look
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
    render(year, crimeType, location = 'all') {
        if (!this.map) {
            this.initMap();
        }
        
        // Clear existing markers
        this.clearMarkers();
        
        // Get neighborhood data
        const neighborhoods = Object.keys(CrimeData.neighborhoodCoordinates)
            .filter(name => location === 'all' || name === location)
            .map(name => {
                const data = CrimeData.getNeighborhoodData(name, year, crimeType);
                return {
                    ...data,
                    coordinates: CrimeData.neighborhoodCoordinates[name]
                };
            });
        
        // Sort by incidents (highest first)
        neighborhoods.sort((a, b) => b.incidents - a.incidents);
        
        // Create markers for each neighborhood
        neighborhoods.forEach(neighborhood => {
            this.createMarker(neighborhood);
        });
        
        // Update stats
        this.updateStats(year, crimeType, location);
        
        // Adjust map view
        if (location !== 'all' && neighborhoods.length > 0) {
            this.map.setView(neighborhoods[0].coordinates, 14);
        } else {
            this.map.setView([49.2827, -123.1207], 12);
        }
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
        // remove circle/label markers
        this.markers.forEach(marker => {
            try { this.map.removeLayer(marker); } catch(e) {}
        });
        this.markers = [];
        // remove cluster group if present
        if (this.markerCluster) {
            try { this.map.removeLayer(this.markerCluster); } catch(e) {}
            this.markerCluster = null;
        }
    },

    /**
     * Update statistics display
     */
    updateStats(year, crimeType, location = 'all') {
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = ''; // Clear previous stats
        
        const neighborhoods = Object.keys(CrimeData.neighborhoodCoordinates)
            .filter(name => location === 'all' || name === location)
            .map(name => CrimeData.getNeighborhoodData(name, year, crimeType))
            .sort((a, b) => b.incidents - a.incidents);
            
        if (neighborhoods.length === 0) {
            statsGrid.innerHTML = '<p class="no-data">No data available for this selection.</p>';
            return;
        }
        
        neighborhoods.forEach(data => {
            const threatLevel = this.getThreatLevel(data.incidents);
            const threatLabel = this.getThreatLevelLabel(data.incidents);
            const color = this.getThreatColor(data.incidents);
            
            statsGrid.innerHTML += `
                <div class="stat-card">
                    <h4>${data.name}</h4>
                    <div class="stat-value">${data.incidents.toLocaleString()}</div>
                    <div class="stat-threat threat-${threatLevel}" style="background-color: ${color}">
                        ${threatLabel}
                    </div>
                </div>
            `;
        });
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
    },

    /**
     * Render the heatmap using server /data endpoint (clustered markers)
     */
    async renderServer(year, crimeType, location = 'all') {
        if (!this.map) this.initMap();

        // Clear existing markers and any previous cluster
        this.clearMarkers();
        if (this.markerCluster) {
            try { this.map.removeLayer(this.markerCluster); } catch(e) {}
            this.markerCluster = null;
        }

        // Ensure MarkerCluster plugin is loaded
        await this.ensureMarkerClusterLoaded();

        // Create a marker cluster group
        this.markerCluster = L.markerClusterGroup({ chunkedLoading: true });
        this.map.addLayer(this.markerCluster);

        // Build query params - server endpoints may support 'year', 'type', 'neighbourhood'
        const params = new URLSearchParams();
        if (year) params.set('year', year);
        if (crimeType && crimeType !== 'all') params.set('type', crimeType);
        if (location && location !== 'all') params.set('neighbourhood', location);

        const url = '/data' + (params.toString() ? ('?' + params.toString()) : '');
        console.log('Fetching server data for map:', url);

        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn('Server data request failed', res.status);
                return;
            }
            const geo = await res.json();
            const features = geo.features || [];

            features.forEach(f => {
                const coords = f.geometry && f.geometry.coordinates;
                if (!coords || coords.length < 2) return;
                const lon = coords[0], lat = coords[1];
                const p = f.properties || {};
                const color = this.getColorForType(p.type);
                const marker = L.circleMarker([lat, lon], { radius: 6, color, fillColor: color, fillOpacity: 0.9, weight: 0.8 });
                const popup = `<div><b>${p.type || 'Unknown'}</b><br>${p.date || ''}<br>${p.neighbourhood || ''}<br>${p.hundred_block || ''}</div>`;
                marker.bindPopup(popup);
                this.markerCluster.addLayer(marker);
            });

            // Update stats with server count
            const statsGrid = document.getElementById('stats-grid');
            statsGrid.innerHTML = `
                <div class="stat-card"><h4>Total Incidents</h4><div class="stat-value">${features.length.toLocaleString()}</div></div>
            `;

            if (features.length > 0) {
                const first = features[0];
                const coords = first.geometry && first.geometry.coordinates;
                if (coords) this.map.setView([coords[1], coords[0]], 12);
            }
        } catch (err) {
            console.error('Failed to load server data for map', err);
        }
    },

    /**
     * Ensure Leaflet.markercluster is loaded (dynamically injects script and CSS)
     */
    ensureMarkerClusterLoaded() {
        return new Promise((resolve, reject) => {
            if (window.L && (typeof L.markerClusterGroup === 'function' || typeof L.MarkerClusterGroup === 'function')) {
                return resolve();
            }

            // Inject CSS
            if (!document.querySelector('link[data-markercluster]')) {
                const link = document.createElement('link');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('href', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
                link.setAttribute('data-markercluster', '1');
                document.head.appendChild(link);
                const link2 = document.createElement('link');
                link2.setAttribute('rel', 'stylesheet');
                link2.setAttribute('href', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');
                link2.setAttribute('data-markercluster', '1');
                document.head.appendChild(link2);
            }

            // Inject script
            if (!document.querySelector('script[data-markercluster]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
                script.setAttribute('data-markercluster', '1');
                script.onload = () => setTimeout(resolve, 50);
                script.onerror = (e) => reject(e);
                document.body.appendChild(script);
            } else {
                // script present but plugin may not be initialized yet
                const checkInterval = setInterval(() => {
                    if (window.L && (typeof L.markerClusterGroup === 'function' || typeof L.MarkerClusterGroup === 'function')) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
                // timeout
                setTimeout(() => reject(new Error('markercluster load timeout')), 5000);
            }
        });
    },

    /**
     * Return marker color based on crime type (simple heuristic)
     */
    getColorForType(type) {
        if (!type) return '#2b83ba';
        const s = String(type).toLowerCase();
        if (s.includes('homicide') || s.includes('arson')) return '#8f2b20';
        if (s.includes('assault') || s.includes('violent') || s.includes('robbery')) return '#e74c3c';
        if (s.includes('theft') || s.includes('break') || s.includes('vehicle')) return '#e67e22';
        if (s.includes('drug') || s.includes('mischief')) return '#f1c40f';
        return '#2ecc71';
    },
};
