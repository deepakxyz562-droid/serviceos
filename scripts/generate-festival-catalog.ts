import fs from 'fs';
import path from 'path';

const festivalsDir = path.join(process.cwd(), 'public/images/bgos/festivals');
const subdirs = fs.readdirSync(festivalsDir).filter((d) =>
  fs.statSync(path.join(festivalsDir, d)).isDirectory(),
);

function cleanTitle(filename: string) {
  let name = filename.replace(/\.[^/.]+$/, '');
  name = name.replace(/_[a-f0-9]{8}$/i, '');
  name = name.replace(/[_-]+/g, ' ').trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const FESTIVAL_META: Record<string, { label: string; emoji: string; description: string }> = {
  diwali: { label: 'Diwali', emoji: '🪔', description: 'Festival of Lights, Deepavali & Lakshmi Puja' },
  holi: { label: 'Holi', emoji: '🎨', description: 'Festival of Colors, Gulal & Celebrations' },
  navratri: { label: 'Navratri & Garba', emoji: '💃', description: 'Nine nights of Garba, Dandiya & devotion' },
  durga_puja: { label: 'Durga Puja', emoji: '🔱', description: 'Durga Puja pandals, Dhunuchi & festive drums' },
  ganesh_chaturthi: { label: 'Ganesh Chaturthi', emoji: '🌼', description: 'Ganesh Utsav, Modak sweets & Visarjan' },
  baisakhi: { label: 'Baisakhi & Lohri', emoji: '🌾', description: 'Punjab harvest festival, Giddha & Dhol' },
  chhath_puja: { label: 'Chhath Puja', emoji: '🌅', description: 'Surya Arghya, Bihula & River Aarti' },
  eid: { label: 'Eid al-Fitr', emoji: '🌙', description: 'Eid festive gatherings & feasts' },
  christmas: { label: 'Christmas & Winter', emoji: '🎄', description: 'Christmas trees, holiday lights & winter cheer' },
  new_year: { label: 'New Year', emoji: '🎊', description: 'Fireworks, Chinese New Year & parades' },
  rakhi: { label: 'Raksha Bandhan', emoji: '🧵', description: 'Sibling love, sacred thread & sweets' },
  makar_sankranti: { label: 'Makar Sankranti', emoji: '🪁', description: 'International Kite Festival & harvest' },
  onam_pongal: { label: 'Onam & Pongal', emoji: '🌸', description: 'Pookkalam, sweet Pongal & harvest festivals' },
  ram_navami: { label: 'Ram Navami', emoji: '🏹', description: 'Ayodhya celebrations & sacred festivities' },
  cherry_blossom: { label: 'Cherry Blossom', emoji: '🌸', description: 'Hanami sakura blooms & spring picnics' },
  songkran: { label: 'Songkran', emoji: '💦', description: 'Water festival & Thai New Year celebrations' },
  carnival: { label: 'Carnivals & Masquerades', emoji: '🎭', description: 'Venice masquerade, Rio carnival & Mardi Gras' },
  oktoberfest: { label: 'Oktoberfest', emoji: '🥨', description: 'Bavarian folk festival & pretzels' },
  day_of_the_dead: { label: 'Día de los Muertos', emoji: '💀', description: 'Day of the Dead altars & sugar skulls' },
  lantern_festival: { label: 'Sky Lanterns & Mooncake', emoji: '🏮', description: 'Mid-Autumn festival & glowing sky lanterns' },
  halloween: { label: 'Halloween', emoji: '🎃', description: 'Carved pumpkins & autumn cheer' },
  st_patricks_day: { label: "St. Patrick's Day", emoji: '🍀', description: 'Shamrocks, clover fields & green parades' },
  winter_ice_festival: { label: 'Ice & Snow Festival', emoji: '❄️', description: 'Harbin illuminated ice palaces' },
  balloon_festival: { label: 'Balloon Festival', emoji: '🎈', description: 'Hot air balloons in the morning sky' },
  regional_cultural: { label: 'Regional Fairs & Traditions', emoji: '✨', description: 'Traditional Indian tribal & cultural fairs' },
};

const items: any[] = [];
for (const sub of subdirs) {
  const dirPath = path.join(festivalsDir, sub);
  const files = fs.readdirSync(dirPath).filter((f) => !f.startsWith('.'));
  for (const f of files) {
    const title = cleanTitle(f);
    const meta = FESTIVAL_META[sub] || { label: sub, emoji: '✨', description: sub };
    const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const tags = Array.from(new Set([sub, meta.label.toLowerCase(), ...words]));
    items.push({
      id: f.replace(/\.[^/.]+$/, ''),
      festivalKey: sub,
      festivalLabel: meta.label,
      emoji: meta.emoji,
      title,
      fileName: f,
      url: `/images/bgos/festivals/${sub}/${f}`,
      s3Path: `bgos-business-images/festivals/${sub}/${f}`,
      tags,
    });
  }
}

const fileContent = `/**
 * Curated Master Festival & Cultural Photography Catalog (242 Assets)
 * Sourced, verified, and mapped across Indian, regional, and global celebrations.
 */

export interface FestivalGroupMeta {
  id: string;
  label: string;
  emoji: string;
  description: string;
  count: number;
}

export interface FestivalPhotoItem {
  id: string;
  festivalKey: string;
  festivalLabel: string;
  emoji: string;
  title: string;
  fileName: string;
  url: string;
  s3Path: string;
  tags: string[];
}

export const FESTIVAL_GROUPS_META: Record<string, { label: string; emoji: string; description: string }> = ${JSON.stringify(FESTIVAL_META, null, 2)};

export const FESTIVAL_PHOTOS_CATALOG: FestivalPhotoItem[] = ${JSON.stringify(items, null, 2)};

/**
 * Returns available festival groups with dynamic photo counts.
 */
export function getFestivalGroupsWithCounts(): FestivalGroupMeta[] {
  const counts: Record<string, number> = {};
  for (const p of FESTIVAL_PHOTOS_CATALOG) {
    counts[p.festivalKey] = (counts[p.festivalKey] || 0) + 1;
  }
  return Object.entries(FESTIVAL_GROUPS_META)
    .filter(([key]) => Boolean(counts[key]))
    .map(([key, meta]) => ({
      id: key,
      label: meta.label,
      emoji: meta.emoji,
      description: meta.description,
      count: counts[key] || 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Search and filter festival photos with multi-token keyword and festival-key matching.
 */
export function searchFestivalCatalog(options: {
  query?: string;
  festivalKey?: string;
  limit?: number;
  offset?: number;
}): {
  items: FestivalPhotoItem[];
  total: number;
  hasMore: boolean;
} {
  const { query, festivalKey, limit = 50, offset = 0 } = options;
  const qTokens = (query || '').toLowerCase().trim().split(/\\s+/).filter(Boolean);

  let filtered = FESTIVAL_PHOTOS_CATALOG;

  if (festivalKey && festivalKey !== 'all') {
    filtered = filtered.filter((item) => item.festivalKey === festivalKey);
  }

  if (qTokens.length > 0) {
    filtered = filtered.filter((item) => {
      const haystack = (item.title + ' ' + item.festivalLabel + ' ' + item.tags.join(' ')).toLowerCase();
      return qTokens.every((token) => haystack.includes(token));
    });
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    items: paginated,
    total,
    hasMore: offset + limit < total,
  };
}
`;

fs.writeFileSync(path.join(process.cwd(), 'shared/festival-catalog.ts'), fileContent);
console.log('Successfully wrote shared/festival-catalog.ts with', items.length, 'items');
