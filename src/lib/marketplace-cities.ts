/**
 * marketplace-cities.ts
 *
 * Canonical city catalogue for the marketplace — used by:
 *   1. SuperAdmin directory-listings: cascading country → city dropdown
 *      (prevents "Sydney" vs "sydney" case-mismatch issues)
 *   2. prisma/generate-seed-sql.ts: seeds ~10,000 providers across 14 countries
 *   3. Marketplace browse page: city filter validation
 *
 * Each city has REAL latitude/longitude (city centre) so the marketplace
 * distance-sorting (haversineKm) works correctly.
 *
 * European cities are sourced from src/lib/directory-seed.ts (352 cities).
 * Non-European cities (US/AU/CA/NZ/IN/AE/SG) are defined here.
 */

export interface MarketplaceCity {
  city: string;
  region: string;
  lat: number;
  lng: number;
  population: number;
}

export interface MarketplaceCountry {
  code: string;
  label: string;
  currency: string;
  locale: string;
  cities: MarketplaceCity[];
}

// ─── Non-European Countries ─────────────────────────────────────────────────

const US_CITIES: MarketplaceCity[] = [
  { city: 'New York', region: 'New York', lat: 40.7128, lng: -74.0060, population: 8336817 },
  { city: 'Los Angeles', region: 'California', lat: 34.0522, lng: -118.2437, population: 3979576 },
  { city: 'Chicago', region: 'Illinois', lat: 41.8781, lng: -87.6298, population: 2693976 },
  { city: 'Houston', region: 'Texas', lat: 29.7604, lng: -95.3698, population: 2320268 },
  { city: 'Phoenix', region: 'Arizona', lat: 33.4484, lng: -112.0740, population: 1680992 },
  { city: 'Philadelphia', region: 'Pennsylvania', lat: 39.9526, lng: -75.1652, population: 1584064 },
  { city: 'San Antonio', region: 'Texas', lat: 29.4241, lng: -98.4936, population: 1547253 },
  { city: 'San Diego', region: 'California', lat: 32.7157, lng: -117.1611, population: 1423851 },
  { city: 'Dallas', region: 'Texas', lat: 32.7767, lng: -96.7970, population: 1343573 },
  { city: 'San Jose', region: 'California', lat: 37.3382, lng: -121.8863, population: 1021795 },
  { city: 'Austin', region: 'Texas', lat: 30.2672, lng: -97.7431, population: 978908 },
  { city: 'Jacksonville', region: 'Florida', lat: 30.3322, lng: -81.6557, population: 911507 },
  { city: 'Fort Worth', region: 'Texas', lat: 32.7555, lng: -97.3308, population: 909585 },
  { city: 'Columbus', region: 'Ohio', lat: 39.9612, lng: -82.9988, population: 898553 },
  { city: 'Charlotte', region: 'North Carolina', lat: 35.2271, lng: -80.8431, population: 885708 },
  { city: 'San Francisco', region: 'California', lat: 37.7749, lng: -122.4194, population: 881549 },
  { city: 'Indianapolis', region: 'Indiana', lat: 39.7684, lng: -86.1581, population: 876384 },
  { city: 'Seattle', region: 'Washington', lat: 47.6062, lng: -122.3321, population: 753675 },
  { city: 'Denver', region: 'Colorado', lat: 39.7392, lng: -104.9903, population: 727211 },
  { city: 'Boston', region: 'Massachusetts', lat: 42.3601, lng: -71.0589, population: 692600 },
  { city: 'El Paso', region: 'Texas', lat: 31.7619, lng: -106.4850, population: 681728 },
  { city: 'Detroit', region: 'Michigan', lat: 42.3314, lng: -83.0458, population: 670031 },
  { city: 'Nashville', region: 'Tennessee', lat: 36.1627, lng: -86.7816, population: 670820 },
  { city: 'Portland', region: 'Oregon', lat: 45.5152, lng: -122.6784, population: 654741 },
  { city: 'Memphis', region: 'Tennessee', lat: 35.1495, lng: -90.0490, population: 651073 },
  { city: 'Oklahoma City', region: 'Oklahoma', lat: 35.4676, lng: -97.5164, population: 655057 },
  { city: 'Las Vegas', region: 'Nevada', lat: 36.1699, lng: -115.1398, population: 651319 },
  { city: 'Louisville', region: 'Kentucky', lat: 38.2527, lng: -85.7585, population: 617638 },
  { city: 'Baltimore', region: 'Maryland', lat: 39.2904, lng: -76.6122, population: 593490 },
  { city: 'Milwaukee', region: 'Wisconsin', lat: 43.0389, lng: -87.9065, population: 590157 },
  { city: 'Albuquerque', region: 'New Mexico', lat: 35.0844, lng: -106.6504, population: 560513 },
  { city: 'Tucson', region: 'Arizona', lat: 32.2226, lng: -110.9747, population: 548073 },
  { city: 'Fresno', region: 'California', lat: 36.7378, lng: -119.7871, population: 542107 },
  { city: 'Sacramento', region: 'California', lat: 38.5816, lng: -121.4944, population: 513624 },
  { city: 'Kansas City', region: 'Missouri', lat: 39.0997, lng: -94.5786, population: 495327 },
  { city: 'Mesa', region: 'Arizona', lat: 33.4152, lng: -111.8315, population: 518012 },
  { city: 'Atlanta', region: 'Georgia', lat: 33.7490, lng: -84.3880, population: 506811 },
  { city: 'Omaha', region: 'Nebraska', lat: 41.2565, lng: -95.9345, population: 478192 },
  { city: 'Colorado Springs', region: 'Colorado', lat: 38.8339, lng: -104.8214, population: 472688 },
  { city: 'Raleigh', region: 'North Carolina', lat: 35.7796, lng: -78.6382, population: 474069 },
  { city: 'Miami', region: 'Florida', lat: 25.7617, lng: -80.1918, population: 467963 },
  { city: 'Long Beach', region: 'California', lat: 33.7701, lng: -118.1937, population: 462257 },
  { city: 'Virginia Beach', region: 'Virginia', lat: 36.8529, lng: -75.9780, population: 459470 },
  { city: 'Oakland', region: 'California', lat: 37.8044, lng: -122.2712, population: 433031 },
  { city: 'Minneapolis', region: 'Minnesota', lat: 44.9778, lng: -93.2650, population: 429606 },
  { city: 'Tulsa', region: 'Oklahoma', lat: 36.1540, lng: -95.9928, population: 402016 },
  { city: 'Arlington', region: 'Texas', lat: 32.7357, lng: -97.1081, population: 398854 },
  { city: 'Tampa', region: 'Florida', lat: 27.9506, lng: -82.4572, population: 399700 },
  { city: 'New Orleans', region: 'Louisiana', lat: 29.9511, lng: -90.0715, population: 390144 },
  { city: 'Wichita', region: 'Kansas', lat: 37.6879, lng: -97.3301, population: 389938 },
  { city: 'Cleveland', region: 'Ohio', lat: 41.4993, lng: -81.6944, population: 381009 },
];

const AU_CITIES: MarketplaceCity[] = [
  { city: 'Sydney', region: 'New South Wales', lat: -33.8688, lng: 151.2093, population: 5312163 },
  { city: 'Melbourne', region: 'Victoria', lat: -37.8136, lng: 144.9631, population: 5078193 },
  { city: 'Brisbane', region: 'Queensland', lat: -27.4698, lng: 153.0251, population: 2462637 },
  { city: 'Perth', region: 'Western Australia', lat: -31.9505, lng: 115.8605, population: 2059484 },
  { city: 'Adelaide', region: 'South Australia', lat: -34.9285, lng: 138.6007, population: 1345777 },
  { city: 'Gold Coast', region: 'Queensland', lat: -28.0167, lng: 153.4000, population: 679127 },
  { city: 'Newcastle', region: 'New South Wales', lat: -32.9283, lng: 151.7817, population: 322278 },
  { city: 'Canberra', region: 'Australian Capital Territory', lat: -35.2809, lng: 149.1300, population: 426704 },
  { city: 'Sunshine Coast', region: 'Queensland', lat: -26.6500, lng: 153.0666, population: 333536 },
  { city: 'Wollongong', region: 'New South Wales', lat: -34.4278, lng: 150.8931, population: 302739 },
  { city: 'Logan City', region: 'Queensland', lat: -27.6391, lng: 153.1094, population: 335000 },
  { city: 'Hobart', region: 'Tasmania', lat: -42.8821, lng: 147.3272, population: 240342 },
  { city: 'Geelong', region: 'Victoria', lat: -38.1499, lng: 144.3614, population: 268277 },
  { city: 'Townsville', region: 'Queensland', lat: -19.2589, lng: 146.8169, population: 181668 },
  { city: 'Cairns', region: 'Queensland', lat: -16.9203, lng: 145.7710, population: 153075 },
  { city: 'Darwin', region: 'Northern Territory', lat: -12.4634, lng: 130.8456, population: 148564 },
  { city: 'Toowoomba', region: 'Queensland', lat: -27.5606, lng: 151.9539, population: 135631 },
  { city: 'Ballarat', region: 'Victoria', lat: -37.5622, lng: 143.8503, population: 105471 },
  { city: 'Bendigo', region: 'Victoria', lat: -36.7570, lng: 144.2794, population: 99852 },
  { city: 'Albury', region: 'New South Wales', lat: -36.0737, lng: 146.9335, population: 51562 },
];

const CA_CITIES: MarketplaceCity[] = [
  { city: 'Toronto', region: 'Ontario', lat: 43.6532, lng: -79.3832, population: 2731571 },
  { city: 'Montreal', region: 'Quebec', lat: 45.5017, lng: -73.5673, population: 1704694 },
  { city: 'Calgary', region: 'Alberta', lat: 51.0447, lng: -114.0719, population: 1239220 },
  { city: 'Ottawa', region: 'Ontario', lat: 45.4215, lng: -75.6972, population: 934243 },
  { city: 'Edmonton', region: 'Alberta', lat: 53.5461, lng: -113.4938, population: 932546 },
  { city: 'Winnipeg', region: 'Manitoba', lat: 49.8951, lng: -97.1384, population: 705244 },
  { city: 'Vancouver', region: 'British Columbia', lat: 49.2827, lng: -123.1207, population: 631486 },
  { city: 'Quebec City', region: 'Quebec', lat: 46.8139, lng: -71.2080, population: 531902 },
  { city: 'Hamilton', region: 'Ontario', lat: 43.2557, lng: -79.8711, population: 536917 },
  { city: 'Halifax', region: 'Nova Scotia', lat: 44.6488, lng: -63.5752, population: 403131 },
  { city: 'Victoria', region: 'British Columbia', lat: 48.4284, lng: -123.3656, population: 91867 },
  { city: 'Saskatoon', region: 'Saskatchewan', lat: 52.1332, lng: -106.6700, population: 273010 },
  { city: 'Regina', region: 'Saskatchewan', lat: 50.4452, lng: -104.6189, population: 215106 },
  { city: 'London', region: 'Ontario', lat: 42.9849, lng: -81.2453, population: 383437 },
  { city: 'St. Catharines', region: 'Ontario', lat: 43.1594, lng: -79.2469, population: 133113 },
  { city: 'Kelowna', region: 'British Columbia', lat: 49.8880, lng: -119.4960, population: 142146 },
  { city: 'Sherbrooke', region: 'Quebec', lat: 45.4012, lng: -71.8826, population: 161323 },
  { city: 'Barrie', region: 'Ontario', lat: 44.3894, lng: -79.6903, population: 147429 },
  { city: 'Abbotsford', region: 'British Columbia', lat: 49.0504, lng: -122.3045, population: 141397 },
  { city: 'Kingston', region: 'Ontario', lat: 44.2317, lng: -76.4813, population: 127429 },
];

const NZ_CITIES: MarketplaceCity[] = [
  { city: 'Auckland', region: 'Auckland', lat: -36.8485, lng: 174.7633, population: 1657200 },
  { city: 'Wellington', region: 'Wellington', lat: -41.2865, lng: 174.7762, population: 215100 },
  { city: 'Christchurch', region: 'Canterbury', lat: -43.5321, lng: 172.6362, population: 381500 },
  { city: 'Hamilton', region: 'Waikato', lat: -37.7870, lng: 175.2793, population: 169500 },
  { city: 'Tauranga', region: 'Bay of Plenty', lat: -37.6878, lng: 176.1651, population: 144700 },
  { city: 'Napier', region: "Hawke's Bay", lat: -39.4928, lng: 176.9120, population: 67600 },
  { city: 'Dunedin', region: 'Otago', lat: -45.8788, lng: 170.5028, population: 130700 },
  { city: 'Queenstown', region: 'Otago', lat: -45.0312, lng: 168.6626, population: 16060 },
];

const IN_CITIES: MarketplaceCity[] = [
  { city: 'Mumbai', region: 'Maharashtra', lat: 19.0760, lng: 72.8777, population: 12442373 },
  { city: 'Delhi', region: 'Delhi', lat: 28.7041, lng: 77.1025, population: 11034555 },
  { city: 'Bangalore', region: 'Karnataka', lat: 12.9716, lng: 77.5946, population: 8443675 },
  { city: 'Hyderabad', region: 'Telangana', lat: 17.3850, lng: 78.4867, population: 6809970 },
  { city: 'Chennai', region: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, population: 4646732 },
  { city: 'Kolkata', region: 'West Bengal', lat: 22.5726, lng: 88.3639, population: 4496694 },
  { city: 'Pune', region: 'Maharashtra', lat: 18.5204, lng: 73.8567, population: 3124458 },
  { city: 'Ahmedabad', region: 'Gujarat', lat: 23.0225, lng: 72.5714, population: 5570585 },
  { city: 'Jaipur', region: 'Rajasthan', lat: 26.9124, lng: 75.7873, population: 3046163 },
  { city: 'Surat', region: 'Gujarat', lat: 21.1702, lng: 72.8311, population: 4467797 },
];

const AE_CITIES: MarketplaceCity[] = [
  { city: 'Dubai', region: 'Dubai', lat: 25.2048, lng: 55.2708, population: 3331420 },
  { city: 'Abu Dhabi', region: 'Abu Dhabi', lat: 24.4539, lng: 54.3773, population: 1482816 },
  { city: 'Sharjah', region: 'Sharjah', lat: 25.3463, lng: 55.4209, population: 1684649 },
  { city: 'Al Ain', region: 'Abu Dhabi', lat: 24.2075, lng: 55.7447, population: 766931 },
  { city: 'Ajman', region: 'Ajman', lat: 25.4052, lng: 55.5136, population: 504846 },
  { city: 'Ras Al Khaimah', region: 'Ras Al Khaimah', lat: 25.7889, lng: 55.9708, population: 191753 },
];

const SG_CITIES: MarketplaceCity[] = [
  { city: 'Singapore', region: 'Central', lat: 1.3521, lng: 103.8198, population: 5685807 },
];

// ─── European Countries (sourced from directory-seed.ts — abbreviated) ──────
// Only the top 10 European countries by marketplace priority. Each has 5-15
// major cities with real lat/lng.

const GB_CITIES: MarketplaceCity[] = [
  { city: 'London', region: 'England', lat: 51.5074, lng: -0.1278, population: 8961989 },
  { city: 'Manchester', region: 'England', lat: 53.4808, lng: -2.2426, population: 547627 },
  { city: 'Birmingham', region: 'England', lat: 52.4862, lng: -1.8904, population: 1141816 },
  { city: 'Leeds', region: 'England', lat: 53.8008, lng: -1.5491, population: 793139 },
  { city: 'Glasgow', region: 'Scotland', lat: 55.8642, lng: -4.2518, population: 633120 },
  { city: 'Liverpool', region: 'England', lat: 53.4084, lng: -2.9916, population: 498042 },
  { city: 'Edinburgh', region: 'Scotland', lat: 55.9533, lng: -3.1883, population: 488050 },
  { city: 'Bristol', region: 'England', lat: 51.4545, lng: -2.5879, population: 463400 },
  { city: 'Cardiff', region: 'Wales', lat: 51.4816, lng: -3.1791, population: 366903 },
  { city: 'Sheffield', region: 'England', lat: 53.3811, lng: -1.4701, population: 584853 },
  { city: 'Newcastle', region: 'England', lat: 54.9783, lng: -1.6178, population: 300196 },
  { city: 'Nottingham', region: 'England', lat: 52.9548, lng: -1.1581, population: 331069 },
  { city: 'Leicester', region: 'England', lat: 52.6369, lng: -1.1398, population: 329639 },
  { city: 'Coventry', region: 'England', lat: 52.4068, lng: -1.5197, population: 379387 },
  { city: 'Bradford', region: 'England', lat: 53.7960, lng: -1.7594, population: 536986 },
];

const DE_CITIES: MarketplaceCity[] = [
  { city: 'Berlin', region: 'Berlin', lat: 52.5200, lng: 13.4050, population: 3669491 },
  { city: 'Hamburg', region: 'Hamburg', lat: 53.5511, lng: 9.9937, population: 1845229 },
  { city: 'Munich', region: 'Bavaria', lat: 48.1351, lng: 11.5820, population: 1488202 },
  { city: 'Cologne', region: 'North Rhine-Westphalia', lat: 50.9375, lng: 6.9603, population: 1085664 },
  { city: 'Frankfurt', region: 'Hesse', lat: 50.1109, lng: 8.6821, population: 764104 },
  { city: 'Stuttgart', region: 'Baden-Württemberg', lat: 48.7758, lng: 9.1829, population: 634830 },
  { city: 'Düsseldorf', region: 'North Rhine-Westphalia', lat: 51.2277, lng: 6.7735, population: 620523 },
  { city: 'Leipzig', region: 'Saxony', lat: 51.3397, lng: 12.3731, population: 605407 },
  { city: 'Dortmund', region: 'North Rhine-Westphalia', lat: 51.5136, lng: 7.4653, population: 588250 },
  { city: 'Essen', region: 'North Rhine-Westphalia', lat: 51.4556, lng: 7.0116, population: 583109 },
  { city: 'Bremen', region: 'Bremen', lat: 53.0793, lng: 8.8017, population: 567559 },
  { city: 'Dresden', region: 'Saxony', lat: 51.0504, lng: 13.7373, population: 556227 },
  { city: 'Hanover', region: 'Lower Saxony', lat: 52.3759, lng: 9.7320, population: 534357 },
  { city: 'Nuremberg', region: 'Bavaria', lat: 49.4521, lng: 11.0767, population: 523638 },
  { city: 'Bochum', region: 'North Rhine-Westphalia', lat: 51.4818, lng: 7.2162, population: 365579 },
];

const FR_CITIES: MarketplaceCity[] = [
  { city: 'Paris', region: 'Île-de-France', lat: 48.8566, lng: 2.3522, population: 2161000 },
  { city: 'Marseille', region: "Provence-Alpes-Côte d'Azur", lat: 43.2965, lng: 5.3698, population: 873000 },
  { city: 'Lyon', region: 'Auvergne-Rhône-Alpes', lat: 45.7640, lng: 4.8357, population: 522969 },
  { city: 'Toulouse', region: 'Occitanie', lat: 43.6047, lng: 1.4442, population: 486828 },
  { city: 'Nice', region: "Provence-Alpes-Côte d'Azur", lat: 43.7102, lng: 7.2620, population: 342669 },
  { city: 'Nantes', region: 'Pays de la Loire', lat: 47.2184, lng: -1.5536, population: 318808 },
  { city: 'Strasbourg', region: 'Grand Est', lat: 48.5734, lng: 7.7521, population: 287228 },
  { city: 'Montpellier', region: 'Occitanie', lat: 43.6109, lng: 3.8772, population: 295542 },
  { city: 'Bordeaux', region: 'Nouvelle-Aquitaine', lat: 44.8378, lng: -0.5792, population: 257068 },
  { city: 'Lille', region: 'Hauts-de-France', lat: 50.6292, lng: 3.0573, population: 233098 },
];

const ES_CITIES: MarketplaceCity[] = [
  { city: 'Madrid', region: 'Madrid', lat: 40.4168, lng: -3.7038, population: 3266126 },
  { city: 'Barcelona', region: 'Catalonia', lat: 41.3851, lng: 2.1734, population: 1636762 },
  { city: 'Valencia', region: 'Valencian Community', lat: 39.4699, lng: -0.3763, population: 791413 },
  { city: 'Seville', region: 'Andalusia', lat: 37.3891, lng: -5.9845, population: 688711 },
  { city: 'Zaragoza', region: 'Aragon', lat: 41.6488, lng: -0.8891, population: 674997 },
  { city: 'Málaga', region: 'Andalusia', lat: 36.7213, lng: -4.4214, population: 574654 },
  { city: 'Murcia', region: 'Murcia', lat: 37.9922, lng: -1.1307, population: 447182 },
  { city: 'Palma', region: 'Balearic Islands', lat: 39.5696, lng: 2.6502, population: 416065 },
  { city: 'Bilbao', region: 'Basque Country', lat: 43.2630, lng: -2.9350, population: 345821 },
  { city: 'Alicante', region: 'Valencian Community', lat: 38.3452, lng: -0.4810, population: 337482 },
];

const IT_CITIES: MarketplaceCity[] = [
  { city: 'Rome', region: 'Lazio', lat: 41.9028, lng: 12.4964, population: 2872800 },
  { city: 'Milan', region: 'Lombardy', lat: 45.4642, lng: 9.1900, population: 1396059 },
  { city: 'Naples', region: 'Campania', lat: 40.8518, lng: 14.2681, population: 967069 },
  { city: 'Turin', region: 'Piedmont', lat: 45.0703, lng: 7.6869, population: 870952 },
  { city: 'Palermo', region: 'Sicily', lat: 38.1157, lng: 13.3615, population: 673735 },
  { city: 'Genoa', region: 'Liguria', lat: 44.4056, lng: 8.9463, population: 583601 },
  { city: 'Bologna', region: 'Emilia-Romagna', lat: 44.4949, lng: 11.3426, population: 388367 },
  { city: 'Florence', region: 'Tuscany', lat: 43.7696, lng: 11.2558, population: 382258 },
  { city: 'Bari', region: 'Apulia', lat: 41.1171, lng: 16.8719, population: 322751 },
  { city: 'Catania', region: 'Sicily', lat: 37.5079, lng: 15.0830, population: 311584 },
];

const NL_CITIES: MarketplaceCity[] = [
  { city: 'Amsterdam', region: 'North Holland', lat: 52.3676, lng: 4.9041, population: 872680 },
  { city: 'Rotterdam', region: 'South Holland', lat: 51.9244, lng: 4.4777, population: 651446 },
  { city: 'The Hague', region: 'South Holland', lat: 52.0705, lng: 4.3007, population: 545838 },
  { city: 'Utrecht', region: 'Utrecht', lat: 52.0907, lng: 5.1214, population: 358834 },
  { city: 'Eindhoven', region: 'North Brabant', lat: 51.4416, lng: 5.4697, population: 235691 },
  { city: 'Tilburg', region: 'North Brabant', lat: 51.5719, lng: 5.0672, population: 219632 },
  { city: 'Groningen', region: 'Groningen', lat: 53.2194, lng: 6.5665, population: 232874 },
  { city: 'Almere', region: 'Flevoland', lat: 52.3508, lng: 5.2647, population: 211626 },
];

const PL_CITIES: MarketplaceCity[] = [
  { city: 'Warsaw', region: 'Masovian', lat: 52.2297, lng: 21.0122, population: 1790658 },
  { city: 'Kraków', region: 'Lesser Poland', lat: 50.0647, lng: 19.9450, population: 779115 },
  { city: 'Łódź', region: 'Łódź', lat: 51.7592, lng: 19.4560, population: 672185 },
  { city: 'Wrocław', region: 'Lower Silesian', lat: 51.1079, lng: 17.0385, population: 643782 },
  { city: 'Poznań', region: 'Greater Poland', lat: 52.4064, lng: 16.9252, population: 532048 },
  { city: 'Gdańsk', region: 'Pomeranian', lat: 54.3520, lng: 18.6466, population: 470907 },
  { city: 'Szczecin', region: 'West Pomeranian', lat: 53.4285, lng: 14.5528, population: 401907 },
  { city: 'Lublin', region: 'Lublin', lat: 51.2465, lng: 22.5684, population: 339784 },
];

const SE_CITIES: MarketplaceCity[] = [
  { city: 'Stockholm', region: 'Stockholm', lat: 59.3293, lng: 18.0686, population: 975551 },
  { city: 'Gothenburg', region: 'Västra Götaland', lat: 57.7089, lng: 11.9746, population: 583056 },
  { city: 'Malmö', region: 'Skåne', lat: 55.6050, lng: 13.0038, population: 344166 },
  { city: 'Uppsala', region: 'Uppsala', lat: 59.8586, lng: 17.6389, population: 168096 },
  { city: 'Västerås', region: 'Västmanland', lat: 59.6099, lng: 16.5448, population: 122953 },
  { city: 'Örebro', region: 'Örebro', lat: 59.2741, lng: 15.2066, population: 119092 },
];

const NO_CITIES: MarketplaceCity[] = [
  { city: 'Oslo', region: 'Oslo', lat: 59.9139, lng: 10.7522, population: 697549 },
  { city: 'Bergen', region: 'Vestland', lat: 60.3913, lng: 5.3221, population: 285911 },
  { city: 'Trondheim', region: 'Trøndelag', lat: 63.4305, lng: 10.3951, population: 199039 },
  { city: 'Stavanger', region: 'Rogaland', lat: 58.9700, lng: 5.7331, population: 143574 },
  { city: 'Drammen', region: 'Viken', lat: 59.7440, lng: 10.2045, population: 100313 },
  { city: 'Fredrikstad', region: 'Østfold', lat: 59.2181, lng: 10.9298, population: 83858 },
];

const DK_CITIES: MarketplaceCity[] = [
  { city: 'Copenhagen', region: 'Capital Region', lat: 55.6761, lng: 12.5683, population: 794128 },
  { city: 'Aarhus', region: 'Central Denmark', lat: 56.1629, lng: 10.2039, population: 280534 },
  { city: 'Odense', region: 'Southern Denmark', lat: 55.4038, lng: 10.4024, population: 180863 },
  { city: 'Aalborg', region: 'North Denmark', lat: 57.0488, lng: 9.9217, population: 119862 },
  { city: 'Esbjerg', region: 'Southern Denmark', lat: 55.4765, lng: 8.4594, population: 72033 },
];

const CH_CITIES: MarketplaceCity[] = [
  { city: 'Zurich', region: 'Zurich', lat: 47.3769, lng: 8.5417, population: 415367 },
  { city: 'Geneva', region: 'Geneva', lat: 46.2044, lng: 6.1432, population: 201818 },
  { city: 'Basel', region: 'Basel-Stadt', lat: 47.5596, lng: 7.5886, population: 172258 },
  { city: 'Bern', region: 'Bern', lat: 46.9480, lng: 7.4474, population: 133883 },
  { city: 'Lausanne', region: 'Vaud', lat: 46.5197, lng: 6.6323, population: 139111 },
  { city: 'Winterthur', region: 'Zurich', lat: 47.4999, lng: 8.7252, population: 112870 },
];

// ─── Combined Catalogue ─────────────────────────────────────────────────────

export const MARKETPLACE_COUNTRIES: MarketplaceCountry[] = [
  // ── Global (non-European) ─────────────────────────────────
  { code: 'US', label: 'United States', currency: 'USD', locale: 'en-US', cities: US_CITIES },
  { code: 'AU', label: 'Australia', currency: 'AUD', locale: 'en-AU', cities: AU_CITIES },
  { code: 'CA', label: 'Canada', currency: 'CAD', locale: 'en-CA', cities: CA_CITIES },
  { code: 'NZ', label: 'New Zealand', currency: 'NZD', locale: 'en-NZ', cities: NZ_CITIES },
  { code: 'IN', label: 'India', currency: 'INR', locale: 'en-IN', cities: IN_CITIES },
  { code: 'AE', label: 'United Arab Emirates', currency: 'AED', locale: 'en-AE', cities: AE_CITIES },
  { code: 'SG', label: 'Singapore', currency: 'SGD', locale: 'en-SG', cities: SG_CITIES },
  // ── European ──────────────────────────────────────────────
  { code: 'GB', label: 'United Kingdom', currency: 'GBP', locale: 'en-GB', cities: GB_CITIES },
  { code: 'DE', label: 'Germany', currency: 'EUR', locale: 'de-DE', cities: DE_CITIES },
  { code: 'FR', label: 'France', currency: 'EUR', locale: 'fr-FR', cities: FR_CITIES },
  { code: 'ES', label: 'Spain', currency: 'EUR', locale: 'es-ES', cities: ES_CITIES },
  { code: 'IT', label: 'Italy', currency: 'EUR', locale: 'it-IT', cities: IT_CITIES },
  { code: 'NL', label: 'Netherlands', currency: 'EUR', locale: 'nl-NL', cities: NL_CITIES },
  { code: 'PL', label: 'Poland', currency: 'PLN', locale: 'pl-PL', cities: PL_CITIES },
  { code: 'SE', label: 'Sweden', currency: 'SEK', locale: 'sv-SE', cities: SE_CITIES },
  { code: 'NO', label: 'Norway', currency: 'NOK', locale: 'nb-NO', cities: NO_CITIES },
  { code: 'DK', label: 'Denmark', currency: 'DKK', locale: 'da-DK', cities: DK_CITIES },
  { code: 'CH', label: 'Switzerland', currency: 'CHF', locale: 'de-CH', cities: CH_CITIES },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Get a country definition by ISO code. Returns undefined if not found. */
export function getCountry(code: string): MarketplaceCountry | undefined {
  return MARKETPLACE_COUNTRIES.find((c) => c.code === code);
}

/** Get the list of cities for a given country code. Returns [] if not found. */
export function getCitiesForCountry(code: string): MarketplaceCity[] {
  return getCountry(code)?.cities ?? [];
}

/**
 * Get ALL countries for a dropdown — includes the 7 global countries above
 * PLUS the 43 European countries from directory-seed.ts (label-only, no
 * city catalogue for the smaller European countries).
 *
 * Used by the SuperAdmin directory-listings country dropdown so ALL countries
 * are selectable (not just the 18 with full city catalogues).
 */
export function getAllCountryOptions(): { code: string; label: string }[] {
  // The 18 countries with full city catalogues
  const catalogued = MARKETPLACE_COUNTRIES.map((c) => ({ code: c.code, label: c.label }));

  // The remaining 25 European countries (no city catalogue — admin types
  // city manually or uses OSM seed)
  const europeanExtras: { code: string; label: string }[] = [
    { code: 'AT', label: 'Austria' },
    { code: 'BE', label: 'Belgium' },
    { code: 'BG', label: 'Bulgaria' },
    { code: 'HR', label: 'Croatia' },
    { code: 'CY', label: 'Cyprus' },
    { code: 'CZ', label: 'Czechia' },
    { code: 'EE', label: 'Estonia' },
    { code: 'FI', label: 'Finland' },
    { code: 'GR', label: 'Greece' },
    { code: 'HU', label: 'Hungary' },
    { code: 'IE', label: 'Ireland' },
    { code: 'LV', label: 'Latvia' },
    { code: 'LT', label: 'Lithuania' },
    { code: 'LU', label: 'Luxembourg' },
    { code: 'MT', label: 'Malta' },
    { code: 'PT', label: 'Portugal' },
    { code: 'RO', label: 'Romania' },
    { code: 'SK', label: 'Slovakia' },
    { code: 'SI', label: 'Slovenia' },
    { code: 'IS', label: 'Iceland' },
    { code: 'LI', label: 'Liechtenstein' },
    { code: 'TR', label: 'Turkey' },
    { code: 'UA', label: 'Ukraine' },
    { code: 'RU', label: 'Russia' },
    { code: 'BY', label: 'Belarus' },
    { code: 'MD', label: 'Moldova' },
    { code: 'MK', label: 'North Macedonia' },
    { code: 'AL', label: 'Albania' },
    { code: 'RS', label: 'Serbia' },
    { code: 'BA', label: 'Bosnia and Herzegovina' },
    { code: 'ME', label: 'Montenegro' },
    { code: 'XK', label: 'Kosovo' },
  ];

  return [...catalogued, ...europeanExtras].sort((a, b) => a.label.localeCompare(b.label));
}
