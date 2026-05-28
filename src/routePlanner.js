/*
 Minimal client-side route planner (no external routing API)
 - Uses straight-line route between start/destination
 - Samples points along route, maps to nearest neighborhood
 - Sums incidents for neighborhoods in the selected time window and crime type
 - Draws route on the map with color based on risk
*/

const RoutePlanner = {
    DEFAULT_SAMPLES: 40,
    lastLayer: null,

    parseLatLng(text) {
        if (!text) return null;
        const parts = text.split(',').map(s => s.trim());
        if (parts.length !== 2) return null;
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        return null;
    },

    sampleLine(a, b, samples = this.DEFAULT_SAMPLES) {
        const pts = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            pts.push([a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t]);
        }
        return pts;
    },

    getNearestNeighborhood(point) {
        let best = null;
        let bestDist = Infinity;
        for (const name in CrimeData.neighborhoodCoordinates) {
            const [ny, nx] = CrimeData.neighborhoodCoordinates[name];
            const d = (ny - point.lat) * (ny - point.lat) + (nx - point.lng) * (nx - point.lng);
            if (d < bestDist) {
                bestDist = d;
                best = name;
            }
        }
        return best;
    },

    sumIncidentsForNeighborhood(nb, year, crimeType, startHour, endHour) {
        const nd = CrimeData.getNeighborhoodData(nb, year, crimeType);
        if (!nd || !nd.hourCounts) return 0;
        if (startHour == null || endHour == null) {
            return nd.incidents || 0;
        }
        let sum = 0;
        let h = startHour;
        while (true) {
            sum += (nd.hourCounts[h] || 0);
            if (h === endHour) break;
            h = (h + 1) % 24;
        }
        return sum;
    },

    incidentsAlongRoute(samplePoints, year, crimeType, startHour, endHour) {
        const seen = new Set();
        for (const p of samplePoints) {
            const nb = this.getNearestNeighborhood({ lat: p[0], lng: p[1] });
            if (nb) seen.add(nb);
        }
        const neighborhoods = Array.from(seen);
        let total = 0;
        const perNb = {};
        neighborhoods.forEach(nb => {
            const count = this.sumIncidentsForNeighborhood(nb, year, crimeType, startHour, endHour);
            perNb[nb] = count;
            total += count;
        });
        return { total, neighborhoods, perNb };
    },

    scoreToColor(score) {
        // score normalized heuristics: 0 -> green, >300 -> red
        if (score <= 50) return '#2b83ba';
        if (score <= 150) return '#ffffbf';
        if (score <= 300) return '#fdae61';
        return '#d7191c';
    },

    async planRoute(start, dest, opts = {}) {
        if (!HeatmapRenderer.map) HeatmapRenderer.initMap();
        const year = opts.year || CONFIG.DEFAULT_YEAR;
        const crimeType = opts.crimeType || 'all';
        const startHour = typeof opts.startHour === 'number' ? opts.startHour : null;
        const endHour = typeof opts.endHour === 'number' ? opts.endHour : null;

        const samples = this.sampleLine(start, dest, opts.samples || this.DEFAULT_SAMPLES);
        const result = this.incidentsAlongRoute(samples, year, crimeType, startHour, endHour);

        // compute normalized score per neighborhood count
        const denom = Math.max(result.neighborhoods.length, 1);
        const score = Math.round(result.total / denom);
        const color = this.scoreToColor(score);

        // draw polyline
        if (this.lastLayer) {
            try {
                HeatmapRenderer.map.removeLayer(this.lastLayer);
            } catch (e) {}
        }
        this.lastLayer = L.polyline(samples, { color, weight: 5, opacity: 0.8 }).addTo(HeatmapRenderer.map);

        const worst = Object.keys(result.perNb)
            .map(name => ({ name, count: result.perNb[name] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // try to find a simple alternative by adding a waypoint
        // (this is a very naive implementation)
        let alternatives = [];
        if (score > 100) {
            // try shifting waypoint north/south
            const waypoint = { lat: start.lat + (dest.lat - start.lat) * 0.5 + 0.01, lng: start.lng + (dest.lng - start.lng) * 0.5 };
            const alt_samples = [...this.sampleLine(start, waypoint), ...this.sampleLine(waypoint, dest)];
            const alt_res = this.incidentsAlongRoute(alt_samples, year, crimeType, startHour, endHour);
            if (alt_res.total < result.total) {
                alternatives.push({ total: alt_res.total, waypoint });
            }
        }

        return {
            total: result.total,
            score,
            worst,
            neighborhoods: result.neighborhoods,
            layer: this.lastLayer,
            alternatives
        };
    }
};

window.RoutePlanner = RoutePlanner;
