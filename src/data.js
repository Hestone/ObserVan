/**
 * Crime Data Module for ObserveVan
 * Handles loading, parsing, and accessing crime data from CSV files.
 */

const CrimeData = {
    crimeDataByYear:  {},
    crimeDataByMonth: {},
    crimeTypes: new Set(),
    _rangeCache: {},

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

    async init() {
        console.log('Initializing data module...');
        const years = [2020, 2021, 2022, 2023, 2024, 2025];
        await Promise.all(years.map(y => this.loadDataForYear(y)));

        const hasData = Object.keys(this.crimeDataByYear).some(y => {
            const d = this.crimeDataByYear[String(y)];
            return d && Object.keys(d).length > 0;
        });

        if (!hasData) {
            console.warn('No CSV data loaded — using embedded sample data.');
            this.loadSampleData();
        }
        console.log(`Data loaded. Crime types found: ${this.crimeTypes.size}`);
    },

    async loadDataForYear(year) {
        const filePath = `/docs/data/crimedata_csv_AllNeighbourhoods_${year}/crimedata_csv_AllNeighbourhoods_${year}.csv`;
        try {
            const res = await fetch(filePath);
            if (!res.ok) { this.crimeDataByYear[String(year)] = {}; return; }
            const text = await res.text();
            const results = Papa.parse(text, { header: true, skipEmptyLines: true });
            console.log(`Parsed ${results.data.length} rows for ${year}`);
            this.processData(year, results.data);
        } catch (err) {
            console.error(`Error loading data for ${year}:`, err);
            this.crimeDataByYear[String(year)] = {};
        }
    },

    processData(year, records) {
        const yearData = this.crimeDataByYear[String(year)] || {};
        for (const record of records) {
            const neighbourhood = record.NEIGHBOURHOOD;
            const type  = (record.TYPE || '').trim();
            const month = parseInt(record.MONTH, 10);
            if (!neighbourhood || neighbourhood === 'NULL') continue;
            if (!type || type === 'TYPE') continue;
            if (isNaN(month) || month < 1 || month > 12) continue;

            this.crimeTypes.add(type);

            if (!yearData[neighbourhood]) yearData[neighbourhood] = { all: 0 };
            yearData[neighbourhood].all++;
            yearData[neighbourhood][type] = (yearData[neighbourhood][type] || 0) + 1;

            const key = `${year}-${month}`;
            if (!this.crimeDataByMonth[key]) this.crimeDataByMonth[key] = {};
            if (!this.crimeDataByMonth[key][neighbourhood])
                this.crimeDataByMonth[key][neighbourhood] = { all: 0 };
            this.crimeDataByMonth[key][neighbourhood].all++;
            this.crimeDataByMonth[key][neighbourhood][type] =
                (this.crimeDataByMonth[key][neighbourhood][type] || 0) + 1;
        }
        this.crimeDataByYear[String(year)] = yearData;
        this._rangeCache = {};
    },

    getNeighborhoodDataForDateRange(name, startYear, startMonth, endYear, endMonth, crimeType = 'all') {
        const cacheKey = `${name}|${startYear}|${startMonth}|${endYear}|${endMonth}|${crimeType}`;
        if (this._rangeCache[cacheKey]) return this._rangeCache[cacheKey];

        let total = 0;
        let y = parseInt(startYear, 10), m = parseInt(startMonth, 10);
        const ey = parseInt(endYear, 10), em = parseInt(endMonth, 10);
        while (y < ey || (y === ey && m <= em)) {
            const key = `${y}-${m}`;
            const monthData = this.crimeDataByMonth[key];
            if (monthData && monthData[name]) {
                total += crimeType === 'all'
                    ? (monthData[name].all || 0)
                    : (monthData[name][crimeType] || 0);
            }
            m++; if (m > 12) { m = 1; y++; }
        }
        const result = { name, incidents: total, crimeType, startYear, startMonth, endYear, endMonth };
        this._rangeCache[cacheKey] = result;
        return result;
    },

    getAllCrimeTypes() {
        return Array.from(this.crimeTypes).sort();
    },

    getNeighborhoodData(neighbourhoodName, year, crimeType = 'all') {
        const yearData = this.crimeDataByYear[String(year)];
        if (!yearData || !yearData[neighbourhoodName]) {
            return { name: neighbourhoodName, year, incidents: 0, crimeType };
        }
        const d = yearData[neighbourhoodName];
        return {
            name: neighbourhoodName, year,
            incidents: crimeType === 'all' ? (d.all || 0) : (d[crimeType] || 0),
            crimeType, ...d
        };
    },

    getAllNeighborhoods(year = '2024', crimeType = 'all') {
        const yearData = this.crimeDataByYear[String(year)];
        if (!yearData) return [];
        return Object.keys(yearData).map(name => this.getNeighborhoodData(name, year, crimeType));
    },

    getCityStats(year = '2024', crimeType = 'all') {
        const n = this.getAllNeighborhoods(year, crimeType);
        if (n.length === 0) return { total:0, average:0, max:0, min:0, neighborhoods:0 };
        const total = n.reduce((s, x) => s + x.incidents, 0);
        return { total, average: Math.round(total/n.length), max: Math.max(...n.map(x=>x.incidents)), min: Math.min(...n.map(x=>x.incidents)), neighborhoods: n.length };
    },

    getTopNeighborhoods(year, crimeType, count) {
        return this.getAllNeighborhoods(year, crimeType).sort((a,b)=>b.incidents-a.incidents).slice(0,count);
    },

    loadSampleData() {
        const VPD_TYPES = [
            'Break and Enter Commercial',
            'Break and Enter Residential/Other',
            'Mischief',
            'Offence Against a Person',
            'Other Theft',
            'Theft from Vehicle',
            'Theft of Bicycle',
            'Theft of Vehicle',
        ];
        VPD_TYPES.forEach(t => this.crimeTypes.add(t));

        const base = {
            'Central Business District':  { all:1250, 'Break and Enter Commercial':180, 'Theft from Vehicle':380, 'Other Theft':520, 'Offence Against a Person':170 },
            'West End':                   { all:680,  'Break and Enter Commercial':95,  'Theft from Vehicle':215, 'Other Theft':310, 'Offence Against a Person':60 },
            'Strathcona':                 { all:890,  'Break and Enter Commercial':135, 'Theft from Vehicle':265, 'Other Theft':420, 'Offence Against a Person':70 },
            'Grandview-Woodland':         { all:520,  'Break and Enter Commercial':85,  'Theft from Vehicle':155, 'Other Theft':240, 'Offence Against a Person':40 },
            'Mount Pleasant':             { all:440,  'Break and Enter Commercial':70,  'Theft from Vehicle':130, 'Other Theft':210, 'Offence Against a Person':30 },
            'Fairview':                   { all:380,  'Break and Enter Commercial':60,  'Theft from Vehicle':120, 'Other Theft':175, 'Offence Against a Person':25 },
            'Kitsilano':                  { all:340,  'Break and Enter Commercial':55,  'Theft from Vehicle':105, 'Other Theft':160, 'Offence Against a Person':20 },
            'Hastings-Sunrise':           { all:460,  'Break and Enter Commercial':75,  'Theft from Vehicle':140, 'Other Theft':215, 'Offence Against a Person':30 },
            'Renfrew-Collingwood':        { all:390,  'Break and Enter Commercial':65,  'Theft from Vehicle':120, 'Other Theft':180, 'Offence Against a Person':25 },
            'Kensington-Cedar Cottage':   { all:410,  'Break and Enter Commercial':68,  'Theft from Vehicle':125, 'Other Theft':190, 'Offence Against a Person':27 },
            'Riley Park':                 { all:280,  'Break and Enter Commercial':45,  'Theft from Vehicle':85,  'Other Theft':130, 'Offence Against a Person':20 },
            'Sunset':                     { all:310,  'Break and Enter Commercial':50,  'Theft from Vehicle':95,  'Other Theft':145, 'Offence Against a Person':20 },
            'Victoria-Fraserview':        { all:260,  'Break and Enter Commercial':42,  'Theft from Vehicle':80,  'Other Theft':120, 'Offence Against a Person':18 },
            'Killarney':                  { all:220,  'Break and Enter Commercial':35,  'Theft from Vehicle':65,  'Other Theft':105, 'Offence Against a Person':15 },
            'Oakridge':                   { all:190,  'Break and Enter Commercial':30,  'Theft from Vehicle':58,  'Other Theft':90,  'Offence Against a Person':12 },
            'Marpole':                    { all:330,  'Break and Enter Commercial':53,  'Theft from Vehicle':100, 'Other Theft':155, 'Offence Against a Person':22 },
            'Dunbar-Southlands':          { all:165,  'Break and Enter Commercial':27,  'Theft from Vehicle':48,  'Other Theft':80,  'Offence Against a Person':10 },
            'Kerrisdale':                 { all:145,  'Break and Enter Commercial':23,  'Theft from Vehicle':42,  'Other Theft':70,  'Offence Against a Person':10 },
            'Arbutus Ridge':              { all:135,  'Break and Enter Commercial':22,  'Theft from Vehicle':38,  'Other Theft':65,  'Offence Against a Person':10 },
            'Shaughnessy':                { all:120,  'Break and Enter Commercial':20,  'Theft from Vehicle':34,  'Other Theft':58,  'Offence Against a Person':8 },
            'West Point Grey':            { all:155,  'Break and Enter Commercial':25,  'Theft from Vehicle':45,  'Other Theft':75,  'Offence Against a Person':10 },
            'South Cambie':               { all:175,  'Break and Enter Commercial':28,  'Theft from Vehicle':52,  'Other Theft':85,  'Offence Against a Person':10 },
            'Stanley Park':               { all:85,   'Break and Enter Commercial':12,  'Theft from Vehicle':22,  'Other Theft':45,  'Offence Against a Person':6 },
            'Musqueam':                   { all:45,   'Break and Enter Commercial':8,   'Theft from Vehicle':12,  'Other Theft':22,  'Offence Against a Person':3 },
        };

        const YEARS = ['2020','2021','2022','2023','2024','2025'];
        YEARS.forEach((year, yi) => {
            const factor = 0.85 + yi * 0.06;
            const yearData = {};
            for (const name in base) {
                yearData[name] = {};
                for (const k in base[name]) yearData[name][k] = Math.round(base[name][k] * factor);
            }
            this.crimeDataByYear[year] = yearData;
            for (let month = 1; month <= 12; month++) {
                const key = `${year}-${month}`;
                this.crimeDataByMonth[key] = {};
                for (const name in base) {
                    const monthEntry = { all: Math.round(yearData[name].all / 12) };
                    for (const k in base[name]) {
                        if (k === 'all') continue;
                        monthEntry[k] = Math.round((base[name][k] * factor * (0.7 + Math.random() * 0.6)) / 12);
                    }
                    this.crimeDataByMonth[key][name] = monthEntry;
                }
            }
        });
    },
};
