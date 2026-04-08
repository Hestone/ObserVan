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

        console.log('All crime data loaded successfully.');
    },

    /**
     * Loads and processes crime data for a specific year from a CSV file.
     * @param {number} year The year to load data for.
     * @returns {Promise<void>}
     */
    async loadDataForYear(year) {
        const filePath = `data_csv/crimedata_csv_AllNeighbourhoods_${year}/crimedata_csv_AllNeighbourhoods_${year}.csv`;
        console.log(`Attempting to load data for ${year} from: ${filePath}`);
        
        return new Promise((resolve, reject) => {
            Papa.parse(filePath, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    console.log(`Successfully parsed data for ${year}. Found ${results.data.length} records.`);
                    this.processData(year, results.data);
                    resolve();
                },
                error: (error) => {
                    console.error(`Error loading or parsing data for ${year}:`, error);
                    this.crimeDataByYear[String(year)] = {}; 
                    resolve(); // Resolve anyway to not block the app
                }
            });
        });
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
                    other: 0,
                    hourCounts: {},    // counts per hour
                    topHours: []       // filled after processing
                };
            }

            // Add to total incidents regardless of type
            data[neighborhood].all++;

            // Categorize and increment specific type
            const type = this.categorizeCrime(record.TYPE);
            
            // ensure key exists and increment
            if (data[neighborhood][type] !== undefined) {
                data[neighborhood][type]++;
            } else {
                data[neighborhood].other++;
            }

            // Record hour information if available (HOUR field in CSV)
            const hourRaw = record.HOUR ?? record.Hour ?? record.hour;
            const hour = hourRaw !== undefined ? parseInt(hourRaw, 10) : NaN;
            if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) {
                data[neighborhood].hourCounts[hour] = (data[neighborhood].hourCounts[hour] || 0) + 1;
            }
        }

        // compute topHours and peakTimeOfDay for each neighborhood
        for (const nb in data) {
            const counts = data[nb].hourCounts || {};
            data[nb].topHours = Object.keys(counts)
                .map(h => ({ hour: Number(h), count: counts[h] }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);
            data[nb].peakTimeOfDay = this.getPeakTimeOfDay(counts);
        }
        this.crimeDataByYear[String(year)] = data;
        console.log(`Finished processing ${year}. Found ${Object.keys(data).length} neighborhoods.`);
    },

    /**
     * Analyzes hourCounts to determine the most common time of day for incidents.
     * @param {Object} hourCounts - An object with hours (0-23) as keys and incident counts as values.
     * @returns {string} The name of the peak time slot (e.g., "Afternoon", "Late Night").
     */
    getPeakTimeOfDay(hourCounts) {
        if (!hourCounts || Object.keys(hourCounts).length === 0) {
            return 'N/A';
        }

        const timeSlots = {
            'Late Night': { hours: [0, 1, 2, 3], count: 0 },      // 12am - 4am
            'Early Morning': { hours: [4, 5, 6, 7], count: 0 },   // 4am - 8am
            'Morning': { hours: [8, 9, 10, 11], count: 0 },      // 8am - 12pm
            'Afternoon': { hours: [12, 13, 14, 15, 16], count: 0 },// 12pm - 5pm
            'Evening': { hours: [17, 18, 19, 20], count: 0 },    // 5pm - 9pm
            'Night': { hours: [21, 22, 23], count: 0 }           // 9pm - 12am
        };

        for (const hour in hourCounts) {
            const h = parseInt(hour, 10);
            const count = hourCounts[hour];
            for (const slotName in timeSlots) {
                if (timeSlots[slotName].hours.includes(h)) {
                    timeSlots[slotName].count += count;
                }
            }
        }

        let peakSlot = 'N/A';
        let maxCount = 0;

        for (const slotName in timeSlots) {
            if (timeSlots[slotName].count > maxCount) {
                maxCount = timeSlots[slotName].count;
                peakSlot = slotName;
            }
        }

        return peakSlot;
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
            return { name: neighborhoodName, year, incidents: 0, crimeType, all: 0, theft: 0, break: 0, vehicle: 0, person: 0, hourCounts: {}, topHours: [], peakTimeOfDay: 'N/A' };
        }
        
        const neighborhoodData = yearData[neighborhoodName];
        return {
            name: neighborhoodName,
            year: year,
            // Set 'incidents' to the selected crime type's count
            incidents: crimeType === 'all' ? (neighborhoodData.all || 0) : (neighborhoodData[crimeType] || 0),
            crimeType: crimeType,
            // Include hour information
            hourCounts: neighborhoodData.hourCounts || {},
            topHours: neighborhoodData.topHours || [],
            peakTimeOfDay: neighborhoodData.peakTimeOfDay || 'N/A',
            // Always include the counts for all categories
            ...neighborhoodData
        };
    },

    /**
     * Get all neighborhoods for a specific year and crime type.
     */
    getAllNeighborhoods(year = '2025', crimeType = 'all') {
        const yearData = this.crimeDataByYear[String(year)];
        if (!yearData) return [];

        return Object.keys(yearData).map(name => {
            return this.getNeighborhoodData(name, year, crimeType);
        }).filter(d => d !== null);
    },

    /**
     * Calculate statistics for the entire city.
     */
    getCityStats(year = '2025', crimeType = 'all') {
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
    }
};

// Initialize the CrimeData module (uncomment in production)
// CrimeData.init();
