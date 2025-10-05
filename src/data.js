/**
 * Crime Data Module for ObserveVan
 * Handles loading, parsing, and accessing crime data from CSV files.
 */

const CrimeData = {
    crimeDataByYear: {},
    neighborhoodCoordinates: {
        'Central Business District': [49.2827, -123.1207],
        'West End': [49.2850, -123.1350],
        'Strathcona': [49.2757, -123.0958],
        'Grandview-Woodland': [49.2739, -123.0693],
        'Mount Pleasant': [49.2641, -123.1003],
        'Fairview': [49.2655, -123.1289],
        'Kitsilano': [49.2660, -123.1563],
        'Hastings-Sunrise': [49.2812, -123.0452],
        'Renfrew-Collingwood': [49.2394, -123.0348],
        'Kensington-Cedar Cottage': [49.2506, -123.0742],
        'Riley Park': [49.2446, -123.1030],
        'Sunset': [49.2196, -123.0691],
        'Victoria-Fraserview': [49.2108, -123.0576],
        'Killarney': [49.2257, -123.0388],
        'Oakridge': [49.2287, -123.1167],
        'Marpole': [49.2103, -123.1293],
        'Dunbar-Southlands': [49.2346, -123.1852],
        'Kerrisdale': [49.2339, -123.1575],
        'Arbutus Ridge': [49.2496, -123.1545],
        'Shaughnessy': [49.2415, -123.1397],
        'West Point Grey': [49.2675, -123.1978],
        'South Cambie': [49.2431, -123.1203],
        'Stanley Park': [49.3017, -123.1442],
        'Musqueam': [49.2089, -123.2064],
    },

    /**
     * Initializes the data module by loading all crime data from CSV files.
     * @returns {Promise<void>} A promise that resolves when all data is loaded.
     */
    async init() {
        console.log('Initializing data module...');
        const years = [2020, 2021, 2022, 2023, 2024, 2025];
        const dataPromises = years.map(year => this.loadDataForYear(year));
        
        await Promise.all(dataPromises);

        // If no data was loaded (CSV unreachable), populate with sample data so UI still works
        const hasData = Object.keys(this.crimeDataByYear).some(y => {
            const d = this.crimeDataByYear[String(y)];
            return d && Object.keys(d).length > 0;
        });

        if (!hasData) {
            console.warn('No CSV data loaded — populating with embedded sample data for demo purposes.');
            this.loadSampleData();
        }

        console.log('All crime data loaded successfully.');
    },

    /**
     * Loads and processes crime data for a specific year from a CSV file.
     * @param {number} year The year to load data for.
     * @returns {Promise<void>}
     */
    async loadDataForYear(year) {
        // Use absolute path from server root to avoid path issues when serving /src
        const filePath = `/docs/data/crimedata_csv_AllNeighbourhoods_${year}/crimedata_csv_AllNeighbourhoods_${year}.csv`;

        try {
            console.log(`Fetching CSV for ${year}: ${filePath}`);
            const res = await fetch(filePath);
            if (!res.ok) {
                console.warn(`CSV not found for ${year} (status ${res.status})`);
                this.crimeDataByYear[String(year)] = {};
                return;
            }

            const text = await res.text();
            const results = Papa.parse(text, { header: true, skipEmptyLines: true });
            console.log(`Parsed ${results.data.length} rows for ${year}`);
            this.processData(year, results.data);
        } catch (err) {
            console.error(`Error loading data for ${year}:`, err);
            this.crimeDataByYear[String(year)] = {};
        }
    },

    /**
     * Processes the parsed CSV data and aggregates it by neighborhood.
     * @param {number} year The year of the data.
     * @param {Array<Object>} records The array of records from Papa Parse.
     */
    processData(year, records) {
        const data = {};
        for (const record of records) {
            const neighborhood = record.NEIGHBOURHOOD;
            if (!neighborhood || neighborhood === "NULL") continue;

            if (!data[neighborhood]) {
                data[neighborhood] = {
                    all: 0,
                    commercial: 0,
                    residential: 0,
                    theft: 0,
                    vehicle: 0,
                    person: 0,
                    mischief: 0,
                    other: 0
                };
            }

            // Add to total incidents regardless of type
            data[neighborhood].all++;

            // Categorize and increment specific type
            const type = this.categorizeCrime(record.TYPE);
            if (type) {
                data[neighborhood][type]++;
            } else {
                // If we don't recognize the type, count it as other
                data[neighborhood].other++;
            }
        }
        this.crimeDataByYear[String(year)] = data;
    },

    /**
     * Categorizes a detailed crime type into a broader category.
     * @param {string} vpdType The crime type from the VPD data.
     * @returns {string|null} The category name or null if not mapped.
     */
    categorizeCrime(vpdType) {
        if (!vpdType) return 'other';
        
        // Break and Enter cases
        if (vpdType.startsWith('Break and Enter Commercial')) {
            return 'commercial';
        }
        if (vpdType.startsWith('Break and Enter Residential')) {
            return 'residential';
        }
        
        // Theft cases
        if (vpdType.startsWith('Theft of Vehicle') || vpdType.startsWith('Theft of Bicycle') || vpdType === 'Other Theft') {
            return 'theft';
        }
        if (vpdType.startsWith('Theft from Vehicle')) {
            return 'vehicle';
        }
        
        // Violence against person
        if (vpdType.startsWith('Homicide') || vpdType.startsWith('Assault') || vpdType.includes('Violence')) {
            return 'person';
        }

        // Mischief
        if (vpdType.includes('Mischief')) {
            return 'mischief';
        }

        return 'other';
    },

    /**
     * Get crime data for a specific neighborhood and year.
     */
    getNeighborhoodData(neighborhoodName, year, crimeType = 'all') {
        const yearData = this.crimeDataByYear[String(year)];
        if (!yearData || !yearData[neighborhoodName]) {
            // Return a zero-filled object if no data is found
            return { name: neighborhoodName, year, incidents: 0, crimeType, all: 0, theft: 0, break: 0, vehicle: 0, person: 0 };
        }
        
        const neighborhoodData = yearData[neighborhoodName];
        return {
            name: neighborhoodName,
            year: year,
            // Set 'incidents' to the selected crime type's count
            incidents: neighborhoodData[crimeType] || 0,
            crimeType: crimeType,
            // Always include the counts for all categories
            ...neighborhoodData
        };
    },

    /**
     * Get all neighborhoods for a specific year and crime type.
     */
    getAllNeighborhoods(year = '2024', crimeType = 'all') {
        const yearData = this.crimeDataByYear[String(year)];
        if (!yearData) return [];

        return Object.keys(yearData).map(name => {
            return this.getNeighborhoodData(name, year, crimeType);
        }).filter(d => d !== null);
    },

    /**
     * Calculate statistics for the entire city.
     */
    getCityStats(year = '2024', crimeType = 'all') {
        const neighborhoods = this.getAllNeighborhoods(year, crimeType);
        if (neighborhoods.length === 0) {
            return { total: 0, average: 0, max: 0, min: 0, neighborhoods: 0 };
        }
        const totalIncidents = neighborhoods.reduce((sum, n) => sum + n.incidents, 0);
        
        return {
            total: totalIncidents,
            average: Math.round(totalIncidents / neighborhoods.length),
            max: Math.max(...neighborhoods.map(n => n.incidents)),
            min: Math.min(...neighborhoods.map(n => n.incidents)),
            neighborhoods: neighborhoods.length
        };
    },

    /**
     * Get the top N neighborhoods by incident count.
     */
    getTopNeighborhoods(year, crimeType, count) {
        const neighborhoods = this.getAllNeighborhoods(year, crimeType);
        return neighborhoods
            .sort((a, b) => b.incidents - a.incidents)
            .slice(0, count);
    },

    /**
     * Populate crimeDataByYear with sample data (fallback when CSVs not available)
     */
    loadSampleData() {
        const sample = {
            'Central Business District': { all: 1250, theft: 520, break: 180, vehicle: 380, person: 170 },
            'West End': { all: 680, theft: 310, break: 95, vehicle: 215, person: 60 },
            'Strathcona': { all: 890, theft: 420, break: 135, vehicle: 265, person: 70 },
            'Grandview-Woodland': { all: 520, theft: 240, break: 85, vehicle: 155, person: 40 },
            'Mount Pleasant': { all: 440, theft: 210, break: 70, vehicle: 130, person: 30 },
            'Fairview': { all: 380, theft: 175, break: 60, vehicle: 120, person: 25 },
            'Kitsilano': { all: 340, theft: 160, break: 55, vehicle: 105, person: 20 },
            'Hastings-Sunrise': { all: 460, theft: 215, break: 75, vehicle: 140, person: 30 },
            'Renfrew-Collingwood': { all: 390, theft: 180, break: 65, vehicle: 120, person: 25 },
            'Kensington-Cedar Cottage': { all: 410, theft: 190, break: 68, vehicle: 125, person: 27 },
            'Riley Park': { all: 280, theft: 130, break: 45, vehicle: 85, person: 20 },
            'Sunset': { all: 310, theft: 145, break: 50, vehicle: 95, person: 20 },
            'Victoria-Fraserview': { all: 260, theft: 120, break: 42, vehicle: 80, person: 18 },
            'Killarney': { all: 220, theft: 105, break: 35, vehicle: 65, person: 15 },
            'Oakridge': { all: 190, theft: 90, break: 30, vehicle: 58, person: 12 },
            'Marpole': { all: 330, theft: 155, break: 53, vehicle: 100, person: 22 },
            'Dunbar-Southlands': { all: 165, theft: 80, break: 27, vehicle: 48, person: 10 },
            'Kerrisdale': { all: 145, theft: 70, break: 23, vehicle: 42, person: 10 },
            'Arbutus Ridge': { all: 135, theft: 65, break: 22, vehicle: 38, person: 10 },
            'Shaughnessy': { all: 120, theft: 58, break: 20, vehicle: 34, person: 8 },
            'West Point Grey': { all: 155, theft: 75, break: 25, vehicle: 45, person: 10 },
            'South Cambie': { all: 175, theft: 85, break: 28, vehicle: 52, person: 10 },
            'Stanley Park': { all: 85, theft: 45, break: 12, vehicle: 22, person: 6 },
            'Musqueam': { all: 45, theft: 22, break: 8, vehicle: 12, person: 3 }
        };

        // Assign sample numbers to multiple years (2020-2025)
        const years = ['2020','2021','2022','2023','2024','2025'];
        years.forEach(year => {
            const data = {};
            for (const name in sample) {
                const s = sample[name];
                data[name] = {
                    all: s.all,
                    theft: s.theft,
                    break: s.break,
                    vehicle: s.vehicle,
                    person: s.person,
                    commercial: 0,
                    residential: 0,
                    mischief: 0,
                    other: 0
                };
            }
            this.crimeDataByYear[year] = data;
        });
    },
};

// Initialize the CrimeData module (uncomment in production)
// CrimeData.init();
