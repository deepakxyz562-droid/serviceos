/**
 * directory-seed.ts
 *
 * Shared DirectoryLocation seeding logic. Extracted from
 * `prisma/seed-directory.ts` so the same data + upsert logic can be driven
 * from BOTH the local CLI script (`bun run prisma/seed-directory.ts`) AND
 * a production cron-style API route (`/api/cron/seed-directory`).
 *
 * This module does NOT auto-execute on import — callers must invoke
 * `seedDirectory()` explicitly. That is the whole point: the old script
 * called `main()` at the bottom, which made it impossible to import safely.
 *
 * Idempotent: every row is upserted on the composite unique key
 * (countryCode, citySlug). Re-running refreshes population/lat/lng/timezone/
 * currency/locale and re-activates any soft-deleted row, but does NOT change
 * the row id, so existing FeaturedLocation foreign keys keep resolving.
 *
 * Data: ~350 major European cities across 40+ countries. Powers:
 *   1. The public directory pages.
 *   2. The hourly "featured European location" homepage hero, rotated by
 *      /api/cron/featured-location (population-weighted).
 */

// Relative import (NOT the `@/` alias) so this module also resolves when
// imported by the standalone bun script in prisma/seed-directory.ts.
import { db } from './db';

export interface CitySeed {
  city: string;
  region?: string;
  lat: number;
  lng: number;
  population: number;
  /** Override the country default timezone (e.g. Kaliningrad, Madeira). */
  timezone?: string;
}

export interface CountrySeed {
  code: string;        // ISO-3166 alpha-2 (e.g. "DE", "GB", "XK")
  name: string;        // Human-readable country name
  currency: string;    // ISO-4217 (e.g. "EUR", "GBP", "TRY")
  timezone: string;    // Default IANA tz for the country
  locale: string;      // BCP-47 language code (lowercase countryCode usually)
  cities: CitySeed[];
}

// ─── Slug helper ────────────────────────────────────────────────────────────
// Defined locally rather than imported from src/lib because no shared
// slugify util exists there. Keep this in sync with any future shared util.

export function slugify(s: string): string {
  return s
    // Decompose combining marks (é -> e + U+0301, İ -> I + U+0307, etc.)
    .normalize('NFD')
    // Strip the now-detached combining marks (covers most European diacritics)
    .replace(/[\u0300-\u036f]/g, '')
    // Handle letters NFD does NOT decompose (ligatures + strokes + Turkish dotless i)
    // Polish: Ł/ł -> l          German:  ß -> ss          Icelandic: ð/Ð/þ/Þ/æ/ö
    // Turkish: ı -> i           Vietnamese/Serbian: Đ/đ -> d
    .replace(/ß/g, 'ss')
    .replace(/[ðÐĐđ]/g, 'd')
    .replace(/[þÞ]/g, 'th')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[øØ]/g, 'o')
    .replace(/[åÅ]/g, 'a')
    .replace(/[łŁ]/g, 'l')
    .replace(/ı/g, 'i')
    .toLowerCase()
    // Replace any run of non-ASCII-alphanumerics with a single hyphen
    .replace(/[^a-z0-9]+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

// ─── Country + city data ────────────────────────────────────────────────────
// Population figures are best-effort 2020s estimates (city proper or metro,
// whichever is the more commonly cited figure). Lat/lng to 4 decimal places.
// Timezones are real IANA names. Currencies are ISO-4217. Locales are BCP-47.

export const COUNTRIES: CountrySeed[] = [
  // ── European Union (EU-27) ──────────────────────────────────────────────
  {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    locale: 'de',
    cities: [
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
      { city: 'Duisburg', region: 'North Rhine-Westphalia', lat: 51.4344, lng: 6.7623, population: 502211 },
      { city: 'Bochum', region: 'North Rhine-Westphalia', lat: 51.4818, lng: 7.2162, population: 365579 },
      { city: 'Wuppertal', region: 'North Rhine-Westphalia', lat: 51.2562, lng: 7.1508, population: 358150 },
      { city: 'Bielefeld', region: 'North Rhine-Westphalia', lat: 52.0302, lng: 8.5325, population: 334195 },
      { city: 'Bonn', region: 'North Rhine-Westphalia', lat: 50.7374, lng: 7.0982, population: 336285 },
      { city: 'Münster', region: 'North Rhine-Westphalia', lat: 51.9607, lng: 7.6261, population: 320584 },
      { city: 'Karlsruhe', region: 'Baden-Württemberg', lat: 49.0069, lng: 8.4037, population: 313092 },
      { city: 'Mannheim', region: 'Baden-Württemberg', lat: 49.4875, lng: 8.4660, population: 311871 },
      { city: 'Augsburg', region: 'Bavaria', lat: 48.3705, lng: 10.8978, population: 296582 },
      { city: 'Wiesbaden', region: 'Hesse', lat: 50.0782, lng: 8.2398, population: 283566 },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    locale: 'fr',
    cities: [
      { city: 'Paris', region: 'Île-de-France', lat: 48.8566, lng: 2.3522, population: 2161000 },
      { city: 'Marseille', region: "Provence-Alpes-Côte d'Azur", lat: 43.2965, lng: 5.3698, population: 873000 },
      { city: 'Lyon', region: 'Auvergne-Rhône-Alpes', lat: 45.7640, lng: 4.8357, population: 522969 },
      { city: 'Toulouse', region: 'Occitanie', lat: 43.6047, lng: 1.4442, population: 486828 },
      { city: 'Nice', region: "Provence-Alpes-Côte d'Azur", lat: 43.7102, lng: 7.2620, population: 342669 },
      { city: 'Nantes', region: 'Pays de la Loire', lat: 47.2184, lng: -1.5536, population: 318808 },
      { city: 'Strasbourg', region: 'Grand Est', lat: 48.5734, lng: 7.7521, population: 287228 },
      { city: 'Montpellier', region: 'Occitanie', lat: 43.6109, lng: 3.8772, population: 295542 },
      { city: 'Bordeaux', region: 'Nouvelle-Aquitaine', lat: 44.8378, lng: -0.5792, population: 260958 },
      { city: 'Lille', region: 'Hauts-de-France', lat: 50.6292, lng: 3.0573, population: 233098 },
      { city: 'Rennes', region: 'Brittany', lat: 47.1173, lng: -1.6778, population: 216815 },
      { city: 'Reims', region: 'Grand Est', lat: 49.2583, lng: 4.0317, population: 182592 },
      { city: 'Le Havre', region: 'Normandy', lat: 49.4944, lng: 0.1079, population: 170147 },
      { city: 'Saint-Étienne', region: 'Auvergne-Rhône-Alpes', lat: 45.4397, lng: 4.3872, population: 172565 },
      { city: 'Toulon', region: "Provence-Alpes-Côte d'Azur", lat: 43.1242, lng: 5.9280, population: 176198 },
      { city: 'Le Mans', region: 'Pays de la Loire', lat: 48.0077, lng: 0.1996, population: 143599 },
      { city: 'Amiens', region: 'Hauts-de-France', lat: 49.8941, lng: 2.2957, population: 134057 },
      { city: 'Limoges', region: 'Nouvelle-Aquitaine', lat: 45.8336, lng: 1.2625, population: 133019 },
      { city: 'Annecy', region: 'Auvergne-Rhône-Alpes', lat: 45.8992, lng: 6.1294, population: 130000 },
      { city: 'Perpignan', region: 'Occitanie', lat: 42.6886, lng: 2.8948, population: 121875 },
      { city: 'Besançon', region: 'Bourgogne-Franche-Comté', lat: 47.2378, lng: 6.0241, population: 117912 },
      { city: 'Metz', region: 'Grand Est', lat: 49.1193, lng: 6.1727, population: 117619 },
      { city: 'Nîmes', region: 'Occitanie', lat: 43.8367, lng: 4.3601, population: 147888 },
    ],
  },
  {
    code: 'IT',
    name: 'Italy',
    currency: 'EUR',
    timezone: 'Europe/Rome',
    locale: 'it',
    cities: [
      { city: 'Rome', region: 'Lazio', lat: 41.9028, lng: 12.4964, population: 2873494 },
      { city: 'Milan', region: 'Lombardy', lat: 45.4642, lng: 9.1900, population: 1396059 },
      { city: 'Naples', region: 'Campania', lat: 40.8518, lng: 14.2681, population: 970185 },
      { city: 'Turin', region: 'Piedmont', lat: 45.0703, lng: 7.6869, population: 870952 },
      { city: 'Palermo', region: 'Sicily', lat: 38.1157, lng: 13.3615, population: 673735 },
      { city: 'Genoa', region: 'Liguria', lat: 44.4056, lng: 8.9463, population: 583601 },
      { city: 'Bologna', region: 'Emilia-Romagna', lat: 44.4949, lng: 11.3426, population: 388367 },
      { city: 'Florence', region: 'Tuscany', lat: 43.7696, lng: 11.2558, population: 382258 },
      { city: 'Bari', region: 'Apulia', lat: 41.1171, lng: 16.8719, population: 322751 },
      { city: 'Catania', region: 'Sicily', lat: 37.5079, lng: 15.0830, population: 311584 },
      { city: 'Venice', region: 'Veneto', lat: 45.4408, lng: 12.3155, population: 261905 },
      { city: 'Verona', region: 'Veneto', lat: 45.4384, lng: 10.9916, population: 259610 },
      { city: 'Messina', region: 'Sicily', lat: 38.1938, lng: 15.5540, population: 231708 },
      { city: 'Padua', region: 'Veneto', lat: 45.4064, lng: 11.8768, population: 210514 },
      { city: 'Trieste', region: 'Friuli-Venezia Giulia', lat: 45.6495, lng: 13.7768, population: 203361 },
      { city: 'Prato', region: 'Tuscany', lat: 43.8777, lng: 11.1025, population: 195813 },
      { city: 'Parma', region: 'Emilia-Romagna', lat: 44.8015, lng: 10.3279, population: 198292 },
      { city: 'Taranto', region: 'Apulia', lat: 40.4644, lng: 17.2470, population: 189910 },
      { city: 'Brescia', region: 'Lombardy', lat: 45.5256, lng: 10.2283, population: 197325 },
    ],
  },
  {
    code: 'ES',
    name: 'Spain',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    locale: 'es',
    cities: [
      { city: 'Madrid', region: 'Community of Madrid', lat: 40.4168, lng: -3.7038, population: 3266126 },
      { city: 'Barcelona', region: 'Catalonia', lat: 41.3851, lng: 2.1734, population: 1636762 },
      { city: 'Valencia', region: 'Valencian Community', lat: 39.4699, lng: -0.3763, population: 807200 },
      { city: 'Seville', region: 'Andalusia', lat: 37.3891, lng: -5.9845, population: 688711 },
      { city: 'Zaragoza', region: 'Aragon', lat: 41.6488, lng: -0.8891, population: 674997 },
      { city: 'Málaga', region: 'Andalusia', lat: 36.7213, lng: -4.4214, population: 574654 },
      { city: 'Murcia', region: 'Region of Murcia', lat: 37.9922, lng: -1.1307, population: 447182 },
      { city: 'Palma', region: 'Balearic Islands', lat: 39.5696, lng: 2.6502, population: 416065 },
      { city: 'Bilbao', region: 'Basque Country', lat: 43.2630, lng: -2.9350, population: 347349 },
      { city: 'Alicante', region: 'Valencian Community', lat: 38.3452, lng: -0.4810, population: 337482 },
      { city: 'Córdoba', region: 'Andalusia', lat: 37.8882, lng: -4.7794, population: 325708 },
      { city: 'Valladolid', region: 'Castile and León', lat: 41.6523, lng: -4.7245, population: 299265 },
      { city: 'Vigo', region: 'Galicia', lat: 42.2406, lng: -8.7207, population: 297332 },
      { city: 'Gijón', region: 'Asturias', lat: 43.5453, lng: -5.6619, population: 271780 },
      { city: 'Lleida', region: 'Catalonia', lat: 41.6176, lng: 0.6200, population: 140446 },
      { city: 'San Sebastián', region: 'Basque Country', lat: 43.3183, lng: -1.9812, population: 188102 },
      { city: 'Santander', region: 'Cantabria', lat: 43.4623, lng: -3.8062, population: 172539 },
      { city: 'Logroño', region: 'La Rioja', lat: 42.4627, lng: -2.4449, population: 151136 },
    ],
  },
  {
    code: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    locale: 'pt',
    cities: [
      { city: 'Lisbon', region: 'Lisbon', lat: 38.7223, lng: -9.1393, population: 547733 },
      { city: 'Porto', region: 'Porto', lat: 41.1579, lng: -8.6291, population: 237591 },
      { city: 'Braga', region: 'Braga', lat: 41.5454, lng: -8.4265, population: 192494 },
      { city: 'Coimbra', region: 'Coimbra', lat: 40.2033, lng: -8.4103, population: 143396 },
      { city: 'Funchal', region: 'Madeira', lat: 32.6669, lng: -16.9241, population: 111892, timezone: 'Atlantic/Madeira' },
      { city: 'Faro', region: 'Faro', lat: 37.0194, lng: -7.9304, population: 64560 },
      { city: 'Aveiro', region: 'Aveiro', lat: 40.6405, lng: -8.6538, population: 86323 },
    ],
  },
  {
    code: 'NL',
    name: 'Netherlands',
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    locale: 'nl',
    cities: [
      { city: 'Amsterdam', region: 'North Holland', lat: 52.3676, lng: 4.9041, population: 905844 },
      { city: 'Rotterdam', region: 'South Holland', lat: 51.9244, lng: 4.4777, population: 651446 },
      { city: 'The Hague', region: 'South Holland', lat: 52.0705, lng: 4.3007, population: 548443 },
      { city: 'Utrecht', region: 'Utrecht', lat: 52.0907, lng: 5.1214, population: 359376 },
      { city: 'Eindhoven', region: 'North Brabant', lat: 51.4416, lng: 5.4697, population: 243737 },
      { city: 'Tilburg', region: 'North Brabant', lat: 51.5719, lng: 5.0672, population: 222601 },
      { city: 'Groningen', region: 'Groningen', lat: 53.2194, lng: 6.5665, population: 233218 },
      { city: 'Almere', region: 'Flevoland', lat: 52.3508, lng: 5.2647, population: 211626 },
      { city: 'Apeldoorn', region: 'Gelderland', lat: 52.2112, lng: 5.9699, population: 162445 },
      { city: 'Haarlem', region: 'North Holland', lat: 52.3874, lng: 4.6462, population: 162543 },
      { city: 'Enschede', region: 'Overijssel', lat: 52.2215, lng: 6.8937, population: 158786 },
      { city: 'Amersfoort', region: 'Utrecht', lat: 52.1561, lng: 5.3878, population: 157276 },
      { city: 'Zwolle', region: 'Overijssel', lat: 52.5168, lng: 6.0830, population: 129825 },
    ],
  },
  {
    code: 'BE',
    name: 'Belgium',
    currency: 'EUR',
    timezone: 'Europe/Brussels',
    locale: 'nl',
    cities: [
      { city: 'Brussels', region: 'Brussels-Capital', lat: 50.8503, lng: 4.3517, population: 1212187 },
      { city: 'Antwerp', region: 'Flanders', lat: 51.2194, lng: 4.4025, population: 523248 },
      { city: 'Ghent', region: 'Flanders', lat: 51.0543, lng: 3.7174, population: 263927 },
      { city: 'Charleroi', region: 'Wallonia', lat: 50.4108, lng: 4.4446, population: 201816 },
      { city: 'Liège', region: 'Wallonia', lat: 50.6326, lng: 5.5797, population: 197355 },
      { city: 'Bruges', region: 'Flanders', lat: 51.2093, lng: 3.2247, population: 118509 },
      { city: 'Leuven', region: 'Flanders', lat: 50.8792, lng: 4.7017, population: 102126 },
    ],
  },
  {
    code: 'LU',
    name: 'Luxembourg',
    currency: 'EUR',
    timezone: 'Europe/Luxembourg',
    locale: 'lb',
    cities: [
      { city: 'Luxembourg City', region: 'Luxembourg', lat: 49.6116, lng: 6.1319, population: 124528 },
      { city: 'Esch-sur-Alzette', region: 'Esch-sur-Alzette', lat: 49.5106, lng: 5.9868, population: 36325 },
      { city: 'Differdange', region: 'Esch-sur-Alzette', lat: 49.5242, lng: 5.8917, population: 26765 },
    ],
  },
  {
    code: 'IE',
    name: 'Ireland',
    currency: 'EUR',
    timezone: 'Europe/Dublin',
    locale: 'en',
    cities: [
      { city: 'Dublin', region: 'Leinster', lat: 53.3498, lng: -6.2603, population: 1173179 },
      { city: 'Cork', region: 'Munster', lat: 51.8985, lng: -8.4756, population: 222534 },
      { city: 'Galway', region: 'Connacht', lat: 53.2707, lng: -9.0568, population: 83456 },
      { city: 'Limerick', region: 'Munster', lat: 52.6638, lng: -8.6267, population: 102287 },
      { city: 'Waterford', region: 'Munster', lat: 52.2593, lng: -7.1101, population: 53504 },
    ],
  },
  {
    code: 'AT',
    name: 'Austria',
    currency: 'EUR',
    timezone: 'Europe/Vienna',
    locale: 'de',
    cities: [
      { city: 'Vienna', region: 'Vienna', lat: 48.2082, lng: 16.3738, population: 1911081 },
      { city: 'Graz', region: 'Styria', lat: 47.0707, lng: 15.4395, population: 287723 },
      { city: 'Linz', region: 'Upper Austria', lat: 48.3069, lng: 14.2858, population: 212041 },
      { city: 'Salzburg', region: 'Salzburg', lat: 47.8095, lng: 13.0550, population: 156272 },
      { city: 'Innsbruck', region: 'Tyrol', lat: 47.2692, lng: 11.4041, population: 132236 },
      { city: 'Klagenfurt', region: 'Carinthia', lat: 46.6168, lng: 14.3055, population: 101303 },
    ],
  },
  {
    code: 'SI',
    name: 'Slovenia',
    currency: 'EUR',
    timezone: 'Europe/Ljubljana',
    locale: 'sl',
    cities: [
      { city: 'Ljubljana', region: 'Ljubljana', lat: 46.0569, lng: 14.5058, population: 285527 },
      { city: 'Maribor', region: 'Maribor', lat: 46.5547, lng: 15.6459, population: 95171 },
      { city: 'Celje', region: 'Celje', lat: 46.2389, lng: 15.2675, population: 38532 },
      { city: 'Kranj', region: 'Gorenjska', lat: 46.2389, lng: 14.3556, population: 37393 },
    ],
  },
  {
    code: 'SK',
    name: 'Slovakia',
    currency: 'EUR',
    timezone: 'Europe/Bratislava',
    locale: 'sk',
    cities: [
      { city: 'Bratislava', region: 'Bratislava', lat: 48.1486, lng: 17.1077, population: 437725 },
      { city: 'Košice', region: 'Košice', lat: 48.7164, lng: 21.2611, population: 239057 },
      { city: 'Prešov', region: 'Prešov', lat: 49.0014, lng: 21.2393, population: 88680 },
      { city: 'Žilina', region: 'Žilina', lat: 49.2231, lng: 18.7394, population: 81515 },
    ],
  },
  {
    code: 'FI',
    name: 'Finland',
    currency: 'EUR',
    timezone: 'Europe/Helsinki',
    locale: 'fi',
    cities: [
      { city: 'Helsinki', region: 'Uusimaa', lat: 60.1699, lng: 24.9384, population: 658864 },
      { city: 'Espoo', region: 'Uusimaa', lat: 60.2055, lng: 24.6559, population: 292796 },
      { city: 'Tampere', region: 'Pirkanmaa', lat: 61.4978, lng: 23.7610, population: 244014 },
      { city: 'Vantaa', region: 'Uusimaa', lat: 60.2934, lng: 25.0378, population: 238148 },
      { city: 'Turku', region: 'Southwest Finland', lat: 60.4518, lng: 22.2666, population: 194391 },
      { city: 'Oulu', region: 'Northern Ostrobothnia', lat: 65.0121, lng: 25.4651, population: 207327 },
    ],
  },
  {
    code: 'EE',
    name: 'Estonia',
    currency: 'EUR',
    timezone: 'Europe/Tallinn',
    locale: 'et',
    cities: [
      { city: 'Tallinn', region: 'Harju', lat: 59.4370, lng: 24.7536, population: 437619 },
      { city: 'Tartu', region: 'Tartu', lat: 58.3780, lng: 26.7290, population: 97435 },
      { city: 'Narva', region: 'Ida-Viru', lat: 59.3772, lng: 28.1903, population: 57721 },
      { city: 'Pärnu', region: 'Pärnu', lat: 58.3859, lng: 24.4972, population: 39728 },
    ],
  },
  {
    code: 'LV',
    name: 'Latvia',
    currency: 'EUR',
    timezone: 'Europe/Riga',
    locale: 'lv',
    cities: [
      { city: 'Riga', region: 'Riga', lat: 56.9496, lng: 24.1052, population: 632614 },
      { city: 'Daugavpils', region: 'Latgale', lat: 55.8750, lng: 26.5166, population: 82046 },
      { city: 'Liepāja', region: 'Kurzeme', lat: 56.5047, lng: 21.0107, population: 67360 },
    ],
  },
  {
    code: 'LT',
    name: 'Lithuania',
    currency: 'EUR',
    timezone: 'Europe/Vilnius',
    locale: 'lt',
    cities: [
      { city: 'Vilnius', region: 'Vilnius', lat: 54.6872, lng: 25.2797, population: 580020 },
      { city: 'Kaunas', region: 'Kaunas', lat: 54.8985, lng: 23.9036, population: 295269 },
      { city: 'Klaipėda', region: 'Klaipėda', lat: 55.7172, lng: 21.1170, population: 152008 },
      { city: 'Šiauliai', region: 'Šiauliai', lat: 55.9333, lng: 23.3167, population: 100653 },
    ],
  },
  {
    code: 'PL',
    name: 'Poland',
    currency: 'PLN',
    timezone: 'Europe/Warsaw',
    locale: 'pl',
    cities: [
      { city: 'Warsaw', region: 'Masovian', lat: 52.2297, lng: 21.0122, population: 1861815 },
      { city: 'Kraków', region: 'Lesser Poland', lat: 50.0647, lng: 19.9450, population: 800653 },
      { city: 'Łódź', region: 'Łódź', lat: 51.7592, lng: 19.4560, population: 672185 },
      { city: 'Wrocław', region: 'Lower Silesian', lat: 51.1079, lng: 17.0385, population: 643782 },
      { city: 'Poznań', region: 'Greater Poland', lat: 52.4064, lng: 16.9252, population: 529410 },
      { city: 'Gdańsk', region: 'Pomeranian', lat: 54.3520, lng: 18.6466, population: 486178 },
      { city: 'Szczecin', region: 'West Pomeranian', lat: 53.4285, lng: 14.5528, population: 401907 },
      { city: 'Bydgoszcz', region: 'Kuyavian-Pomeranian', lat: 53.1235, lng: 18.0084, population: 348906 },
      { city: 'Lublin', region: 'Lublin', lat: 51.2465, lng: 22.5684, population: 339784 },
      { city: 'Białystok', region: 'Podlaskie', lat: 53.1325, lng: 23.1688, population: 297554 },
      { city: 'Katowice', region: 'Silesian', lat: 50.2649, lng: 19.0238, population: 287346 },
      { city: 'Gdynia', region: 'Pomeranian', lat: 54.5189, lng: 18.5305, population: 246348 },
      { city: 'Częstochowa', region: 'Silesian', lat: 50.8119, lng: 19.1205, population: 219989 },
      { city: 'Radom', region: 'Masovian', lat: 51.4027, lng: 21.1467, population: 210941 },
      { city: 'Sosnowiec', region: 'Silesian', lat: 50.2868, lng: 19.1038, population: 189178 },
      { city: 'Toruń', region: 'Kuyavian-Pomeranian', lat: 53.0137, lng: 18.5981, population: 198613 },
      { city: 'Kielce', region: 'Świętokrzyskie', lat: 50.8661, lng: 20.6205, population: 183934 },
      { city: 'Rzeszów', region: 'Podkarpackie', lat: 50.0412, lng: 21.9991, population: 197363 },
      { city: 'Zielona Góra', region: 'Lubusz', lat: 51.9356, lng: 15.5062, population: 139819 },
      { city: 'Olsztyn', region: 'Warmian-Masurian', lat: 53.7784, lng: 20.4802, population: 171799 },
      { city: 'Opole', region: 'Opole', lat: 50.6751, lng: 17.9223, population: 128140 },
    ],
  },
  {
    code: 'CZ',
    name: 'Czechia',
    currency: 'CZK',
    timezone: 'Europe/Prague',
    locale: 'cs',
    cities: [
      { city: 'Prague', region: 'Prague', lat: 50.0755, lng: 14.4378, population: 1335084 },
      { city: 'Brno', region: 'South Moravian', lat: 49.1951, lng: 16.6068, population: 382405 },
      { city: 'Ostrava', region: 'Moravian-Silesian', lat: 49.8209, lng: 18.2625, population: 287968 },
      { city: 'Plzeň', region: 'Plzeň', lat: 49.7384, lng: 13.3736, population: 175219 },
      { city: 'Liberec', region: 'Liberec', lat: 50.7663, lng: 15.0543, population: 104445 },
      { city: 'Olomouc', region: 'Olomouc', lat: 49.5938, lng: 17.2509, population: 100514 },
      { city: 'Hradec Králové', region: 'Hradec Králové', lat: 50.2092, lng: 15.8328, population: 92832 },
      { city: 'České Budějovice', region: 'South Bohemian', lat: 48.9458, lng: 14.4416, population: 94510 },
      { city: 'Pardubice', region: 'Pardubice', lat: 50.0343, lng: 15.7811, population: 89693 },
    ],
  },
  {
    code: 'HU',
    name: 'Hungary',
    currency: 'HUF',
    timezone: 'Europe/Budapest',
    locale: 'hu',
    cities: [
      { city: 'Budapest', region: 'Budapest', lat: 47.4979, lng: 19.0402, population: 1752286 },
      { city: 'Debrecen', region: 'Hajdú-Bihar', lat: 47.5316, lng: 21.6273, population: 201981 },
      { city: 'Szeged', region: 'Csongrád-Csanád', lat: 46.2530, lng: 20.1414, population: 161122 },
      { city: 'Miskolc', region: 'Borsod-Abaúj-Zemplén', lat: 48.1035, lng: 20.7784, population: 152715 },
      { city: 'Pécs', region: 'Baranya', lat: 46.0727, lng: 18.2323, population: 142873 },
      { city: 'Győr', region: 'Győr-Moson-Sopron', lat: 47.6875, lng: 17.6503, population: 129527 },
      { city: 'Nyíregyháza', region: 'Szabolcs-Szatmár-Bereg', lat: 47.9546, lng: 21.7164, population: 118001 },
      { city: 'Kecskemét', region: 'Bács-Kiskun', lat: 46.8963, lng: 19.6931, population: 110687 },
      { city: 'Székesfehérvár', region: 'Fejér', lat: 47.1860, lng: 18.4223, population: 99289 },
    ],
  },
  {
    code: 'HR',
    name: 'Croatia',
    currency: 'EUR',
    timezone: 'Europe/Zagreb',
    locale: 'hr',
    cities: [
      { city: 'Zagreb', region: 'City of Zagreb', lat: 45.8150, lng: 15.9819, population: 769944 },
      { city: 'Split', region: 'Split-Dalmatia', lat: 43.5081, lng: 16.4402, population: 160577 },
      { city: 'Rijeka', region: 'Primorje-Gorski Kotar', lat: 45.3271, lng: 14.4422, population: 128624 },
      { city: 'Osijek', region: 'Osijek-Baranja', lat: 45.5550, lng: 18.6955, population: 96721 },
      { city: 'Zadar', region: 'Zadar', lat: 44.1194, lng: 15.2314, population: 70716 },
    ],
  },
  {
    code: 'RO',
    name: 'Romania',
    currency: 'RON',
    timezone: 'Europe/Bucharest',
    locale: 'ro',
    cities: [
      { city: 'Bucharest', region: 'Bucharest', lat: 44.4268, lng: 26.1025, population: 1883425 },
      { city: 'Cluj-Napoca', region: 'Cluj', lat: 46.7712, lng: 23.6236, population: 324576 },
      { city: 'Iași', region: 'Iași', lat: 47.1585, lng: 27.6014, population: 290422 },
      { city: 'Timișoara', region: 'Timiș', lat: 45.7489, lng: 21.2087, population: 319279 },
      { city: 'Constanța', region: 'Constanța', lat: 44.1598, lng: 28.6348, population: 283872 },
      { city: 'Craiova', region: 'Dolj', lat: 44.3302, lng: 23.7949, population: 234140 },
      { city: 'Brașov', region: 'Brașov', lat: 45.6427, lng: 25.5887, population: 253200 },
      { city: 'Galați', region: 'Galați', lat: 45.4369, lng: 28.0490, population: 217851 },
      { city: 'Ploiești', region: 'Prahova', lat: 44.9393, lng: 26.0322, population: 209945 },
      { city: 'Oradea', region: 'Bihor', lat: 47.0454, lng: 21.9183, population: 196367 },
      { city: 'Bacău', region: 'Bacău', lat: 46.5670, lng: 26.9146, population: 144307 },
      { city: 'Arad', region: 'Arad', lat: 46.1866, lng: 21.3123, population: 159074 },
      { city: 'Sibiu', region: 'Sibiu', lat: 45.7969, lng: 24.1518, population: 147245 },
      { city: 'Târgu Mureș', region: 'Mureș', lat: 46.5486, lng: 24.5665, population: 134290 },
    ],
  },
  {
    code: 'BG',
    name: 'Bulgaria',
    currency: 'BGN',
    timezone: 'Europe/Sofia',
    locale: 'bg',
    cities: [
      { city: 'Sofia', region: 'Sofia City', lat: 42.6977, lng: 23.3219, population: 1241675 },
      { city: 'Plovdiv', region: 'Plovdiv', lat: 42.1354, lng: 24.7453, population: 343424 },
      { city: 'Varna', region: 'Varna', lat: 43.2141, lng: 27.9147, population: 335177 },
      { city: 'Burgas', region: 'Burgas', lat: 42.5048, lng: 27.4626, population: 202766 },
      { city: 'Ruse', region: 'Ruse', lat: 43.8356, lng: 25.9657, population: 144232 },
    ],
  },
  {
    code: 'GR',
    name: 'Greece',
    currency: 'EUR',
    timezone: 'Europe/Athens',
    locale: 'el',
    cities: [
      { city: 'Athens', region: 'Attica', lat: 37.9838, lng: 23.7275, population: 664046 },
      { city: 'Thessaloniki', region: 'Central Macedonia', lat: 40.6401, lng: 22.9444, population: 325182 },
      { city: 'Patras', region: 'Western Greece', lat: 38.2466, lng: 21.7346, population: 167446 },
      { city: 'Heraklion', region: 'Crete', lat: 35.3387, lng: 25.1442, population: 173993 },
      { city: 'Larissa', region: 'Thessaly', lat: 39.6391, lng: 22.4194, population: 144651 },
      { city: 'Volos', region: 'Thessaly', lat: 39.3681, lng: 22.9426, population: 144449 },
      { city: 'Ioannina', region: 'Epirus', lat: 39.6649, lng: 20.8519, population: 65574 },
      { city: 'Chania', region: 'Crete', lat: 35.5138, lng: 24.0244, population: 108642 },
      { city: 'Komotini', region: 'Eastern Macedonia and Thrace', lat: 41.1190, lng: 25.4050, population: 60013 },
    ],
  },
  {
    code: 'CY',
    name: 'Cyprus',
    currency: 'EUR',
    timezone: 'Asia/Nicosia',
    locale: 'el',
    cities: [
      { city: 'Nicosia', region: 'Nicosia', lat: 35.1856, lng: 33.3823, population: 200452 },
      { city: 'Limassol', region: 'Limassol', lat: 34.6786, lng: 33.0413, population: 235056 },
      { city: 'Larnaca', region: 'Larnaca', lat: 34.9229, lng: 33.6233, population: 84591 },
      { city: 'Paphos', region: 'Paphos', lat: 34.7720, lng: 32.4297, population: 63601 },
    ],
  },
  {
    code: 'MT',
    name: 'Malta',
    currency: 'EUR',
    timezone: 'Europe/Malta',
    locale: 'mt',
    cities: [
      { city: 'Valletta', region: 'Malta', lat: 35.8990, lng: 14.5144, population: 6444 },
      { city: 'Birkirkara', region: 'Malta', lat: 35.8970, lng: 14.4611, population: 24356 },
      { city: 'Mosta', region: 'Malta', lat: 35.8950, lng: 14.4255, population: 20241 },
      { city: 'Sliema', region: 'Malta', lat: 35.9125, lng: 14.5017, population: 25000 },
    ],
  },

  // ── EFTA + micro states ─────────────────────────────────────────────────
  {
    code: 'CH',
    name: 'Switzerland',
    currency: 'CHF',
    timezone: 'Europe/Zurich',
    locale: 'de',
    cities: [
      { city: 'Zurich', region: 'Zurich', lat: 47.3769, lng: 8.5417, population: 421046 },
      { city: 'Geneva', region: 'Geneva', lat: 46.2044, lng: 6.1432, population: 201818 },
      { city: 'Basel', region: 'Basel-Stadt', lat: 47.5596, lng: 7.5886, population: 173232 },
      { city: 'Bern', region: 'Bern', lat: 46.9481, lng: 7.4474, population: 133883 },
      { city: 'Lausanne', region: 'Vaud', lat: 46.5197, lng: 6.6323, population: 140202 },
      { city: 'Winterthur', region: 'Zurich', lat: 47.4990, lng: 8.7298, population: 114220 },
      { city: 'Lucerne', region: 'Lucerne', lat: 47.0502, lng: 8.3093, population: 82284 },
      { city: 'St. Gallen', region: 'St. Gallen', lat: 47.4238, lng: 9.3748, population: 76090 },
    ],
  },
  {
    code: 'LI',
    name: 'Liechtenstein',
    currency: 'CHF',
    timezone: 'Europe/Vaduz',
    locale: 'de',
    cities: [
      { city: 'Vaduz', region: 'Vaduz', lat: 47.1410, lng: 9.5209, population: 5696 },
      { city: 'Schaan', region: 'Schaan', lat: 47.1654, lng: 9.5088, population: 5992 },
    ],
  },

  // ── Nordic non-EU ───────────────────────────────────────────────────────
  // (GB, DK, SE, NO, IS)
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    timezone: 'Europe/London',
    locale: 'en',
    cities: [
      { city: 'London', region: 'England', lat: 51.5074, lng: -0.1278, population: 8982000 },
      { city: 'Birmingham', region: 'England', lat: 52.4862, lng: -1.8904, population: 1149000 },
      { city: 'Manchester', region: 'England', lat: 53.4808, lng: -2.2426, population: 547627 },
      { city: 'Glasgow', region: 'Scotland', lat: 55.8642, lng: -4.2518, population: 633120 },
      { city: 'Edinburgh', region: 'Scotland', lat: 55.9533, lng: -3.1883, population: 488050 },
      { city: 'Liverpool', region: 'England', lat: 53.4084, lng: -2.9916, population: 498042 },
      { city: 'Bristol', region: 'England', lat: 51.4545, lng: -2.5879, population: 467559 },
      { city: 'Cardiff', region: 'Wales', lat: 51.4816, lng: -3.1791, population: 366903 },
      { city: 'Belfast', region: 'Northern Ireland', lat: 54.5973, lng: -5.9301, population: 343542 },
      { city: 'Leeds', region: 'England', lat: 53.8008, lng: -1.5491, population: 536280 },
      { city: 'Sheffield', region: 'England', lat: 53.3811, lng: -1.4701, population: 556500 },
      { city: 'Newcastle', region: 'England', lat: 54.9783, lng: -1.6178, population: 308134 },
      { city: 'Nottingham', region: 'England', lat: 52.9552, lng: -1.1494, population: 331069 },
      { city: 'Leicester', region: 'England', lat: 52.6369, lng: -1.1378, population: 369555 },
      { city: 'Coventry', region: 'England', lat: 52.4068, lng: -1.5197, population: 379387 },
      { city: 'Bradford', region: 'England', lat: 53.7960, lng: -1.7595, population: 546976 },
      { city: 'Stoke-on-Trent', region: 'England', lat: 53.0027, lng: -2.1794, population: 258781 },
      { city: 'Wolverhampton', region: 'England', lat: 52.5870, lng: -2.1288, population: 263027 },
      { city: 'Plymouth', region: 'England', lat: 50.3755, lng: -4.1427, population: 264675 },
      { city: 'Southampton', region: 'England', lat: 50.9097, lng: -1.4044, population: 254275 },
      { city: 'Derby', region: 'England', lat: 52.9225, lng: -1.4746, population: 261644 },
      { city: 'Brighton', region: 'England', lat: 50.8225, lng: -0.1372, population: 277965 },
    ],
  },
  {
    code: 'DK',
    name: 'Denmark',
    currency: 'DKK',
    timezone: 'Europe/Copenhagen',
    locale: 'da',
    cities: [
      { city: 'Copenhagen', region: 'Capital Region', lat: 55.6761, lng: 12.5683, population: 638117 },
      { city: 'Aarhus', region: 'Central Denmark', lat: 56.1629, lng: 10.2039, population: 285273 },
      { city: 'Odense', region: 'Southern Denmark', lat: 55.4038, lng: 10.4024, population: 180863 },
      { city: 'Aalborg', region: 'North Denmark', lat: 57.0488, lng: 9.9217, population: 119862 },
      { city: 'Esbjerg', region: 'Southern Denmark', lat: 55.4765, lng: 8.4594, population: 71946 },
    ],
  },
  {
    code: 'SE',
    name: 'Sweden',
    currency: 'SEK',
    timezone: 'Europe/Stockholm',
    locale: 'sv',
    cities: [
      { city: 'Stockholm', region: 'Stockholm', lat: 59.3293, lng: 18.0686, population: 975551 },
      { city: 'Gothenburg', region: 'Västra Götaland', lat: 57.7089, lng: 11.9746, population: 583056 },
      { city: 'Malmö', region: 'Skåne', lat: 55.6049, lng: 13.0038, population: 344166 },
      { city: 'Uppsala', region: 'Uppsala', lat: 59.8586, lng: 17.6389, population: 168096 },
      { city: 'Västerås', region: 'Västmanland', lat: 59.6099, lng: 16.5448, population: 127024 },
      { city: 'Örebro', region: 'Örebro', lat: 59.2741, lng: 15.2066, population: 126037 },
      { city: 'Linköping', region: 'Östergötland', lat: 58.4108, lng: 15.6214, population: 114558 },
      { city: 'Helsingborg', region: 'Skåne', lat: 56.0465, lng: 12.6945, population: 113828 },
      { city: 'Jönköping', region: 'Jönköping', lat: 57.7826, lng: 14.1618, population: 97707 },
      { city: 'Växjö', region: 'Kronoberg', lat: 56.8790, lng: 14.8059, population: 70489 },
    ],
  },
  {
    code: 'NO',
    name: 'Norway',
    currency: 'NOK',
    timezone: 'Europe/Oslo',
    locale: 'no',
    cities: [
      { city: 'Oslo', region: 'Oslo', lat: 59.9139, lng: 10.7522, population: 697549 },
      { city: 'Bergen', region: 'Vestland', lat: 60.3913, lng: 5.3221, population: 285911 },
      { city: 'Trondheim', region: 'Trøndelag', lat: 63.4305, lng: 10.3951, population: 212660 },
      { city: 'Stavanger', region: 'Rogaland', lat: 58.9700, lng: 5.7331, population: 144057 },
      { city: 'Drammen', region: 'Buskerud', lat: 59.7440, lng: 10.2045, population: 101995 },
      { city: 'Fredrikstad', region: 'Østfold', lat: 59.2184, lng: 10.9296, population: 83776 },
    ],
  },
  {
    code: 'IS',
    name: 'Iceland',
    currency: 'ISK',
    timezone: 'Atlantic/Reykjavik',
    locale: 'is',
    cities: [
      { city: 'Reykjavík', region: 'Capital Region', lat: 64.1466, lng: -21.9426, population: 133000 },
      { city: 'Kópavogur', region: 'Capital Region', lat: 64.1118, lng: -21.9116, population: 38703 },
      { city: 'Hafnarfjörður', region: 'Capital Region', lat: 64.0665, lng: -21.9374, population: 29799 },
      { city: 'Akureyri', region: 'Northeast Iceland', lat: 65.6839, lng: -18.1105, population: 19219 },
    ],
  },

  // ── Eastern Europe non-EU ───────────────────────────────────────────────
  {
    code: 'UA',
    name: 'Ukraine',
    currency: 'UAH',
    timezone: 'Europe/Kyiv',
    locale: 'uk',
    cities: [
      { city: 'Kyiv', region: 'Kyiv City', lat: 50.4501, lng: 30.5234, population: 2950419 },
      { city: 'Kharkiv', region: 'Kharkiv', lat: 49.9935, lng: 36.2304, population: 1433886 },
      { city: 'Odesa', region: 'Odesa', lat: 46.4825, lng: 30.7233, population: 1015826 },
      { city: 'Dnipro', region: 'Dnipropetrovsk', lat: 48.4647, lng: 35.0462, population: 980948 },
      { city: 'Lviv', region: 'Lviv', lat: 49.8397, lng: 24.0297, population: 717803 },
      { city: 'Zaporizhzhia', region: 'Zaporizhzhia', lat: 47.8388, lng: 35.1396, population: 722713 },
      { city: 'Vinnytsia', region: 'Vinnytsia', lat: 49.2331, lng: 28.4692, population: 370601 },
      { city: 'Poltava', region: 'Poltava', lat: 49.5881, lng: 34.5514, population: 283401 },
      { city: 'Chernihiv', region: 'Chernihiv', lat: 51.4982, lng: 31.2894, population: 285234 },
      { city: 'Mariupol', region: 'Donetsk', lat: 47.0971, lng: 37.5434, population: 431859 },
      { city: 'Kherson', region: 'Kherson', lat: 46.6354, lng: 32.6169, population: 283649 },
    ],
  },
  {
    code: 'MD',
    name: 'Moldova',
    currency: 'MDL',
    timezone: 'Europe/Chisinau',
    locale: 'ro',
    cities: [
      { city: 'Chișinău', region: 'Chișinău', lat: 47.0105, lng: 28.8638, population: 635994 },
      { city: 'Tiraspol', region: 'Transnistria', lat: 46.8489, lng: 29.5965, population: 129500 },
      { city: 'Bălți', region: 'Bălți', lat: 47.7610, lng: 27.9255, population: 102500 },
    ],
  },
  {
    code: 'BY',
    name: 'Belarus',
    currency: 'BYN',
    timezone: 'Europe/Minsk',
    locale: 'be',
    cities: [
      { city: 'Minsk', region: 'Minsk', lat: 53.9006, lng: 27.5587, population: 2020600 },
      { city: 'Gomel', region: 'Gomel', lat: 52.4345, lng: 30.9754, population: 510300 },
      { city: 'Mogilev', region: 'Mogilev', lat: 53.9007, lng: 30.3326, population: 357100 },
      { city: 'Vitebsk', region: 'Vitebsk', lat: 55.1904, lng: 30.2049, population: 364800 },
    ],
  },

  // ── Russia (European cities + a few large Urals/Siberian ones) ──────────
  {
    code: 'RU',
    name: 'Russia',
    currency: 'RUB',
    timezone: 'Europe/Moscow',
    locale: 'ru',
    cities: [
      { city: 'Moscow', region: 'Moscow', lat: 55.7558, lng: 37.6173, population: 12655050 },
      { city: 'Saint Petersburg', region: 'Saint Petersburg', lat: 59.9311, lng: 30.3609, population: 5384342 },
      { city: 'Kazan', region: 'Tatarstan', lat: 55.8304, lng: 49.0661, population: 1308660 },
      { city: 'Nizhny Novgorod', region: 'Nizhny Novgorod Oblast', lat: 56.2965, lng: 43.9361, population: 1233551 },
      { city: 'Rostov-on-Don', region: 'Rostov Oblast', lat: 47.2357, lng: 39.7015, population: 1142162 },
      { city: 'Krasnodar', region: 'Krasnodar Krai', lat: 45.0355, lng: 38.9753, population: 1099344 },
      { city: 'Voronezh', region: 'Voronezh Oblast', lat: 51.6608, lng: 39.2003, population: 1050602 },
      { city: 'Volgograd', region: 'Volgograd Oblast', lat: 48.7080, lng: 44.5133, population: 1008076 },
      { city: 'Samara', region: 'Samara Oblast', lat: 53.1959, lng: 50.1008, population: 1144738, timezone: 'Europe/Samara' },
      { city: 'Ufa', region: 'Bashkortostan', lat: 54.7388, lng: 55.9721, population: 1144809, timezone: 'Asia/Yekaterinburg' },
      { city: 'Perm', region: 'Perm Krai', lat: 58.0105, lng: 56.2502, population: 1052038, timezone: 'Asia/Yekaterinburg' },
      { city: 'Yekaterinburg', region: 'Sverdlovsk Oblast', lat: 56.8389, lng: 60.6057, population: 1518077, timezone: 'Asia/Yekaterinburg' },
      { city: 'Chelyabinsk', region: 'Chelyabinsk Oblast', lat: 55.1644, lng: 61.4368, population: 1189923, timezone: 'Asia/Yekaterinburg' },
      { city: 'Omsk', region: 'Omsk Oblast', lat: 54.9893, lng: 73.3682, population: 1124445, timezone: 'Asia/Omsk' },
      { city: 'Novosibirsk', region: 'Novosibirsk Oblast', lat: 55.0084, lng: 82.9357, population: 1633595, timezone: 'Asia/Novosibirsk' },
    ],
  },

  // ── Western Balkans non-EU ──────────────────────────────────────────────
  {
    code: 'RS',
    name: 'Serbia',
    currency: 'RSD',
    timezone: 'Europe/Belgrade',
    locale: 'sr',
    cities: [
      { city: 'Belgrade', region: 'Belgrade', lat: 44.7866, lng: 20.4489, population: 1373641 },
      { city: 'Novi Sad', region: 'Vojvodina', lat: 45.2671, lng: 19.8335, population: 277522 },
      { city: 'Niš', region: 'Nišava', lat: 43.3209, lng: 21.8958, population: 183164 },
    ],
  },
  {
    code: 'BA',
    name: 'Bosnia and Herzegovina',
    currency: 'BAM',
    timezone: 'Europe/Sarajevo',
    locale: 'bs',
    cities: [
      { city: 'Sarajevo', region: 'Federation of BiH', lat: 43.8563, lng: 18.4131, population: 275524 },
      { city: 'Banja Luka', region: 'Republika Srpska', lat: 44.7722, lng: 17.1910, population: 138963 },
      { city: 'Tuzla', region: 'Federation of BiH', lat: 44.5384, lng: 18.6671, population: 110979 },
    ],
  },
  {
    code: 'ME',
    name: 'Montenegro',
    currency: 'EUR',
    timezone: 'Europe/Podgorica',
    locale: 'sr',
    cities: [
      { city: 'Podgorica', region: 'Podgorica', lat: 42.4304, lng: 19.2594, population: 156169 },
      { city: 'Nikšić', region: 'Nikšić', lat: 42.7731, lng: 18.9483, population: 56970 },
    ],
  },
  {
    code: 'AL',
    name: 'Albania',
    currency: 'ALL',
    timezone: 'Europe/Tirane',
    locale: 'sq',
    cities: [
      { city: 'Tirana', region: 'Tirana', lat: 41.3275, lng: 19.8187, population: 418495 },
      { city: 'Durrës', region: 'Durrës', lat: 41.3128, lng: 19.4565, population: 175110 },
      { city: 'Vlorë', region: 'Vlorë', lat: 40.4685, lng: 19.4914, population: 130827 },
    ],
  },
  {
    code: 'MK',
    name: 'North Macedonia',
    currency: 'MKD',
    timezone: 'Europe/Skopje',
    locale: 'mk',
    cities: [
      { city: 'Skopje', region: 'Skopje', lat: 41.9981, lng: 21.4254, population: 544086 },
      { city: 'Bitola', region: 'Bitola', lat: 41.0297, lng: 21.3292, population: 74550 },
      { city: 'Kumanovo', region: 'Kumanovo', lat: 42.1322, lng: 21.7144, population: 70842 },
    ],
  },
  {
    code: 'XK',
    name: 'Kosovo',
    currency: 'EUR',
    timezone: 'Europe/Belgrade',
    locale: 'sq',
    cities: [
      { city: 'Pristina', region: 'Pristina', lat: 42.6629, lng: 21.1655, population: 161751 },
      { city: 'Prizren', region: 'Prizren', lat: 42.2139, lng: 20.7408, population: 85119 },
    ],
  },

  // ── Turkey (transcontinental; tz Europe/Istanbul, currency TRY) ─────────
  {
    code: 'TR',
    name: 'Turkey',
    currency: 'TRY',
    timezone: 'Europe/Istanbul',
    locale: 'tr',
    cities: [
      { city: 'Istanbul', region: 'Istanbul', lat: 41.0082, lng: 28.9784, population: 15462452 },
      { city: 'Ankara', region: 'Ankara', lat: 39.9334, lng: 32.8597, population: 5663322 },
      { city: 'İzmir', region: 'İzmir', lat: 38.4237, lng: 27.1428, population: 4391121 },
      { city: 'Bursa', region: 'Bursa', lat: 40.1885, lng: 29.0610, population: 3056120 },
      { city: 'Antalya', region: 'Antalya', lat: 36.8969, lng: 30.7133, population: 2439830 },
      { city: 'Konya', region: 'Konya', lat: 37.8714, lng: 32.4847, population: 2232374 },
      { city: 'Adana', region: 'Adana', lat: 37.0000, lng: 35.3213, population: 2201670 },
      { city: 'Gaziantep', region: 'Gaziantep', lat: 37.0662, lng: 37.3833, population: 2069364 },
      { city: 'Mersin', region: 'Mersin', lat: 36.8121, lng: 34.6415, population: 1868757 },
      { city: 'Kayseri', region: 'Kayseri', lat: 38.7312, lng: 35.4787, population: 1421455 },
      { city: 'Şanlıurfa', region: 'Şanlıurfa', lat: 37.1674, lng: 38.7955, population: 2074468 },
      { city: 'Denizli', region: 'Denizli', lat: 37.7765, lng: 29.0864, population: 1037594 },
      { city: 'Samsun', region: 'Samsun', lat: 41.2867, lng: 36.3300, population: 1326338 },
      { city: 'Eskişehir', region: 'Eskişehir', lat: 39.7767, lng: 30.5206, population: 887475 },
    ],
  },
];

// ─── Seed function ──────────────────────────────────────────────────────────
// Adapted from the old `main()` in prisma/seed-directory.ts, but returns a
// result object instead of console.log + process.exit, so it can be called
// from an API route. Chunked in batches of 50 to keep each SQLite/Supabase
// transaction small and fast.

export interface SeedResult {
  total: number;
  countries: number;
  perCountry: Record<string, number>;
  durationMs: number;
}

/**
 * Upsert every city in `COUNTRIES` into the `DirectoryLocation` table.
 * Idempotent — safe to call repeatedly. Returns counts for logging/UI.
 *
 * @param onProgress Optional callback invoked once per country with the
 *                   country code and number of cities processed so far.
 *                   Useful for a streaming progress UI in the superadmin.
 */
export async function seedDirectory(
  onProgress?: (countryCode: string, processed: number, total: number) => void,
): Promise<SeedResult> {
  const start = Date.now();
  let total = 0;
  const perCountry: Record<string, number> = {};

  for (const country of COUNTRIES) {
    const ops = country.cities.map((c) => {
      const slug = slugify(c.city);
      const tz = c.timezone ?? country.timezone;
      return db.directoryLocation.upsert({
        where: {
          countryCode_citySlug: { countryCode: country.code, citySlug: slug },
        },
        create: {
          countryCode: country.code,
          countryName: country.name,
          city: c.city,
          citySlug: slug,
          region: c.region ?? null,
          latitude: c.lat,
          longitude: c.lng,
          timezone: tz,
          currency: country.currency,
          locale: country.locale,
          population: c.population,
        },
        update: {
          countryName: country.name,
          region: c.region ?? null,
          latitude: c.lat,
          longitude: c.lng,
          timezone: tz,
          currency: country.currency,
          locale: country.locale,
          population: c.population,
          isActive: true,
        },
      });
    });

    // Chunk by 50 to keep each transaction small and fast.
    for (let i = 0; i < ops.length; i += 50) {
      await db.$transaction(ops.slice(i, i + 50));
    }

    total += country.cities.length;
    perCountry[country.code] = country.cities.length;
    onProgress?.(country.code, total, COUNTRIES.length);
  }

  return {
    total,
    countries: Object.keys(perCountry).length,
    perCountry,
    durationMs: Date.now() - start,
  };
}
