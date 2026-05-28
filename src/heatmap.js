/**
 * Heatmap Map Visualization Module for ObserveVan
 * Uses Leaflet.heat for smooth kernel-density heatmap rendering on a dark basemap.
 */

const HeatmapRenderer = {
    map: null,
    markers: [],
    markerCluster: null,
    heatLayer: null,
    _renderTimer: null,
    _lastRenderKey: '',

    ensureHeatLoaded() {
        return new Promise((resolve) => {
            if (window.L && typeof L.heatLayer === 'function') return resolve();
            if (document.querySelector('script[data-leaflet-heat]')) {
                const t = setInterval(() => {
                    if (window.L && typeof L.heatLayer === 'function') { clearInterval(t); resolve(); }
                }, 40);
                return;
            }
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
            s.setAttribute('data-leaflet-heat', '1');
            s.onload = () => setTimeout(resolve, 30);
            s.onerror = () => { console.warn('leaflet.heat failed to load'); resolve(); };
            document.body.appendChild(s);
        });
    },

    initMap() {
        this.map = L.map('map', { zoomControl: true }).setView([49.2827, -123.1207], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);
    },

    getThreatLevel(incidents) {
        if (incidents <= 50)  return 'very-low';
        if (incidents <= 150) return 'low';
        if (incidents <= 300) return 'moderate';
        if (incidents <= 500) return 'high';
        return 'very-high';
    },

    getThreatLevelLabel(incidents) {
        const level = this.getThreatLevel(incidents);
        return CONFIG.THREAT_LEVELS[level.toUpperCase().replace('-', '_')].label;
    },

    getThreatColor(incidents) {
        const level = this.getThreatLevel(incidents);
        return CONFIG.THREAT_LEVELS[level.toUpperCase().replace('-', '_')].color;
    },

    async render(year, crimeType, location = 'all', startYear, startMonth, endYear, endMonth) {
        if (this._renderTimer) clearTimeout(this._renderTimer);
        return new Promise(resolve => {
            this._renderTimer = setTimeout(async () => {
                await this._doRender(year, crimeType, location, startYear, startMonth, endYear, endMonth);
                resolve();
            }, 150);
        });
    },

    async _doRender(year, crimeType, location = 'all', startYear, startMonth, endYear, endMonth) {
        const key = `${year}|${crimeType}|${location}|${startYear}-${startMonth}|${endYear}-${endMonth}`;
        if (key === this._lastRenderKey) return;
        this._lastRenderKey = key;

        if (!this.map) this.initMap();
        await this.ensureHeatLoaded();
        this.clearMarkers();

        const useDateRange = (startYear && startMonth && endYear && endMonth);

        const neighborhoods = Object.keys(CrimeData.neighborhoodCoordinates)
            .filter(name => location === 'all' || name === location)
            .map(name => {
                const d = useDateRange
                    ? CrimeData.getNeighborhoodDataForDateRange(name, startYear, startMonth, endYear, endMonth, crimeType)
                    : CrimeData.getNeighborhoodData(name, year, crimeType);
                return { ...d, coordinates: CrimeData.neighborhoodCoordinates[name] };
            });

        neighborhoods.sort((a, b) => b.incidents - a.incidents);
        const maxIncidents = neighborhoods.reduce((m, n) => Math.max(m, n.incidents), 1);

        if (typeof L.heatLayer === 'function') {
            const heatPoints = [];
            neighborhoods.forEach(n => {
                const weight = n.incidents / maxIncidents;
                const spread = Math.ceil(weight * 6) + 2;
                const delta  = 0.007 * (0.4 + weight * 0.6);
                heatPoints.push([n.coordinates[0], n.coordinates[1], weight]);
                for (let i = 0; i < spread; i++) {
                    const angle = (i / spread) * 2 * Math.PI;
                    heatPoints.push([
                        n.coordinates[0] + Math.sin(angle) * delta,
                        n.coordinates[1] + Math.cos(angle) * delta,
                        weight * 0.5
                    ]);
                }
            });

            this.heatLayer = L.heatLayer(heatPoints, {
                radius:     45,
                blur:       35,
                maxZoom:    16,
                max:        1.0,
                minOpacity: 0.35,
                gradient: {
                    0.0:  '#00441b',
                    0.2:  '#1a9850',
                    0.4:  '#a6d96a',
                    0.55: '#ffffbf',
                    0.7:  '#fdae61',
                    0.85: '#d73027',
                    1.0:  '#a50026'
                }
            }).addTo(this.map);
        } else {
            neighborhoods.forEach(n => this._createFallbackCircle(n, maxIncidents));
        }

        neighborhoods.forEach(n => this._createLabelMarker(n));
        this.updateStats(year, crimeType, location, startYear, startMonth, endYear, endMonth);

        if (location !== 'all' && neighborhoods.length > 0) {
            this.map.setView(neighborhoods[0].coordinates, 14);
        } else {
            this.map.setView([49.2827, -123.1207], 12);
        }
    },

    _createFallbackCircle(neighborhood, maxIncidents) {
        const color  = this.getThreatColor(neighborhood.incidents);
        const weight = neighborhood.incidents / Math.max(maxIncidents, 1);
        const radius = (0.35 + weight * 0.65) * 2200;
        const circle = L.circle(neighborhood.coordinates, {
            color: 'transparent', fillColor: color, fillOpacity: 0.28, radius, weight: 0
        }).addTo(this.map);
        circle.bindPopup(this._popupHTML(neighborhood));
        circle.on('click', () => this.map.flyTo(neighborhood.coordinates, 14, { duration: 1 }));
        this.markers.push(circle);
    },

    _createLabelMarker(neighborhood) {
        const color = this.getThreatColor(neighborhood.incidents);
        const marker = L.marker(neighborhood.coordinates, {
            icon: L.divIcon({
                className: 'neighborhood-label',
                html: `<div style="background:rgba(15,17,23,0.82);color:#e8eaf0;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;white-space:nowrap;border-left:2px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,0.6);backdrop-filter:blur(4px);font-family:Inter,sans-serif;">${neighborhood.name}</div>`,
                iconSize: null, iconAnchor: [0, 0]
            }),
            interactive: true, zIndexOffset: 500
        }).addTo(this.map);
        marker.bindPopup(this._popupHTML(neighborhood));
        this.markers.push(marker);
    },

    _popupHTML(neighborhood) {
        const color       = this.getThreatColor(neighborhood.incidents);
        const threatLevel = this.getThreatLevel(neighborhood.incidents);
        const threatLabel = this.getThreatLevelLabel(neighborhood.incidents);
        return `
            <div class="popup-neighborhood">${neighborhood.name}</div>
            <div class="popup-incidents">${neighborhood.incidents.toLocaleString()} incidents</div>
            <div class="popup-threat threat-${threatLevel}" style="background:${color};color:#fff;display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-top:4px;">${threatLabel}</div>
            <small style="display:block;margin-top:6px;color:#8b93a8;">${neighborhood.crimeType === 'all' ? 'All Crimes' : neighborhood.crimeType}</small>`;
    },

    clearMarkers() {
        this.markers.forEach(m => { try { this.map.removeLayer(m); } catch(e) {} });
        this.markers = [];
        if (this.heatLayer) { try { this.map.removeLayer(this.heatLayer); } catch(e) {} this.heatLayer = null; }
        if (this.markerCluster) { try { this.map.removeLayer(this.markerCluster); } catch(e) {} this.markerCluster = null; }
    },

    updateStats(year, crimeType, location = 'all', startYear, startMonth, endYear, endMonth) {
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = '';
        const useDateRange = (startYear && startMonth && endYear && endMonth);
        const neighborhoods = Object.keys(CrimeData.neighborhoodCoordinates)
            .filter(name => location === 'all' || name === location)
            .map(name => useDateRange
                ? CrimeData.getNeighborhoodDataForDateRange(name, startYear, startMonth, endYear, endMonth, crimeType)
                : CrimeData.getNeighborhoodData(name, year, crimeType))
            .sort((a, b) => b.incidents - a.incidents);

        if (neighborhoods.length === 0) {
            statsGrid.innerHTML = '<p class="no-data">No data available for this selection.</p>';
            return;
        }
        const frag = document.createDocumentFragment();
        neighborhoods.forEach(data => {
            const threatLevel = this.getThreatLevel(data.incidents);
            const threatLabel = this.getThreatLevelLabel(data.incidents);
            const color       = this.getThreatColor(data.incidents);
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `<h4>${data.name}</h4><div class="stat-value">${data.incidents.toLocaleString()}</div><div class="stat-threat threat-${threatLevel}" style="background-color:${color}">${threatLabel}</div>`;
            frag.appendChild(card);
        });
        statsGrid.appendChild(frag);
    },

    async renderServer(year, crimeType, location = 'all') {
        if (!this.map) this.initMap();
        await this.ensureHeatLoaded();
        this.clearMarkers();
        await this.ensureMarkerClusterLoaded();
        this.markerCluster = L.markerClusterGroup({ chunkedLoading: true });
        this.map.addLayer(this.markerCluster);
        const params = new URLSearchParams();
        if (year) params.set('year', year);
        if (crimeType && crimeType !== 'all') params.set('type', crimeType);
        if (location  && location  !== 'all') params.set('neighbourhood', location);
        const url = '/data' + (params.toString() ? '?' + params.toString() : '');
        try {
            const res = await fetch(url);
            if (!res.ok) { console.warn('Server data request failed', res.status); return; }
            const geo = await res.json();
            const features = geo.features || [];
            const heatPoints = [];
            features.forEach(f => {
                const coords = f.geometry && f.geometry.coordinates;
                if (!coords || coords.length < 2) return;
                const [lon, lat] = coords;
                heatPoints.push([lat, lon, 0.6]);
                const p = f.properties || {};
                const color = this.getColorForType(p.type);
                const m = L.circleMarker([lat, lon], { radius:5, color, fillColor:color, fillOpacity:0.85, weight:0.6 });
                m.bindPopup(`<div><b>${p.type||'Unknown'}</b><br>${p.date||''}<br>${p.neighbourhood||''}</div>`);
                this.markerCluster.addLayer(m);
            });
            if (typeof L.heatLayer === 'function' && heatPoints.length) {
                this.heatLayer = L.heatLayer(heatPoints, {
                    radius:30, blur:22, maxZoom:16, minOpacity:0.3,
                    gradient:{0.0:'#00441b',0.25:'#1a9850',0.45:'#a6d96a',0.6:'#ffffbf',0.75:'#fdae61',0.88:'#d73027',1.0:'#a50026'}
                }).addTo(this.map);
            }
            const statsGrid = document.getElementById('stats-grid');
            statsGrid.innerHTML = `<div class="stat-card"><h4>Total Incidents</h4><div class="stat-value">${features.length.toLocaleString()}</div></div>`;
        } catch (err) {
            console.error('Failed to load server data for map', err);
        }
    },

    ensureMarkerClusterLoaded() {
        return new Promise((resolve, reject) => {
            if (window.L && typeof L.markerClusterGroup === 'function') return resolve();
            if (!document.querySelector('script[data-markercluster]')) {
                const s = document.createElement('script');
                s.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
                s.setAttribute('data-markercluster', '1');
                s.onload = () => setTimeout(resolve, 50);
                s.onerror = reject;
                document.body.appendChild(s);
            } else {
                const t = setInterval(() => {
                    if (typeof L.markerClusterGroup === 'function') { clearInterval(t); resolve(); }
                }, 50);
                setTimeout(() => reject(new Error('markercluster timeout')), 5000);
            }
        });
    },

    getColorForType(type) {
        if (!type) return '#2b83ba';
        const s = String(type).toLowerCase();
        if (s.includes('homicide') || s.includes('arson'))                             return '#a50026';
        if (s.includes('assault')  || s.includes('violent') || s.includes('robbery')) return '#d73027';
        if (s.includes('theft')    || s.includes('break')   || s.includes('vehicle')) return '#fdae61';
        if (s.includes('drug')     || s.includes('mischief'))                         return '#1a9850';
        return '#4f8ef7';
    },
};
