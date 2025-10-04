/**
 * Crime Data Module for ObserveVan
 * Contains sample data and data management functions
 */

const CrimeData = {
    // Sample crime data by neighborhood (based on typical Vancouver crime statistics)
    // In production, this would be loaded from VPD Open Data CSV files
    neighborhoods: {
        'Central Business District': {
            name: 'Central Business District',
            coordinates: [49.2827, -123.1207],
            crimeStats: {
                2024: { all: 1250, theft: 520, break: 180, vehicle: 380, person: 170 },
                2023: { all: 1420, theft: 600, break: 210, vehicle: 410, person: 200 },
                2022: { all: 1380, theft: 580, break: 195, vehicle: 405, person: 200 },
                2021: { all: 1150, theft: 490, break: 160, vehicle: 350, person: 150 },
                2020: { all: 980, theft: 420, break: 140, vehicle: 290, person: 130 }
            }
        },
        'West End': {
            name: 'West End',
            coordinates: [49.2850, -123.1350],
            crimeStats: {
                2024: { all: 680, theft: 310, break: 95, vehicle: 215, person: 60 },
                2023: { all: 720, theft: 340, break: 105, vehicle: 220, person: 55 },
                2022: { all: 695, theft: 325, break: 98, vehicle: 212, person: 60 },
                2021: { all: 620, theft: 290, break: 85, vehicle: 190, person: 55 },
                2020: { all: 550, theft: 260, break: 75, vehicle: 165, person: 50 }
            }
        },
        'Strathcona': {
            name: 'Strathcona',
            coordinates: [49.2757, -123.0958],
            crimeStats: {
                2024: { all: 890, theft: 420, break: 135, vehicle: 265, person: 70 },
                2023: { all: 920, theft: 450, break: 145, vehicle: 255, person: 70 },
                2022: { all: 875, theft: 430, break: 130, vehicle: 245, person: 70 },
                2021: { all: 780, theft: 380, break: 110, vehicle: 220, person: 70 },
                2020: { all: 710, theft: 350, break: 100, vehicle: 200, person: 60 }
            }
        },
        'Grandview-Woodland': {
            name: 'Grandview-Woodland',
            coordinates: [49.2739, -123.0693],
            crimeStats: {
                2024: { all: 520, theft: 240, break: 85, vehicle: 155, person: 40 },
                2023: { all: 560, theft: 270, break: 90, vehicle: 160, person: 40 },
                2022: { all: 535, theft: 255, break: 88, vehicle: 152, person: 40 },
                2021: { all: 480, theft: 230, break: 75, vehicle: 140, person: 35 },
                2020: { all: 420, theft: 200, break: 65, vehicle: 125, person: 30 }
            }
        },
        'Mount Pleasant': {
            name: 'Mount Pleasant',
            coordinates: [49.2641, -123.1003],
            crimeStats: {
                2024: { all: 440, theft: 210, break: 70, vehicle: 130, person: 30 },
                2023: { all: 480, theft: 235, break: 75, vehicle: 140, person: 30 },
                2022: { all: 455, theft: 220, break: 72, vehicle: 133, person: 30 },
                2021: { all: 410, theft: 200, break: 65, vehicle: 120, person: 25 },
                2020: { all: 370, theft: 180, break: 55, vehicle: 110, person: 25 }
            }
        },
        'Fairview': {
            name: 'Fairview',
            coordinates: [49.2655, -123.1289],
            crimeStats: {
                2024: { all: 380, theft: 175, break: 60, vehicle: 120, person: 25 },
                2023: { all: 410, theft: 195, break: 65, vehicle: 125, person: 25 },
                2022: { all: 395, theft: 185, break: 62, vehicle: 123, person: 25 },
                2021: { all: 350, theft: 165, break: 55, vehicle: 110, person: 20 },
                2020: { all: 310, theft: 145, break: 48, vehicle: 97, person: 20 }
            }
        },
        'Kitsilano': {
            name: 'Kitsilano',
            coordinates: [49.2660, -123.1563],
            crimeStats: {
                2024: { all: 340, theft: 160, break: 55, vehicle: 105, person: 20 },
                2023: { all: 370, theft: 180, break: 60, vehicle: 110, person: 20 },
                2022: { all: 355, theft: 170, break: 57, vehicle: 108, person: 20 },
                2021: { all: 320, theft: 155, break: 50, vehicle: 100, person: 15 },
                2020: { all: 280, theft: 135, break: 43, vehicle: 87, person: 15 }
            }
        },
        'Hastings-Sunrise': {
            name: 'Hastings-Sunrise',
            coordinates: [49.2812, -123.0452],
            crimeStats: {
                2024: { all: 460, theft: 215, break: 75, vehicle: 140, person: 30 },
                2023: { all: 490, theft: 235, break: 80, vehicle: 145, person: 30 },
                2022: { all: 470, theft: 225, break: 77, vehicle: 138, person: 30 },
                2021: { all: 420, theft: 200, break: 68, vehicle: 127, person: 25 },
                2020: { all: 380, theft: 180, break: 60, vehicle: 115, person: 25 }
            }
        },
        'Renfrew-Collingwood': {
            name: 'Renfrew-Collingwood',
            coordinates: [49.2394, -123.0348],
            crimeStats: {
                2024: { all: 390, theft: 180, break: 65, vehicle: 120, person: 25 },
                2023: { all: 420, theft: 200, break: 70, vehicle: 125, person: 25 },
                2022: { all: 405, theft: 190, break: 67, vehicle: 123, person: 25 },
                2021: { all: 360, theft: 170, break: 60, vehicle: 110, person: 20 },
                2020: { all: 320, theft: 150, break: 52, vehicle: 98, person: 20 }
            }
        },
        'Kensington-Cedar Cottage': {
            name: 'Kensington-Cedar Cottage',
            coordinates: [49.2506, -123.0742],
            crimeStats: {
                2024: { all: 410, theft: 190, break: 68, vehicle: 125, person: 27 },
                2023: { all: 440, theft: 210, break: 73, vehicle: 130, person: 27 },
                2022: { all: 425, theft: 200, break: 70, vehicle: 128, person: 27 },
                2021: { all: 380, theft: 180, break: 62, vehicle: 115, person: 23 },
                2020: { all: 340, theft: 160, break: 55, vehicle: 105, person: 20 }
            }
        },
        'Riley Park': {
            name: 'Riley Park',
            coordinates: [49.2446, -123.1030],
            crimeStats: {
                2024: { all: 280, theft: 130, break: 45, vehicle: 85, person: 20 },
                2023: { all: 305, theft: 145, break: 50, vehicle: 90, person: 20 },
                2022: { all: 292, theft: 137, break: 47, vehicle: 88, person: 20 },
                2021: { all: 260, theft: 125, break: 42, vehicle: 78, person: 15 },
                2020: { all: 230, theft: 110, break: 37, vehicle: 68, person: 15 }
            }
        },
        'Sunset': {
            name: 'Sunset',
            coordinates: [49.2196, -123.0691],
            crimeStats: {
                2024: { all: 310, theft: 145, break: 50, vehicle: 95, person: 20 },
                2023: { all: 335, theft: 160, break: 55, vehicle: 100, person: 20 },
                2022: { all: 322, theft: 152, break: 52, vehicle: 98, person: 20 },
                2021: { all: 285, theft: 135, break: 47, vehicle: 88, person: 15 },
                2020: { all: 250, theft: 120, break: 40, vehicle: 75, person: 15 }
            }
        },
        'Victoria-Fraserview': {
            name: 'Victoria-Fraserview',
            coordinates: [49.2108, -123.0576],
            crimeStats: {
                2024: { all: 260, theft: 120, break: 42, vehicle: 80, person: 18 },
                2023: { all: 280, theft: 135, break: 47, vehicle: 83, person: 15 },
                2022: { all: 270, theft: 127, break: 44, vehicle: 82, person: 17 },
                2021: { all: 240, theft: 115, break: 39, vehicle: 73, person: 13 },
                2020: { all: 210, theft: 100, break: 34, vehicle: 63, person: 13 }
            }
        },
        'Killarney': {
            name: 'Killarney',
            coordinates: [49.2257, -123.0388],
            crimeStats: {
                2024: { all: 220, theft: 105, break: 35, vehicle: 65, person: 15 },
                2023: { all: 240, theft: 115, break: 40, vehicle: 70, person: 15 },
                2022: { all: 230, theft: 110, break: 37, vehicle: 68, person: 15 },
                2021: { all: 200, theft: 95, break: 33, vehicle: 60, person: 12 },
                2020: { all: 180, theft: 85, break: 28, vehicle: 55, person: 12 }
            }
        },
        'Oakridge': {
            name: 'Oakridge',
            coordinates: [49.2287, -123.1167],
            crimeStats: {
                2024: { all: 190, theft: 90, break: 30, vehicle: 58, person: 12 },
                2023: { all: 205, theft: 100, break: 33, vehicle: 60, person: 12 },
                2022: { all: 197, theft: 95, break: 31, vehicle: 59, person: 12 },
                2021: { all: 175, theft: 85, break: 28, vehicle: 52, person: 10 },
                2020: { all: 155, theft: 75, break: 24, vehicle: 46, person: 10 }
            }
        },
        'Marpole': {
            name: 'Marpole',
            coordinates: [49.2103, -123.1293],
            crimeStats: {
                2024: { all: 330, theft: 155, break: 53, vehicle: 100, person: 22 },
                2023: { all: 360, theft: 175, break: 58, vehicle: 105, person: 22 },
                2022: { all: 345, theft: 165, break: 55, vehicle: 103, person: 22 },
                2021: { all: 310, theft: 150, break: 50, vehicle: 93, person: 17 },
                2020: { all: 270, theft: 130, break: 43, vehicle: 82, person: 15 }
            }
        },
        'Dunbar-Southlands': {
            name: 'Dunbar-Southlands',
            coordinates: [49.2346, -123.1852],
            crimeStats: {
                2024: { all: 165, theft: 80, break: 27, vehicle: 48, person: 10 },
                2023: { all: 180, theft: 90, break: 30, vehicle: 50, person: 10 },
                2022: { all: 172, theft: 85, break: 28, vehicle: 49, person: 10 },
                2021: { all: 150, theft: 75, break: 24, vehicle: 43, person: 8 },
                2020: { all: 130, theft: 65, break: 20, vehicle: 38, person: 7 }
            }
        },
        'Kerrisdale': {
            name: 'Kerrisdale',
            coordinates: [49.2339, -123.1575],
            crimeStats: {
                2024: { all: 145, theft: 70, break: 23, vehicle: 42, person: 10 },
                2023: { all: 160, theft: 80, break: 26, vehicle: 44, person: 10 },
                2022: { all: 152, theft: 75, break: 24, vehicle: 43, person: 10 },
                2021: { all: 135, theft: 68, break: 21, vehicle: 38, person: 8 },
                2020: { all: 115, theft: 58, break: 18, vehicle: 32, person: 7 }
            }
        },
        'Arbutus Ridge': {
            name: 'Arbutus Ridge',
            coordinates: [49.2496, -123.1545],
            crimeStats: {
                2024: { all: 135, theft: 65, break: 22, vehicle: 38, person: 10 },
                2023: { all: 150, theft: 75, break: 24, vehicle: 41, person: 10 },
                2022: { all: 142, theft: 70, break: 23, vehicle: 39, person: 10 },
                2021: { all: 125, theft: 63, break: 20, vehicle: 34, person: 8 },
                2020: { all: 105, theft: 53, break: 17, vehicle: 28, person: 7 }
            }
        },
        'Shaughnessy': {
            name: 'Shaughnessy',
            coordinates: [49.2415, -123.1397],
            crimeStats: {
                2024: { all: 120, theft: 58, break: 20, vehicle: 34, person: 8 },
                2023: { all: 135, theft: 68, break: 22, vehicle: 37, person: 8 },
                2022: { all: 127, theft: 63, break: 21, vehicle: 35, person: 8 },
                2021: { all: 110, theft: 55, break: 18, vehicle: 30, person: 7 },
                2020: { all: 95, theft: 48, break: 15, vehicle: 26, person: 6 }
            }
        },
        'West Point Grey': {
            name: 'West Point Grey',
            coordinates: [49.2675, -123.1978],
            crimeStats: {
                2024: { all: 155, theft: 75, break: 25, vehicle: 45, person: 10 },
                2023: { all: 170, theft: 85, break: 28, vehicle: 47, person: 10 },
                2022: { all: 162, theft: 80, break: 26, vehicle: 46, person: 10 },
                2021: { all: 140, theft: 70, break: 23, vehicle: 40, person: 7 },
                2020: { all: 120, theft: 60, break: 19, vehicle: 34, person: 7 }
            }
        },
        'South Cambie': {
            name: 'South Cambie',
            coordinates: [49.2431, -123.1203],
            crimeStats: {
                2024: { all: 175, theft: 85, break: 28, vehicle: 52, person: 10 },
                2023: { all: 190, theft: 95, break: 31, vehicle: 54, person: 10 },
                2022: { all: 182, theft: 90, break: 29, vehicle: 53, person: 10 },
                2021: { all: 160, theft: 80, break: 26, vehicle: 47, person: 7 },
                2020: { all: 140, theft: 70, break: 22, vehicle: 41, person: 7 }
            }
        },
        'Stanley Park': {
            name: 'Stanley Park',
            coordinates: [49.3017, -123.1442],
            crimeStats: {
                2024: { all: 85, theft: 45, break: 12, vehicle: 22, person: 6 },
                2023: { all: 95, theft: 52, break: 14, vehicle: 23, person: 6 },
                2022: { all: 90, theft: 48, break: 13, vehicle: 23, person: 6 },
                2021: { all: 75, theft: 42, break: 10, vehicle: 18, person: 5 },
                2020: { all: 65, theft: 36, break: 8, vehicle: 16, person: 5 }
            }
        },
        'Musqueam': {
            name: 'Musqueam',
            coordinates: [49.2089, -123.2064],
            crimeStats: {
                2024: { all: 45, theft: 22, break: 8, vehicle: 12, person: 3 },
                2023: { all: 50, theft: 25, break: 9, vehicle: 13, person: 3 },
                2022: { all: 47, theft: 23, break: 8, vehicle: 13, person: 3 },
                2021: { all: 40, theft: 20, break: 7, vehicle: 11, person: 2 },
                2020: { all: 35, theft: 18, break: 6, vehicle: 9, person: 2 }
            }
        }
    },

    /**
     * Get crime data for a specific neighborhood and year
     */
    getNeighborhoodData(neighborhoodName, year, crimeType = 'all') {
        const neighborhood = this.neighborhoods[neighborhoodName];
        if (!neighborhood) return null;
        
        const yearData = neighborhood.crimeStats[year];
        if (!yearData) return null;
        
        return {
            name: neighborhood.name,
            year: year,
            incidents: yearData[crimeType] || 0,
            crimeType: crimeType
        };
    },

    /**
     * Get all neighborhoods for a specific year and crime type
     */
    getAllNeighborhoods(year = '2024', crimeType = 'all') {
        return Object.keys(this.neighborhoods).map(name => {
            const data = this.getNeighborhoodData(name, year, crimeType);
            return data;
        }).filter(d => d !== null);
    },

    /**
     * Calculate statistics for the entire city
     */
    getCityStats(year = '2024', crimeType = 'all') {
        const neighborhoods = this.getAllNeighborhoods(year, crimeType);
        const total = neighborhoods.reduce((sum, n) => sum + n.incidents, 0);
        const avg = total / neighborhoods.length;
        const max = Math.max(...neighborhoods.map(n => n.incidents));
        const min = Math.min(...neighborhoods.map(n => n.incidents));
        
        return {
            total,
            average: Math.round(avg),
            max,
            min,
            neighborhoods: neighborhoods.length
        };
    }
};

// Note: In production, you would fetch actual CSV data from VPD Open Data
// Instructions for loading real data:
// 1. Download CSV files from https://geodash.vpd.ca/opendata/
// 2. Parse CSV using Papa Parse or similar library
// 3. Replace the sample data above with actual crime statistics
