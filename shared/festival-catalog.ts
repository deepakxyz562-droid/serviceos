/**
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

export const FESTIVAL_GROUPS_META: Record<string, { label: string; emoji: string; description: string }> = {
  "diwali": {
    "label": "Diwali",
    "emoji": "🪔",
    "description": "Festival of Lights, Deepavali & Lakshmi Puja"
  },
  "holi": {
    "label": "Holi",
    "emoji": "🎨",
    "description": "Festival of Colors, Gulal & Celebrations"
  },
  "navratri": {
    "label": "Navratri & Garba",
    "emoji": "💃",
    "description": "Nine nights of Garba, Dandiya & devotion"
  },
  "durga_puja": {
    "label": "Durga Puja",
    "emoji": "🔱",
    "description": "Durga Puja pandals, Dhunuchi & festive drums"
  },
  "ganesh_chaturthi": {
    "label": "Ganesh Chaturthi",
    "emoji": "🌼",
    "description": "Ganesh Utsav, Modak sweets & Visarjan"
  },
  "baisakhi": {
    "label": "Baisakhi & Lohri",
    "emoji": "🌾",
    "description": "Punjab harvest festival, Giddha & Dhol"
  },
  "chhath_puja": {
    "label": "Chhath Puja",
    "emoji": "🌅",
    "description": "Surya Arghya, Bihula & River Aarti"
  },
  "eid": {
    "label": "Eid al-Fitr",
    "emoji": "🌙",
    "description": "Eid festive gatherings & feasts"
  },
  "christmas": {
    "label": "Christmas & Winter",
    "emoji": "🎄",
    "description": "Christmas trees, holiday lights & winter cheer"
  },
  "new_year": {
    "label": "New Year",
    "emoji": "🎊",
    "description": "Fireworks, Chinese New Year & parades"
  },
  "rakhi": {
    "label": "Raksha Bandhan",
    "emoji": "🧵",
    "description": "Sibling love, sacred thread & sweets"
  },
  "makar_sankranti": {
    "label": "Makar Sankranti",
    "emoji": "🪁",
    "description": "International Kite Festival & harvest"
  },
  "onam_pongal": {
    "label": "Onam & Pongal",
    "emoji": "🌸",
    "description": "Pookkalam, sweet Pongal & harvest festivals"
  },
  "ram_navami": {
    "label": "Ram Navami",
    "emoji": "🏹",
    "description": "Ayodhya celebrations & sacred festivities"
  },
  "cherry_blossom": {
    "label": "Cherry Blossom",
    "emoji": "🌸",
    "description": "Hanami sakura blooms & spring picnics"
  },
  "songkran": {
    "label": "Songkran",
    "emoji": "💦",
    "description": "Water festival & Thai New Year celebrations"
  },
  "carnival": {
    "label": "Carnivals & Masquerades",
    "emoji": "🎭",
    "description": "Venice masquerade, Rio carnival & Mardi Gras"
  },
  "oktoberfest": {
    "label": "Oktoberfest",
    "emoji": "🥨",
    "description": "Bavarian folk festival & pretzels"
  },
  "day_of_the_dead": {
    "label": "Día de los Muertos",
    "emoji": "💀",
    "description": "Day of the Dead altars & sugar skulls"
  },
  "lantern_festival": {
    "label": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "description": "Mid-Autumn festival & glowing sky lanterns"
  },
  "halloween": {
    "label": "Halloween",
    "emoji": "🎃",
    "description": "Carved pumpkins & autumn cheer"
  },
  "st_patricks_day": {
    "label": "St. Patrick's Day",
    "emoji": "🍀",
    "description": "Shamrocks, clover fields & green parades"
  },
  "winter_ice_festival": {
    "label": "Ice & Snow Festival",
    "emoji": "❄️",
    "description": "Harbin illuminated ice palaces"
  },
  "balloon_festival": {
    "label": "Balloon Festival",
    "emoji": "🎈",
    "description": "Hot air balloons in the morning sky"
  },
  "regional_cultural": {
    "label": "Regional Fairs & Traditions",
    "emoji": "✨",
    "description": "Traditional Indian tribal & cultural fairs"
  }
};

export const FESTIVAL_PHOTOS_CATALOG: FestivalPhotoItem[] = [
  {
    "id": "Baisakhi_wheat_sheaf_in_field_3d697cd5",
    "festivalKey": "baisakhi",
    "festivalLabel": "Baisakhi & Lohri",
    "emoji": "🌾",
    "title": "Baisakhi wheat sheaf in field",
    "fileName": "Baisakhi_wheat_sheaf_in_field_3d697cd5.webp",
    "url": "/images/bgos/festivals/baisakhi/Baisakhi_wheat_sheaf_in_field_3d697cd5.webp",
    "s3Path": "bgos-business-images/festivals/baisakhi/Baisakhi_wheat_sheaf_in_field_3d697cd5.webp",
    "tags": [
      "baisakhi",
      "baisakhi & lohri",
      "wheat",
      "sheaf",
      "field"
    ]
  },
  {
    "id": "Lighting_Meji_bonfire_in_field_0ad64bf5",
    "festivalKey": "baisakhi",
    "festivalLabel": "Baisakhi & Lohri",
    "emoji": "🌾",
    "title": "Lighting Meji bonfire in field",
    "fileName": "Lighting_Meji_bonfire_in_field_0ad64bf5.webp",
    "url": "/images/bgos/festivals/baisakhi/Lighting_Meji_bonfire_in_field_0ad64bf5.webp",
    "s3Path": "bgos-business-images/festivals/baisakhi/Lighting_Meji_bonfire_in_field_0ad64bf5.webp",
    "tags": [
      "baisakhi",
      "baisakhi & lohri",
      "lighting",
      "meji",
      "bonfire",
      "field"
    ]
  },
  {
    "id": "Punjab_Lohri_bonfire_and_dancers_9a16926d",
    "festivalKey": "baisakhi",
    "festivalLabel": "Baisakhi & Lohri",
    "emoji": "🌾",
    "title": "Punjab Lohri bonfire and dancers",
    "fileName": "Punjab_Lohri_bonfire_and_dancers_9a16926d.webp",
    "url": "/images/bgos/festivals/baisakhi/Punjab_Lohri_bonfire_and_dancers_9a16926d.webp",
    "s3Path": "bgos-business-images/festivals/baisakhi/Punjab_Lohri_bonfire_and_dancers_9a16926d.webp",
    "tags": [
      "baisakhi",
      "baisakhi & lohri",
      "punjab",
      "lohri",
      "bonfire",
      "and",
      "dancers"
    ]
  },
  {
    "id": "Punjabi_dancers_leaping_in_fields_b3f2e6e8",
    "festivalKey": "baisakhi",
    "festivalLabel": "Baisakhi & Lohri",
    "emoji": "🌾",
    "title": "Punjabi dancers leaping in fields",
    "fileName": "Punjabi_dancers_leaping_in_fields_b3f2e6e8.webp",
    "url": "/images/bgos/festivals/baisakhi/Punjabi_dancers_leaping_in_fields_b3f2e6e8.webp",
    "s3Path": "bgos-business-images/festivals/baisakhi/Punjabi_dancers_leaping_in_fields_b3f2e6e8.webp",
    "tags": [
      "baisakhi",
      "baisakhi & lohri",
      "punjabi",
      "dancers",
      "leaping",
      "fields"
    ]
  },
  {
    "id": "Traditional_Punjabi_dhol_in_wheat_33dd4e18",
    "festivalKey": "baisakhi",
    "festivalLabel": "Baisakhi & Lohri",
    "emoji": "🌾",
    "title": "Traditional Punjabi dhol in wheat",
    "fileName": "Traditional_Punjabi_dhol_in_wheat_33dd4e18.webp",
    "url": "/images/bgos/festivals/baisakhi/Traditional_Punjabi_dhol_in_wheat_33dd4e18.webp",
    "s3Path": "bgos-business-images/festivals/baisakhi/Traditional_Punjabi_dhol_in_wheat_33dd4e18.webp",
    "tags": [
      "baisakhi",
      "baisakhi & lohri",
      "traditional",
      "punjabi",
      "dhol",
      "wheat"
    ]
  },
  {
    "id": "Women_performing_Giddha_dance_08aad7ba",
    "festivalKey": "baisakhi",
    "festivalLabel": "Baisakhi & Lohri",
    "emoji": "🌾",
    "title": "Women performing Giddha dance",
    "fileName": "Women_performing_Giddha_dance_08aad7ba.webp",
    "url": "/images/bgos/festivals/baisakhi/Women_performing_Giddha_dance_08aad7ba.webp",
    "s3Path": "bgos-business-images/festivals/baisakhi/Women_performing_Giddha_dance_08aad7ba.webp",
    "tags": [
      "baisakhi",
      "baisakhi & lohri",
      "women",
      "performing",
      "giddha",
      "dance"
    ]
  },
  {
    "id": "Hot_air_balloons_lifting_off_4a91362a",
    "festivalKey": "balloon_festival",
    "festivalLabel": "Balloon Festival",
    "emoji": "🎈",
    "title": "Hot air balloons lifting off",
    "fileName": "Hot_air_balloons_lifting_off_4a91362a.webp",
    "url": "/images/bgos/festivals/balloon_festival/Hot_air_balloons_lifting_off_4a91362a.webp",
    "s3Path": "bgos-business-images/festivals/balloon_festival/Hot_air_balloons_lifting_off_4a91362a.webp",
    "tags": [
      "balloon_festival",
      "balloon festival",
      "hot",
      "air",
      "balloons",
      "lifting",
      "off"
    ]
  },
  {
    "id": "Hot_air_balloons_rising_over_7569098b",
    "festivalKey": "balloon_festival",
    "festivalLabel": "Balloon Festival",
    "emoji": "🎈",
    "title": "Hot air balloons rising over",
    "fileName": "Hot_air_balloons_rising_over_7569098b.webp",
    "url": "/images/bgos/festivals/balloon_festival/Hot_air_balloons_rising_over_7569098b.webp",
    "s3Path": "bgos-business-images/festivals/balloon_festival/Hot_air_balloons_rising_over_7569098b.webp",
    "tags": [
      "balloon_festival",
      "balloon festival",
      "hot",
      "air",
      "balloons",
      "rising",
      "over"
    ]
  },
  {
    "id": "Black_and_gold_masquerade_mask_91ce9821",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Black and gold masquerade mask",
    "fileName": "Black_and_gold_masquerade_mask_91ce9821.webp",
    "url": "/images/bgos/festivals/carnival/Black_and_gold_masquerade_mask_91ce9821.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Black_and_gold_masquerade_mask_91ce9821.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "black",
      "and",
      "gold",
      "masquerade",
      "mask"
    ]
  },
  {
    "id": "Carnival_feather_headdress_close-up_f3206b97",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Carnival feather headdress close up",
    "fileName": "Carnival_feather_headdress_close-up_f3206b97.webp",
    "url": "/images/bgos/festivals/carnival/Carnival_feather_headdress_close-up_f3206b97.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Carnival_feather_headdress_close-up_f3206b97.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "feather",
      "headdress",
      "close"
    ]
  },
  {
    "id": "Crystals_and_feathers_on_costume_c8040598",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Crystals and feathers on costume",
    "fileName": "Crystals_and_feathers_on_costume_c8040598.webp",
    "url": "/images/bgos/festivals/carnival/Crystals_and_feathers_on_costume_c8040598.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Crystals_and_feathers_on_costume_c8040598.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "crystals",
      "and",
      "feathers",
      "costume"
    ]
  },
  {
    "id": "Dancer_in_feather_costume_ab0c0958",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Dancer in feather costume",
    "fileName": "Dancer_in_feather_costume_ab0c0958.webp",
    "url": "/images/bgos/festivals/carnival/Dancer_in_feather_costume_ab0c0958.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Dancer_in_feather_costume_ab0c0958.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "dancer",
      "feather",
      "costume"
    ]
  },
  {
    "id": "Gold_Venetian_masquerade_mask_b8104c39",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Gold Venetian masquerade mask",
    "fileName": "Gold_Venetian_masquerade_mask_b8104c39.webp",
    "url": "/images/bgos/festivals/carnival/Gold_Venetian_masquerade_mask_b8104c39.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Gold_Venetian_masquerade_mask_b8104c39.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "gold",
      "venetian",
      "masquerade",
      "mask"
    ]
  },
  {
    "id": "Guests_at_Venetian_masquerade_ball_65b415e7",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Guests at Venetian masquerade ball",
    "fileName": "Guests_at_Venetian_masquerade_ball_65b415e7.webp",
    "url": "/images/bgos/festivals/carnival/Guests_at_Venetian_masquerade_ball_65b415e7.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Guests_at_Venetian_masquerade_ball_65b415e7.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "guests",
      "venetian",
      "masquerade",
      "ball"
    ]
  },
  {
    "id": "Mardi_Gras_beads_flying_29c51dfc",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Mardi Gras beads flying",
    "fileName": "Mardi_Gras_beads_flying_29c51dfc.webp",
    "url": "/images/bgos/festivals/carnival/Mardi_Gras_beads_flying_29c51dfc.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Mardi_Gras_beads_flying_29c51dfc.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "mardi",
      "gras",
      "beads",
      "flying"
    ]
  },
  {
    "id": "Mardi_Gras_beads_on_street_68c2e866",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Mardi Gras beads on street",
    "fileName": "Mardi_Gras_beads_on_street_68c2e866.webp",
    "url": "/images/bgos/festivals/carnival/Mardi_Gras_beads_on_street_68c2e866.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Mardi_Gras_beads_on_street_68c2e866.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "mardi",
      "gras",
      "beads",
      "street"
    ]
  },
  {
    "id": "Mardi_Gras_parade_scene_66a307fd",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Mardi Gras parade scene",
    "fileName": "Mardi_Gras_parade_scene_66a307fd.webp",
    "url": "/images/bgos/festivals/carnival/Mardi_Gras_parade_scene_66a307fd.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Mardi_Gras_parade_scene_66a307fd.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "mardi",
      "gras",
      "parade",
      "scene"
    ]
  },
  {
    "id": "Parade_float_throwing_beads_b3167dcd",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Parade float throwing beads",
    "fileName": "Parade_float_throwing_beads_b3167dcd.webp",
    "url": "/images/bgos/festivals/carnival/Parade_float_throwing_beads_b3167dcd.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Parade_float_throwing_beads_b3167dcd.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "parade",
      "float",
      "throwing",
      "beads"
    ]
  },
  {
    "id": "Rio_Carnival_parade_float_decorated_2a6550c3",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Rio Carnival parade float decorated",
    "fileName": "Rio_Carnival_parade_float_decorated_2a6550c3.webp",
    "url": "/images/bgos/festivals/carnival/Rio_Carnival_parade_float_decorated_2a6550c3.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Rio_Carnival_parade_float_decorated_2a6550c3.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "rio",
      "parade",
      "float",
      "decorated"
    ]
  },
  {
    "id": "Samba_dancer_wearing_feather_hea…_7e18cc1c",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Samba dancer wearing feather hea…",
    "fileName": "Samba_dancer_wearing_feather_hea…_7e18cc1c.webp",
    "url": "/images/bgos/festivals/carnival/Samba_dancer_wearing_feather_hea…_7e18cc1c.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Samba_dancer_wearing_feather_hea…_7e18cc1c.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "samba",
      "dancer",
      "wearing",
      "feather",
      "hea…"
    ]
  },
  {
    "id": "Samba_dancer_wearing_feather_hea…_d036a2f8",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Samba dancer wearing feather hea…",
    "fileName": "Samba_dancer_wearing_feather_hea…_d036a2f8.webp",
    "url": "/images/bgos/festivals/carnival/Samba_dancer_wearing_feather_hea…_d036a2f8.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Samba_dancer_wearing_feather_hea…_d036a2f8.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "samba",
      "dancer",
      "wearing",
      "feather",
      "hea…"
    ]
  },
  {
    "id": "Venetian_mask_with_gold_details_2cc6dd74",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Venetian mask with gold details",
    "fileName": "Venetian_mask_with_gold_details_2cc6dd74.webp",
    "url": "/images/bgos/festivals/carnival/Venetian_mask_with_gold_details_2cc6dd74.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Venetian_mask_with_gold_details_2cc6dd74.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "venetian",
      "mask",
      "with",
      "gold",
      "details"
    ]
  },
  {
    "id": "Venetian_masquerade_costume_at_c…_40ba735a",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Venetian masquerade costume at c…",
    "fileName": "Venetian_masquerade_costume_at_c…_40ba735a.webp",
    "url": "/images/bgos/festivals/carnival/Venetian_masquerade_costume_at_c…_40ba735a.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Venetian_masquerade_costume_at_c…_40ba735a.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "venetian",
      "masquerade",
      "costume"
    ]
  },
  {
    "id": "Venetian_masquerade_performer_on…_6d507ebe",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Venetian masquerade performer on…",
    "fileName": "Venetian_masquerade_performer_on…_6d507ebe.webp",
    "url": "/images/bgos/festivals/carnival/Venetian_masquerade_performer_on…_6d507ebe.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Venetian_masquerade_performer_on…_6d507ebe.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "venetian",
      "masquerade",
      "performer",
      "on…"
    ]
  },
  {
    "id": "Venetian_porcelain_mask_with_fea…_33fb6ede",
    "festivalKey": "carnival",
    "festivalLabel": "Carnivals & Masquerades",
    "emoji": "🎭",
    "title": "Venetian porcelain mask with fea…",
    "fileName": "Venetian_porcelain_mask_with_fea…_33fb6ede.webp",
    "url": "/images/bgos/festivals/carnival/Venetian_porcelain_mask_with_fea…_33fb6ede.webp",
    "s3Path": "bgos-business-images/festivals/carnival/Venetian_porcelain_mask_with_fea…_33fb6ede.webp",
    "tags": [
      "carnival",
      "carnivals & masquerades",
      "venetian",
      "porcelain",
      "mask",
      "with",
      "fea…"
    ]
  },
  {
    "id": "Cherry_blossom_festival_evening_…_32771d70",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Cherry blossom festival evening …",
    "fileName": "Cherry_blossom_festival_evening_…_32771d70.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Cherry_blossom_festival_evening_…_32771d70.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Cherry_blossom_festival_evening_…_32771d70.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "cherry",
      "blossom",
      "festival",
      "evening"
    ]
  },
  {
    "id": "Cherry_blossom_tunnel_with_sunbeams_d56d0e68",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Cherry blossom tunnel with sunbeams",
    "fileName": "Cherry_blossom_tunnel_with_sunbeams_d56d0e68.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Cherry_blossom_tunnel_with_sunbeams_d56d0e68.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Cherry_blossom_tunnel_with_sunbeams_d56d0e68.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "cherry",
      "blossom",
      "tunnel",
      "with",
      "sunbeams"
    ]
  },
  {
    "id": "Cherry_blossoms_on_wooden_branch_88df3947",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Cherry blossoms on wooden branch",
    "fileName": "Cherry_blossoms_on_wooden_branch_88df3947.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Cherry_blossoms_on_wooden_branch_88df3947.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Cherry_blossoms_on_wooden_branch_88df3947.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "cherry",
      "blossoms",
      "wooden",
      "branch"
    ]
  },
  {
    "id": "Hanami_cherry_blossom_picnic_mat_7e67c3bb",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Hanami cherry blossom picnic mat",
    "fileName": "Hanami_cherry_blossom_picnic_mat_7e67c3bb.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Hanami_cherry_blossom_picnic_mat_7e67c3bb.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Hanami_cherry_blossom_picnic_mat_7e67c3bb.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "hanami",
      "cherry",
      "blossom",
      "picnic",
      "mat"
    ]
  },
  {
    "id": "Hanami_picnic_under_cherry_blossoms_ea77e21c",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Hanami picnic under cherry blossoms",
    "fileName": "Hanami_picnic_under_cherry_blossoms_ea77e21c.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Hanami_picnic_under_cherry_blossoms_ea77e21c.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Hanami_picnic_under_cherry_blossoms_ea77e21c.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "hanami",
      "picnic",
      "under",
      "cherry",
      "blossoms"
    ]
  },
  {
    "id": "Illuminated_cherry_blossoms_glow…_9f4b36d7",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Illuminated cherry blossoms glow…",
    "fileName": "Illuminated_cherry_blossoms_glow…_9f4b36d7.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Illuminated_cherry_blossoms_glow…_9f4b36d7.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Illuminated_cherry_blossoms_glow…_9f4b36d7.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "illuminated",
      "cherry",
      "blossoms",
      "glow…"
    ]
  },
  {
    "id": "Japanese_bento_box_on_mat_c6cd7365",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Japanese bento box on mat",
    "fileName": "Japanese_bento_box_on_mat_c6cd7365.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Japanese_bento_box_on_mat_c6cd7365.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Japanese_bento_box_on_mat_c6cd7365.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "japanese",
      "bento",
      "box",
      "mat"
    ]
  },
  {
    "id": "Looking_up_at_cherry_blossoms_d5c4936a",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Looking up at cherry blossoms",
    "fileName": "Looking_up_at_cherry_blossoms_d5c4936a.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Looking_up_at_cherry_blossoms_d5c4936a.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Looking_up_at_cherry_blossoms_d5c4936a.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "looking",
      "cherry",
      "blossoms"
    ]
  },
  {
    "id": "Picnic_basket_under_cherry_blossoms_09c7a895",
    "festivalKey": "cherry_blossom",
    "festivalLabel": "Cherry Blossom",
    "emoji": "🌸",
    "title": "Picnic basket under cherry blossoms",
    "fileName": "Picnic_basket_under_cherry_blossoms_09c7a895.webp",
    "url": "/images/bgos/festivals/cherry_blossom/Picnic_basket_under_cherry_blossoms_09c7a895.webp",
    "s3Path": "bgos-business-images/festivals/cherry_blossom/Picnic_basket_under_cherry_blossoms_09c7a895.webp",
    "tags": [
      "cherry_blossom",
      "cherry blossom",
      "picnic",
      "basket",
      "under",
      "cherry",
      "blossoms"
    ]
  },
  {
    "id": "Bihula_festival_ritual_on_river_9778d482",
    "festivalKey": "chhath_puja",
    "festivalLabel": "Chhath Puja",
    "emoji": "🌅",
    "title": "Bihula festival ritual on river",
    "fileName": "Bihula_festival_ritual_on_river_9778d482.webp",
    "url": "/images/bgos/festivals/chhath_puja/Bihula_festival_ritual_on_river_9778d482.webp",
    "s3Path": "bgos-business-images/festivals/chhath_puja/Bihula_festival_ritual_on_river_9778d482.webp",
    "tags": [
      "chhath_puja",
      "chhath puja",
      "bihula",
      "festival",
      "ritual",
      "river"
    ]
  },
  {
    "id": "Devotees_offering_Arghya_at_sunset_52898656",
    "festivalKey": "chhath_puja",
    "festivalLabel": "Chhath Puja",
    "emoji": "🌅",
    "title": "Devotees offering Arghya at sunset",
    "fileName": "Devotees_offering_Arghya_at_sunset_52898656.webp",
    "url": "/images/bgos/festivals/chhath_puja/Devotees_offering_Arghya_at_sunset_52898656.webp",
    "s3Path": "bgos-business-images/festivals/chhath_puja/Devotees_offering_Arghya_at_sunset_52898656.webp",
    "tags": [
      "chhath_puja",
      "chhath puja",
      "devotees",
      "offering",
      "arghya",
      "sunset"
    ]
  },
  {
    "id": "Evening_river_aarti_in_Rishikesh_35b82160",
    "festivalKey": "chhath_puja",
    "festivalLabel": "Chhath Puja",
    "emoji": "🌅",
    "title": "Evening river aarti in Rishikesh",
    "fileName": "Evening_river_aarti_in_Rishikesh_35b82160.webp",
    "url": "/images/bgos/festivals/chhath_puja/Evening_river_aarti_in_Rishikesh_35b82160.webp",
    "s3Path": "bgos-business-images/festivals/chhath_puja/Evening_river_aarti_in_Rishikesh_35b82160.webp",
    "tags": [
      "chhath_puja",
      "chhath puja",
      "evening",
      "river",
      "aarti",
      "rishikesh"
    ]
  },
  {
    "id": "Ganga_Aarti_ceremony_on_ghats_c66b770c",
    "festivalKey": "chhath_puja",
    "festivalLabel": "Chhath Puja",
    "emoji": "🌅",
    "title": "Ganga Aarti ceremony on ghats",
    "fileName": "Ganga_Aarti_ceremony_on_ghats_c66b770c.webp",
    "url": "/images/bgos/festivals/chhath_puja/Ganga_Aarti_ceremony_on_ghats_c66b770c.webp",
    "s3Path": "bgos-business-images/festivals/chhath_puja/Ganga_Aarti_ceremony_on_ghats_c66b770c.webp",
    "tags": [
      "chhath_puja",
      "chhath puja",
      "ganga",
      "aarti",
      "ceremony",
      "ghats"
    ]
  },
  {
    "id": "Christmas_stockings_hanging_by_f…_163d3437",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Christmas stockings hanging by f…",
    "fileName": "Christmas_stockings_hanging_by_f…_163d3437.webp",
    "url": "/images/bgos/festivals/christmas/Christmas_stockings_hanging_by_f…_163d3437.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Christmas_stockings_hanging_by_f…_163d3437.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "stockings",
      "hanging"
    ]
  },
  {
    "id": "Christmas_tree_in_living_room_c022c5a1",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Christmas tree in living room",
    "fileName": "Christmas_tree_in_living_room_c022c5a1.webp",
    "url": "/images/bgos/festivals/christmas/Christmas_tree_in_living_room_c022c5a1.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Christmas_tree_in_living_room_c022c5a1.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "tree",
      "living",
      "room"
    ]
  },
  {
    "id": "Christmas_tree_lights_sparkling_b3212d92",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Christmas tree lights sparkling",
    "fileName": "Christmas_tree_lights_sparkling_b3212d92.webp",
    "url": "/images/bgos/festivals/christmas/Christmas_tree_lights_sparkling_b3212d92.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Christmas_tree_lights_sparkling_b3212d92.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "tree",
      "lights",
      "sparkling"
    ]
  },
  {
    "id": "Christmas_wreath_hanging_on_door_1d7a77ee",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Christmas wreath hanging on door",
    "fileName": "Christmas_wreath_hanging_on_door_1d7a77ee.webp",
    "url": "/images/bgos/festivals/christmas/Christmas_wreath_hanging_on_door_1d7a77ee.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Christmas_wreath_hanging_on_door_1d7a77ee.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "wreath",
      "hanging",
      "door"
    ]
  },
  {
    "id": "European_Christmas_market_night_…_20e73d1d",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "European Christmas market night …",
    "fileName": "European_Christmas_market_night_…_20e73d1d.webp",
    "url": "/images/bgos/festivals/christmas/European_Christmas_market_night_…_20e73d1d.webp",
    "s3Path": "bgos-business-images/festivals/christmas/European_Christmas_market_night_…_20e73d1d.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "european",
      "market",
      "night"
    ]
  },
  {
    "id": "Gingerbread_cookies_with_white_f…_4965fbf5",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Gingerbread cookies with white f…",
    "fileName": "Gingerbread_cookies_with_white_f…_4965fbf5.webp",
    "url": "/images/bgos/festivals/christmas/Gingerbread_cookies_with_white_f…_4965fbf5.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Gingerbread_cookies_with_white_f…_4965fbf5.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "gingerbread",
      "cookies",
      "with",
      "white"
    ]
  },
  {
    "id": "Gingerbread_house_in_snow_7a5d4777",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Gingerbread house in snow",
    "fileName": "Gingerbread_house_in_snow_7a5d4777.webp",
    "url": "/images/bgos/festivals/christmas/Gingerbread_house_in_snow_7a5d4777.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Gingerbread_house_in_snow_7a5d4777.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "gingerbread",
      "house",
      "snow"
    ]
  },
  {
    "id": "Santa_flying_sleigh_over_village_799a192e",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Santa flying sleigh over village",
    "fileName": "Santa_flying_sleigh_over_village_799a192e.webp",
    "url": "/images/bgos/festivals/christmas/Santa_flying_sleigh_over_village_799a192e.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Santa_flying_sleigh_over_village_799a192e.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "santa",
      "flying",
      "sleigh",
      "over",
      "village"
    ]
  },
  {
    "id": "Snowy_Christmas_village_with_lights_2e5d1223",
    "festivalKey": "christmas",
    "festivalLabel": "Christmas & Winter",
    "emoji": "🎄",
    "title": "Snowy Christmas village with lights",
    "fileName": "Snowy_Christmas_village_with_lights_2e5d1223.webp",
    "url": "/images/bgos/festivals/christmas/Snowy_Christmas_village_with_lights_2e5d1223.webp",
    "s3Path": "bgos-business-images/festivals/christmas/Snowy_Christmas_village_with_lights_2e5d1223.webp",
    "tags": [
      "christmas",
      "christmas & winter",
      "snowy",
      "village",
      "with",
      "lights"
    ]
  },
  {
    "id": "Catrina_portrait_with_floral_hea…_2d61610d",
    "festivalKey": "day_of_the_dead",
    "festivalLabel": "Día de los Muertos",
    "emoji": "💀",
    "title": "Catrina portrait with floral hea…",
    "fileName": "Catrina_portrait_with_floral_hea…_2d61610d.webp",
    "url": "/images/bgos/festivals/day_of_the_dead/Catrina_portrait_with_floral_hea…_2d61610d.webp",
    "s3Path": "bgos-business-images/festivals/day_of_the_dead/Catrina_portrait_with_floral_hea…_2d61610d.webp",
    "tags": [
      "day_of_the_dead",
      "día de los muertos",
      "catrina",
      "portrait",
      "with",
      "floral",
      "hea…"
    ]
  },
  {
    "id": "Día_de_los_Muertos_altar_25730194",
    "festivalKey": "day_of_the_dead",
    "festivalLabel": "Día de los Muertos",
    "emoji": "💀",
    "title": "Día de los Muertos altar",
    "fileName": "Día_de_los_Muertos_altar_25730194.webp",
    "url": "/images/bgos/festivals/day_of_the_dead/Día_de_los_Muertos_altar_25730194.webp",
    "s3Path": "bgos-business-images/festivals/day_of_the_dead/Día_de_los_Muertos_altar_25730194.webp",
    "tags": [
      "day_of_the_dead",
      "día de los muertos",
      "día",
      "los",
      "muertos",
      "altar"
    ]
  },
  {
    "id": "Pan_de_Muerto_on_altar_d0fc7e20",
    "festivalKey": "day_of_the_dead",
    "festivalLabel": "Día de los Muertos",
    "emoji": "💀",
    "title": "Pan de Muerto on altar",
    "fileName": "Pan_de_Muerto_on_altar_d0fc7e20.webp",
    "url": "/images/bgos/festivals/day_of_the_dead/Pan_de_Muerto_on_altar_d0fc7e20.webp",
    "s3Path": "bgos-business-images/festivals/day_of_the_dead/Pan_de_Muerto_on_altar_d0fc7e20.webp",
    "tags": [
      "day_of_the_dead",
      "día de los muertos",
      "pan",
      "muerto",
      "altar"
    ]
  },
  {
    "id": "Sugar_skull_with_marigolds_c676a419",
    "festivalKey": "day_of_the_dead",
    "festivalLabel": "Día de los Muertos",
    "emoji": "💀",
    "title": "Sugar skull with marigolds",
    "fileName": "Sugar_skull_with_marigolds_c676a419.webp",
    "url": "/images/bgos/festivals/day_of_the_dead/Sugar_skull_with_marigolds_c676a419.webp",
    "s3Path": "bgos-business-images/festivals/day_of_the_dead/Sugar_skull_with_marigolds_c676a419.webp",
    "tags": [
      "day_of_the_dead",
      "día de los muertos",
      "sugar",
      "skull",
      "with",
      "marigolds"
    ]
  },
  {
    "id": "Sugar_skulls_decorated_with_mari…_fbd27af7",
    "festivalKey": "day_of_the_dead",
    "festivalLabel": "Día de los Muertos",
    "emoji": "💀",
    "title": "Sugar skulls decorated with mari…",
    "fileName": "Sugar_skulls_decorated_with_mari…_fbd27af7.webp",
    "url": "/images/bgos/festivals/day_of_the_dead/Sugar_skulls_decorated_with_mari…_fbd27af7.webp",
    "s3Path": "bgos-business-images/festivals/day_of_the_dead/Sugar_skulls_decorated_with_mari…_fbd27af7.webp",
    "tags": [
      "day_of_the_dead",
      "día de los muertos",
      "sugar",
      "skulls",
      "decorated",
      "with",
      "mari…"
    ]
  },
  {
    "id": "Clay_oil_lamps_on_balcony_6c4c0407",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Clay oil lamps on balcony",
    "fileName": "Clay_oil_lamps_on_balcony_6c4c0407.webp",
    "url": "/images/bgos/festivals/diwali/Clay_oil_lamps_on_balcony_6c4c0407.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Clay_oil_lamps_on_balcony_6c4c0407.webp",
    "tags": [
      "diwali",
      "clay",
      "oil",
      "lamps",
      "balcony"
    ]
  },
  {
    "id": "Diwali_Lakshmi_Puja_thali_items_59163f01",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Diwali Lakshmi Puja thali items",
    "fileName": "Diwali_Lakshmi_Puja_thali_items_59163f01.webp",
    "url": "/images/bgos/festivals/diwali/Diwali_Lakshmi_Puja_thali_items_59163f01.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Diwali_Lakshmi_Puja_thali_items_59163f01.webp",
    "tags": [
      "diwali",
      "lakshmi",
      "puja",
      "thali",
      "items"
    ]
  },
  {
    "id": "Diwali_festival_celebration_with…_ee2e7be2",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Diwali festival celebration with…",
    "fileName": "Diwali_festival_celebration_with…_ee2e7be2.webp",
    "url": "/images/bgos/festivals/diwali/Diwali_festival_celebration_with…_ee2e7be2.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Diwali_festival_celebration_with…_ee2e7be2.webp",
    "tags": [
      "diwali",
      "festival",
      "celebration",
      "with…"
    ]
  },
  {
    "id": "Diwali_sweets_platter_on_thali_12c3a62c",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Diwali sweets platter on thali",
    "fileName": "Diwali_sweets_platter_on_thali_12c3a62c.webp",
    "url": "/images/bgos/festivals/diwali/Diwali_sweets_platter_on_thali_12c3a62c.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Diwali_sweets_platter_on_thali_12c3a62c.webp",
    "tags": [
      "diwali",
      "sweets",
      "platter",
      "thali"
    ]
  },
  {
    "id": "Diwali_toran_hanging_above_doorway_3dfcc42f",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Diwali toran hanging above doorway",
    "fileName": "Diwali_toran_hanging_above_doorway_3dfcc42f.webp",
    "url": "/images/bgos/festivals/diwali/Diwali_toran_hanging_above_doorway_3dfcc42f.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Diwali_toran_hanging_above_doorway_3dfcc42f.webp",
    "tags": [
      "diwali",
      "toran",
      "hanging",
      "above",
      "doorway"
    ]
  },
  {
    "id": "Holding_sparklers_during_Diwali_…_a2f1ce94",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Holding sparklers during Diwali …",
    "fileName": "Holding_sparklers_during_Diwali_…_a2f1ce94.webp",
    "url": "/images/bgos/festivals/diwali/Holding_sparklers_during_Diwali_…_a2f1ce94.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Holding_sparklers_during_Diwali_…_a2f1ce94.webp",
    "tags": [
      "diwali",
      "holding",
      "sparklers",
      "during"
    ]
  },
  {
    "id": "Marigold_flower_rangoli_with_diyas_4150df48",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Marigold flower rangoli with diyas",
    "fileName": "Marigold_flower_rangoli_with_diyas_4150df48.webp",
    "url": "/images/bgos/festivals/diwali/Marigold_flower_rangoli_with_diyas_4150df48.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Marigold_flower_rangoli_with_diyas_4150df48.webp",
    "tags": [
      "diwali",
      "marigold",
      "flower",
      "rangoli",
      "with",
      "diyas"
    ]
  },
  {
    "id": "Marigold_path_with_flickering_ca…_63aeed76",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Marigold path with flickering ca…",
    "fileName": "Marigold_path_with_flickering_ca…_63aeed76.webp",
    "url": "/images/bgos/festivals/diwali/Marigold_path_with_flickering_ca…_63aeed76.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Marigold_path_with_flickering_ca…_63aeed76.webp",
    "tags": [
      "diwali",
      "marigold",
      "path",
      "with",
      "flickering",
      "ca…"
    ]
  },
  {
    "id": "Priest_holding_brass_oil_lamp_b6e785ed",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Priest holding brass oil lamp",
    "fileName": "Priest_holding_brass_oil_lamp_b6e785ed.webp",
    "url": "/images/bgos/festivals/diwali/Priest_holding_brass_oil_lamp_b6e785ed.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Priest_holding_brass_oil_lamp_b6e785ed.webp",
    "tags": [
      "diwali",
      "priest",
      "holding",
      "brass",
      "oil",
      "lamp"
    ]
  },
  {
    "id": "Sparkler_light_trails_Diwali_57cde7e7",
    "festivalKey": "diwali",
    "festivalLabel": "Diwali",
    "emoji": "🪔",
    "title": "Sparkler light trails Diwali",
    "fileName": "Sparkler_light_trails_Diwali_57cde7e7.webp",
    "url": "/images/bgos/festivals/diwali/Sparkler_light_trails_Diwali_57cde7e7.webp",
    "s3Path": "bgos-business-images/festivals/diwali/Sparkler_light_trails_Diwali_57cde7e7.webp",
    "tags": [
      "diwali",
      "sparkler",
      "light",
      "trails"
    ]
  },
  {
    "id": "Dhaki_playing_decorated_drum_b200a87a",
    "festivalKey": "durga_puja",
    "festivalLabel": "Durga Puja",
    "emoji": "🔱",
    "title": "Dhaki playing decorated drum",
    "fileName": "Dhaki_playing_decorated_drum_b200a87a.webp",
    "url": "/images/bgos/festivals/durga_puja/Dhaki_playing_decorated_drum_b200a87a.webp",
    "s3Path": "bgos-business-images/festivals/durga_puja/Dhaki_playing_decorated_drum_b200a87a.webp",
    "tags": [
      "durga_puja",
      "durga puja",
      "dhaki",
      "playing",
      "decorated",
      "drum"
    ]
  },
  {
    "id": "Durga_Puja_incense_smoke_dance_ab467052",
    "festivalKey": "durga_puja",
    "festivalLabel": "Durga Puja",
    "emoji": "🔱",
    "title": "Durga Puja incense smoke dance",
    "fileName": "Durga_Puja_incense_smoke_dance_ab467052.webp",
    "url": "/images/bgos/festivals/durga_puja/Durga_Puja_incense_smoke_dance_ab467052.webp",
    "s3Path": "bgos-business-images/festivals/durga_puja/Durga_Puja_incense_smoke_dance_ab467052.webp",
    "tags": [
      "durga_puja",
      "durga puja",
      "durga",
      "puja",
      "incense",
      "smoke",
      "dance"
    ]
  },
  {
    "id": "Goddess_Durga_idol_in_pandal_edcfc519",
    "festivalKey": "durga_puja",
    "festivalLabel": "Durga Puja",
    "emoji": "🔱",
    "title": "Goddess Durga idol in pandal",
    "fileName": "Goddess_Durga_idol_in_pandal_edcfc519.webp",
    "url": "/images/bgos/festivals/durga_puja/Goddess_Durga_idol_in_pandal_edcfc519.webp",
    "s3Path": "bgos-business-images/festivals/durga_puja/Goddess_Durga_idol_in_pandal_edcfc519.webp",
    "tags": [
      "durga_puja",
      "durga puja",
      "goddess",
      "durga",
      "idol",
      "pandal"
    ]
  },
  {
    "id": "Goddess_Jagaddhatri_idol_in_pandal_9aed2435",
    "festivalKey": "durga_puja",
    "festivalLabel": "Durga Puja",
    "emoji": "🔱",
    "title": "Goddess Jagaddhatri idol in pandal",
    "fileName": "Goddess_Jagaddhatri_idol_in_pandal_9aed2435.webp",
    "url": "/images/bgos/festivals/durga_puja/Goddess_Jagaddhatri_idol_in_pandal_9aed2435.webp",
    "s3Path": "bgos-business-images/festivals/durga_puja/Goddess_Jagaddhatri_idol_in_pandal_9aed2435.webp",
    "tags": [
      "durga_puja",
      "durga puja",
      "goddess",
      "jagaddhatri",
      "idol",
      "pandal"
    ]
  },
  {
    "id": "Incense_smoke_rising_from_dhunuchi_97998adc",
    "festivalKey": "durga_puja",
    "festivalLabel": "Durga Puja",
    "emoji": "🔱",
    "title": "Incense smoke rising from dhunuchi",
    "fileName": "Incense_smoke_rising_from_dhunuchi_97998adc.webp",
    "url": "/images/bgos/festivals/durga_puja/Incense_smoke_rising_from_dhunuchi_97998adc.webp",
    "s3Path": "bgos-business-images/festivals/durga_puja/Incense_smoke_rising_from_dhunuchi_97998adc.webp",
    "tags": [
      "durga_puja",
      "durga puja",
      "incense",
      "smoke",
      "rising",
      "from",
      "dhunuchi"
    ]
  },
  {
    "id": "Playing_Durga_Puja_aarti_instrum…_4a8157cf",
    "festivalKey": "durga_puja",
    "festivalLabel": "Durga Puja",
    "emoji": "🔱",
    "title": "Playing Durga Puja aarti instrum…",
    "fileName": "Playing_Durga_Puja_aarti_instrum…_4a8157cf.webp",
    "url": "/images/bgos/festivals/durga_puja/Playing_Durga_Puja_aarti_instrum…_4a8157cf.webp",
    "s3Path": "bgos-business-images/festivals/durga_puja/Playing_Durga_Puja_aarti_instrum…_4a8157cf.webp",
    "tags": [
      "durga_puja",
      "durga puja",
      "playing",
      "durga",
      "puja",
      "aarti",
      "instrum…"
    ]
  },
  {
    "id": "Family_gathering_for_Eid_festival_53ab509a",
    "festivalKey": "eid",
    "festivalLabel": "Eid al-Fitr",
    "emoji": "🌙",
    "title": "Family gathering for Eid festival",
    "fileName": "Family_gathering_for_Eid_festival_53ab509a.webp",
    "url": "/images/bgos/festivals/eid/Family_gathering_for_Eid_festival_53ab509a.webp",
    "s3Path": "bgos-business-images/festivals/eid/Family_gathering_for_Eid_festival_53ab509a.webp",
    "tags": [
      "eid",
      "eid al-fitr",
      "family",
      "gathering",
      "for",
      "festival"
    ]
  },
  {
    "id": "Illuminated_mosque_under_starry_…_876a5e57",
    "festivalKey": "eid",
    "festivalLabel": "Eid al-Fitr",
    "emoji": "🌙",
    "title": "Illuminated mosque under starry …",
    "fileName": "Illuminated_mosque_under_starry_…_876a5e57.webp",
    "url": "/images/bgos/festivals/eid/Illuminated_mosque_under_starry_…_876a5e57.webp",
    "s3Path": "bgos-business-images/festivals/eid/Illuminated_mosque_under_starry_…_876a5e57.webp",
    "tags": [
      "eid",
      "eid al-fitr",
      "illuminated",
      "mosque",
      "under",
      "starry"
    ]
  },
  {
    "id": "Crowd_performing_immersion_ritua…_12c04700",
    "festivalKey": "ganesh_chaturthi",
    "festivalLabel": "Ganesh Chaturthi",
    "emoji": "🌼",
    "title": "Crowd performing immersion ritua…",
    "fileName": "Crowd_performing_immersion_ritua…_12c04700.webp",
    "url": "/images/bgos/festivals/ganesh_chaturthi/Crowd_performing_immersion_ritua…_12c04700.webp",
    "s3Path": "bgos-business-images/festivals/ganesh_chaturthi/Crowd_performing_immersion_ritua…_12c04700.webp",
    "tags": [
      "ganesh_chaturthi",
      "ganesh chaturthi",
      "crowd",
      "performing",
      "immersion",
      "ritua…"
    ]
  },
  {
    "id": "Ganesh_idol_street_procession_bc35eec1",
    "festivalKey": "ganesh_chaturthi",
    "festivalLabel": "Ganesh Chaturthi",
    "emoji": "🌼",
    "title": "Ganesh idol street procession",
    "fileName": "Ganesh_idol_street_procession_bc35eec1.webp",
    "url": "/images/bgos/festivals/ganesh_chaturthi/Ganesh_idol_street_procession_bc35eec1.webp",
    "s3Path": "bgos-business-images/festivals/ganesh_chaturthi/Ganesh_idol_street_procession_bc35eec1.webp",
    "tags": [
      "ganesh_chaturthi",
      "ganesh chaturthi",
      "ganesh",
      "idol",
      "street",
      "procession"
    ]
  },
  {
    "id": "Ganesha_idol_immersed_in_ocean_699320bd",
    "festivalKey": "ganesh_chaturthi",
    "festivalLabel": "Ganesh Chaturthi",
    "emoji": "🌼",
    "title": "Ganesha idol immersed in ocean",
    "fileName": "Ganesha_idol_immersed_in_ocean_699320bd.webp",
    "url": "/images/bgos/festivals/ganesh_chaturthi/Ganesha_idol_immersed_in_ocean_699320bd.webp",
    "s3Path": "bgos-business-images/festivals/ganesh_chaturthi/Ganesha_idol_immersed_in_ocean_699320bd.webp",
    "tags": [
      "ganesh_chaturthi",
      "ganesh chaturthi",
      "ganesha",
      "idol",
      "immersed",
      "ocean"
    ]
  },
  {
    "id": "Ganesha_idol_with_floral_backdrop_1c8d87df",
    "festivalKey": "ganesh_chaturthi",
    "festivalLabel": "Ganesh Chaturthi",
    "emoji": "🌼",
    "title": "Ganesha idol with floral backdrop",
    "fileName": "Ganesha_idol_with_floral_backdrop_1c8d87df.webp",
    "url": "/images/bgos/festivals/ganesh_chaturthi/Ganesha_idol_with_floral_backdrop_1c8d87df.webp",
    "s3Path": "bgos-business-images/festivals/ganesh_chaturthi/Ganesha_idol_with_floral_backdrop_1c8d87df.webp",
    "tags": [
      "ganesh_chaturthi",
      "ganesh chaturthi",
      "ganesha",
      "idol",
      "with",
      "floral",
      "backdrop"
    ]
  },
  {
    "id": "Modak_sweets_on_banana_leaf_1fbcd2e7",
    "festivalKey": "ganesh_chaturthi",
    "festivalLabel": "Ganesh Chaturthi",
    "emoji": "🌼",
    "title": "Modak sweets on banana leaf",
    "fileName": "Modak_sweets_on_banana_leaf_1fbcd2e7.webp",
    "url": "/images/bgos/festivals/ganesh_chaturthi/Modak_sweets_on_banana_leaf_1fbcd2e7.webp",
    "s3Path": "bgos-business-images/festivals/ganesh_chaturthi/Modak_sweets_on_banana_leaf_1fbcd2e7.webp",
    "tags": [
      "ganesh_chaturthi",
      "ganesh chaturthi",
      "modak",
      "sweets",
      "banana",
      "leaf"
    ]
  },
  {
    "id": "Traditional_steamed_modak_sweets…_50a7752b",
    "festivalKey": "ganesh_chaturthi",
    "festivalLabel": "Ganesh Chaturthi",
    "emoji": "🌼",
    "title": "Traditional steamed modak sweets…",
    "fileName": "Traditional_steamed_modak_sweets…_50a7752b.webp",
    "url": "/images/bgos/festivals/ganesh_chaturthi/Traditional_steamed_modak_sweets…_50a7752b.webp",
    "s3Path": "bgos-business-images/festivals/ganesh_chaturthi/Traditional_steamed_modak_sweets…_50a7752b.webp",
    "tags": [
      "ganesh_chaturthi",
      "ganesh chaturthi",
      "traditional",
      "steamed",
      "modak",
      "sweets…"
    ]
  },
  {
    "id": "Halloween_porch_with_carved_jack…_0a7ebfbb",
    "festivalKey": "halloween",
    "festivalLabel": "Halloween",
    "emoji": "🎃",
    "title": "Halloween porch with carved jack…",
    "fileName": "Halloween_porch_with_carved_jack…_0a7ebfbb.webp",
    "url": "/images/bgos/festivals/halloween/Halloween_porch_with_carved_jack…_0a7ebfbb.webp",
    "s3Path": "bgos-business-images/festivals/halloween/Halloween_porch_with_carved_jack…_0a7ebfbb.webp",
    "tags": [
      "halloween",
      "porch",
      "with",
      "carved",
      "jack…"
    ]
  },
  {
    "id": "Chaniya_choli_skirt_swirling_b906a92f",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Chaniya choli skirt swirling",
    "fileName": "Chaniya_choli_skirt_swirling_b906a92f.webp",
    "url": "/images/bgos/festivals/holi/Chaniya_choli_skirt_swirling_b906a92f.webp",
    "s3Path": "bgos-business-images/festivals/holi/Chaniya_choli_skirt_swirling_b906a92f.webp",
    "tags": [
      "holi",
      "chaniya",
      "choli",
      "skirt",
      "swirling"
    ]
  },
  {
    "id": "Cheerful_face_dusted_with_powder_79d2f658",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Cheerful face dusted with powder",
    "fileName": "Cheerful_face_dusted_with_powder_79d2f658.webp",
    "url": "/images/bgos/festivals/holi/Cheerful_face_dusted_with_powder_79d2f658.webp",
    "s3Path": "bgos-business-images/festivals/holi/Cheerful_face_dusted_with_powder_79d2f658.webp",
    "tags": [
      "holi",
      "cheerful",
      "face",
      "dusted",
      "with",
      "powder"
    ]
  },
  {
    "id": "Color_powder_in_brass_bowls_0b9d5e31",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Color powder in brass bowls",
    "fileName": "Color_powder_in_brass_bowls_0b9d5e31.webp",
    "url": "/images/bgos/festivals/holi/Color_powder_in_brass_bowls_0b9d5e31.webp",
    "s3Path": "bgos-business-images/festivals/holi/Color_powder_in_brass_bowls_0b9d5e31.webp",
    "tags": [
      "holi",
      "color",
      "powder",
      "brass",
      "bowls"
    ]
  },
  {
    "id": "Dancers_swirling_in_color_powder_3d18c741",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Dancers swirling in color powder",
    "fileName": "Dancers_swirling_in_color_powder_3d18c741.webp",
    "url": "/images/bgos/festivals/holi/Dancers_swirling_in_color_powder_3d18c741.webp",
    "s3Path": "bgos-business-images/festivals/holi/Dancers_swirling_in_color_powder_3d18c741.webp",
    "tags": [
      "holi",
      "dancers",
      "swirling",
      "color",
      "powder"
    ]
  },
  {
    "id": "Friends_laughing_with_gulal_powder_48815b7d",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Friends laughing with gulal powder",
    "fileName": "Friends_laughing_with_gulal_powder_48815b7d.webp",
    "url": "/images/bgos/festivals/holi/Friends_laughing_with_gulal_powder_48815b7d.webp",
    "s3Path": "bgos-business-images/festivals/holi/Friends_laughing_with_gulal_powder_48815b7d.webp",
    "tags": [
      "holi",
      "friends",
      "laughing",
      "with",
      "gulal",
      "powder"
    ]
  },
  {
    "id": "Hands_coated_in_colorful_powders_57041138",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Hands coated in colorful powders",
    "fileName": "Hands_coated_in_colorful_powders_57041138.webp",
    "url": "/images/bgos/festivals/holi/Hands_coated_in_colorful_powders_57041138.webp",
    "s3Path": "bgos-business-images/festivals/holi/Hands_coated_in_colorful_powders_57041138.webp",
    "tags": [
      "holi",
      "hands",
      "coated",
      "colorful",
      "powders"
    ]
  },
  {
    "id": "Hands_throwing_colorful_powder_9e361fe4",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Hands throwing colorful powder",
    "fileName": "Hands_throwing_colorful_powder_9e361fe4.webp",
    "url": "/images/bgos/festivals/holi/Hands_throwing_colorful_powder_9e361fe4.webp",
    "s3Path": "bgos-business-images/festivals/holi/Hands_throwing_colorful_powder_9e361fe4.webp",
    "tags": [
      "holi",
      "hands",
      "throwing",
      "colorful",
      "powder"
    ]
  },
  {
    "id": "Holi_festival_powder_celebration_82503e61",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Holi festival powder celebration",
    "fileName": "Holi_festival_powder_celebration_82503e61.webp",
    "url": "/images/bgos/festivals/holi/Holi_festival_powder_celebration_82503e61.webp",
    "s3Path": "bgos-business-images/festivals/holi/Holi_festival_powder_celebration_82503e61.webp",
    "tags": [
      "holi",
      "festival",
      "powder",
      "celebration"
    ]
  },
  {
    "id": "Multicolor_powder_explosion_in_air_95441ca7",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Multicolor powder explosion in air",
    "fileName": "Multicolor_powder_explosion_in_air_95441ca7.webp",
    "url": "/images/bgos/festivals/holi/Multicolor_powder_explosion_in_air_95441ca7.webp",
    "s3Path": "bgos-business-images/festivals/holi/Multicolor_powder_explosion_in_air_95441ca7.webp",
    "tags": [
      "holi",
      "multicolor",
      "powder",
      "explosion",
      "air"
    ]
  },
  {
    "id": "Water_balloon_bursting_magenta_dye_2830d7f6",
    "festivalKey": "holi",
    "festivalLabel": "Holi",
    "emoji": "🎨",
    "title": "Water balloon bursting magenta dye",
    "fileName": "Water_balloon_bursting_magenta_dye_2830d7f6.webp",
    "url": "/images/bgos/festivals/holi/Water_balloon_bursting_magenta_dye_2830d7f6.webp",
    "s3Path": "bgos-business-images/festivals/holi/Water_balloon_bursting_magenta_dye_2830d7f6.webp",
    "tags": [
      "holi",
      "water",
      "balloon",
      "bursting",
      "magenta",
      "dye"
    ]
  },
  {
    "id": "Candle_flame_burning_on_water_01533dee",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Candle flame burning on water",
    "fileName": "Candle_flame_burning_on_water_01533dee.webp",
    "url": "/images/bgos/festivals/lantern_festival/Candle_flame_burning_on_water_01533dee.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Candle_flame_burning_on_water_01533dee.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "candle",
      "flame",
      "burning",
      "water"
    ]
  },
  {
    "id": "Candle_flame_on_river_float_75edbaca",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Candle flame on river float",
    "fileName": "Candle_flame_on_river_float_75edbaca.webp",
    "url": "/images/bgos/festivals/lantern_festival/Candle_flame_on_river_float_75edbaca.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Candle_flame_on_river_float_75edbaca.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "candle",
      "flame",
      "river",
      "float"
    ]
  },
  {
    "id": "Couple_launching_sky_lantern_57a33287",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Couple launching sky lantern",
    "fileName": "Couple_launching_sky_lantern_57a33287.webp",
    "url": "/images/bgos/festivals/lantern_festival/Couple_launching_sky_lantern_57a33287.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Couple_launching_sky_lantern_57a33287.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "couple",
      "launching",
      "sky",
      "lantern"
    ]
  },
  {
    "id": "Floating_lanterns_on_water_fc757648",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Floating lanterns on water",
    "fileName": "Floating_lanterns_on_water_fc757648.webp",
    "url": "/images/bgos/festivals/lantern_festival/Floating_lanterns_on_water_fc757648.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Floating_lanterns_on_water_fc757648.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "floating",
      "lanterns",
      "water"
    ]
  },
  {
    "id": "Glowing_lotus_basket_on_water_dbe9de69",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Glowing lotus basket on water",
    "fileName": "Glowing_lotus_basket_on_water_dbe9de69.webp",
    "url": "/images/bgos/festivals/lantern_festival/Glowing_lotus_basket_on_water_dbe9de69.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Glowing_lotus_basket_on_water_dbe9de69.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "glowing",
      "lotus",
      "basket",
      "water"
    ]
  },
  {
    "id": "Golden_lotus_lanterns_floating_r…_bfe73c58",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Golden lotus lanterns floating r…",
    "fileName": "Golden_lotus_lanterns_floating_r…_bfe73c58.webp",
    "url": "/images/bgos/festivals/lantern_festival/Golden_lotus_lanterns_floating_r…_bfe73c58.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Golden_lotus_lanterns_floating_r…_bfe73c58.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "golden",
      "lotus",
      "lanterns",
      "floating"
    ]
  },
  {
    "id": "Golden_sky_lanterns_floating_nig…_146c0d5d",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Golden sky lanterns floating nig…",
    "fileName": "Golden_sky_lanterns_floating_nig…_146c0d5d.webp",
    "url": "/images/bgos/festivals/lantern_festival/Golden_sky_lanterns_floating_nig…_146c0d5d.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Golden_sky_lanterns_floating_nig…_146c0d5d.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "golden",
      "sky",
      "lanterns",
      "floating",
      "nig…"
    ]
  },
  {
    "id": "Hands_holding_sky_lantern_55597194",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Hands holding sky lantern",
    "fileName": "Hands_holding_sky_lantern_55597194.webp",
    "url": "/images/bgos/festivals/lantern_festival/Hands_holding_sky_lantern_55597194.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Hands_holding_sky_lantern_55597194.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "hands",
      "holding",
      "sky",
      "lantern"
    ]
  },
  {
    "id": "Hands_releasing_glowing_sky_lantern_3bca6c80",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Hands releasing glowing sky lantern",
    "fileName": "Hands_releasing_glowing_sky_lantern_3bca6c80.webp",
    "url": "/images/bgos/festivals/lantern_festival/Hands_releasing_glowing_sky_lantern_3bca6c80.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Hands_releasing_glowing_sky_lantern_3bca6c80.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "hands",
      "releasing",
      "glowing",
      "sky",
      "lantern"
    ]
  },
  {
    "id": "Ice_lantern_glowing_with_lights_cb6691dd",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Ice lantern glowing with lights",
    "fileName": "Ice_lantern_glowing_with_lights_cb6691dd.webp",
    "url": "/images/bgos/festivals/lantern_festival/Ice_lantern_glowing_with_lights_cb6691dd.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Ice_lantern_glowing_with_lights_cb6691dd.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "ice",
      "lantern",
      "glowing",
      "with",
      "lights"
    ]
  },
  {
    "id": "Jack-o-lanterns_at_pumpkin_patch_51fc1046",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Jack o lanterns at pumpkin patch",
    "fileName": "Jack-o-lanterns_at_pumpkin_patch_51fc1046.webp",
    "url": "/images/bgos/festivals/lantern_festival/Jack-o-lanterns_at_pumpkin_patch_51fc1046.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Jack-o-lanterns_at_pumpkin_patch_51fc1046.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "jack",
      "lanterns",
      "pumpkin",
      "patch"
    ]
  },
  {
    "id": "Krathong_floating_on_dark_water_773899cd",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Krathong floating on dark water",
    "fileName": "Krathong_floating_on_dark_water_773899cd.webp",
    "url": "/images/bgos/festivals/lantern_festival/Krathong_floating_on_dark_water_773899cd.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Krathong_floating_on_dark_water_773899cd.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "krathong",
      "floating",
      "dark",
      "water"
    ]
  },
  {
    "id": "Krathong_floating_on_water_432addaa",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Krathong floating on water",
    "fileName": "Krathong_floating_on_water_432addaa.webp",
    "url": "/images/bgos/festivals/lantern_festival/Krathong_floating_on_water_432addaa.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Krathong_floating_on_water_432addaa.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "krathong",
      "floating",
      "water"
    ]
  },
  {
    "id": "Lantern_reflection_on_lake_water_5a2451c7",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Lantern reflection on lake water",
    "fileName": "Lantern_reflection_on_lake_water_5a2451c7.webp",
    "url": "/images/bgos/festivals/lantern_festival/Lantern_reflection_on_lake_water_5a2451c7.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Lantern_reflection_on_lake_water_5a2451c7.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "lantern",
      "reflection",
      "lake",
      "water"
    ]
  },
  {
    "id": "Lanterns_filling_night_sky_8abc27e3",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Lanterns filling night sky",
    "fileName": "Lanterns_filling_night_sky_8abc27e3.webp",
    "url": "/images/bgos/festivals/lantern_festival/Lanterns_filling_night_sky_8abc27e3.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Lanterns_filling_night_sky_8abc27e3.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "lanterns",
      "filling",
      "night",
      "sky"
    ]
  },
  {
    "id": "Lanterns_floating_on_river_748ec8ba",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Lanterns floating on river",
    "fileName": "Lanterns_floating_on_river_748ec8ba.webp",
    "url": "/images/bgos/festivals/lantern_festival/Lanterns_floating_on_river_748ec8ba.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Lanterns_floating_on_river_748ec8ba.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "lanterns",
      "floating",
      "river"
    ]
  },
  {
    "id": "Lanterns_floating_over_lake_6fb56ae1",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Lanterns floating over lake",
    "fileName": "Lanterns_floating_over_lake_6fb56ae1.webp",
    "url": "/images/bgos/festivals/lantern_festival/Lanterns_floating_over_lake_6fb56ae1.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Lanterns_floating_over_lake_6fb56ae1.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "lanterns",
      "floating",
      "over",
      "lake"
    ]
  },
  {
    "id": "Mooncake_pastry_crust_pattern_cl…_a8d31f21",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Mooncake pastry crust pattern cl…",
    "fileName": "Mooncake_pastry_crust_pattern_cl…_a8d31f21.webp",
    "url": "/images/bgos/festivals/lantern_festival/Mooncake_pastry_crust_pattern_cl…_a8d31f21.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Mooncake_pastry_crust_pattern_cl…_a8d31f21.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "mooncake",
      "pastry",
      "crust",
      "pattern",
      "cl…"
    ]
  },
  {
    "id": "Mooncakes_under_lanterns_and_moon_3a84f051",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Mooncakes under lanterns and moon",
    "fileName": "Mooncakes_under_lanterns_and_moon_3a84f051.webp",
    "url": "/images/bgos/festivals/lantern_festival/Mooncakes_under_lanterns_and_moon_3a84f051.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Mooncakes_under_lanterns_and_moon_3a84f051.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "mooncakes",
      "under",
      "lanterns",
      "and",
      "moon"
    ]
  },
  {
    "id": "Paper_lanterns_drifting_toward_m…_3663cdee",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Paper lanterns drifting toward m…",
    "fileName": "Paper_lanterns_drifting_toward_m…_3663cdee.webp",
    "url": "/images/bgos/festivals/lantern_festival/Paper_lanterns_drifting_toward_m…_3663cdee.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Paper_lanterns_drifting_toward_m…_3663cdee.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "paper",
      "lanterns",
      "drifting",
      "toward"
    ]
  },
  {
    "id": "Releasing_lotus_basket_on_water_af68c717",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Releasing lotus basket on water",
    "fileName": "Releasing_lotus_basket_on_water_af68c717.webp",
    "url": "/images/bgos/festivals/lantern_festival/Releasing_lotus_basket_on_water_af68c717.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Releasing_lotus_basket_on_water_af68c717.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "releasing",
      "lotus",
      "basket",
      "water"
    ]
  },
  {
    "id": "Serving_mooncakes_with_hot_tea_f871ce66",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Serving mooncakes with hot tea",
    "fileName": "Serving_mooncakes_with_hot_tea_f871ce66.webp",
    "url": "/images/bgos/festivals/lantern_festival/Serving_mooncakes_with_hot_tea_f871ce66.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Serving_mooncakes_with_hot_tea_f871ce66.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "serving",
      "mooncakes",
      "with",
      "hot",
      "tea"
    ]
  },
  {
    "id": "Sky_lantern_floating_on_river_6b56309e",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Sky lantern floating on river",
    "fileName": "Sky_lantern_floating_on_river_6b56309e.webp",
    "url": "/images/bgos/festivals/lantern_festival/Sky_lantern_floating_on_river_6b56309e.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Sky_lantern_floating_on_river_6b56309e.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "sky",
      "lantern",
      "floating",
      "river"
    ]
  },
  {
    "id": "Sky_lanterns_filling_night_sky_c1b48d7d",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Sky lanterns filling night sky",
    "fileName": "Sky_lanterns_filling_night_sky_c1b48d7d.webp",
    "url": "/images/bgos/festivals/lantern_festival/Sky_lanterns_filling_night_sky_c1b48d7d.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Sky_lanterns_filling_night_sky_c1b48d7d.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "sky",
      "lanterns",
      "filling",
      "night"
    ]
  },
  {
    "id": "Sky_lanterns_over_lake_4613bbde",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Sky lanterns over lake",
    "fileName": "Sky_lanterns_over_lake_4613bbde.webp",
    "url": "/images/bgos/festivals/lantern_festival/Sky_lanterns_over_lake_4613bbde.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Sky_lanterns_over_lake_4613bbde.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "sky",
      "lanterns",
      "over",
      "lake"
    ]
  },
  {
    "id": "Sky_lanterns_released_over_pagoda_721244b7",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Sky lanterns released over pagoda",
    "fileName": "Sky_lanterns_released_over_pagoda_721244b7.webp",
    "url": "/images/bgos/festivals/lantern_festival/Sky_lanterns_released_over_pagoda_721244b7.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Sky_lanterns_released_over_pagoda_721244b7.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "sky",
      "lanterns",
      "released",
      "over",
      "pagoda"
    ]
  },
  {
    "id": "Sliced_mooncake_with_yolk_filling_7013146a",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Sliced mooncake with yolk filling",
    "fileName": "Sliced_mooncake_with_yolk_filling_7013146a.webp",
    "url": "/images/bgos/festivals/lantern_festival/Sliced_mooncake_with_yolk_filling_7013146a.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Sliced_mooncake_with_yolk_filling_7013146a.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "sliced",
      "mooncake",
      "with",
      "yolk",
      "filling"
    ]
  },
  {
    "id": "Tea_and_mooncake_on_tray_9b025cbf",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Tea and mooncake on tray",
    "fileName": "Tea_and_mooncake_on_tray_9b025cbf.webp",
    "url": "/images/bgos/festivals/lantern_festival/Tea_and_mooncake_on_tray_9b025cbf.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Tea_and_mooncake_on_tray_9b025cbf.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "tea",
      "and",
      "mooncake",
      "tray"
    ]
  },
  {
    "id": "Teapot_and_teacup_with_moon_99bb637d",
    "festivalKey": "lantern_festival",
    "festivalLabel": "Sky Lanterns & Mooncake",
    "emoji": "🏮",
    "title": "Teapot and teacup with moon",
    "fileName": "Teapot_and_teacup_with_moon_99bb637d.webp",
    "url": "/images/bgos/festivals/lantern_festival/Teapot_and_teacup_with_moon_99bb637d.webp",
    "s3Path": "bgos-business-images/festivals/lantern_festival/Teapot_and_teacup_with_moon_99bb637d.webp",
    "tags": [
      "lantern_festival",
      "sky lanterns & mooncake",
      "teapot",
      "and",
      "teacup",
      "with",
      "moon"
    ]
  },
  {
    "id": "Kites_filling_sky_in_Ahmedabad_d7cd5116",
    "festivalKey": "makar_sankranti",
    "festivalLabel": "Makar Sankranti",
    "emoji": "🪁",
    "title": "Kites filling sky in Ahmedabad",
    "fileName": "Kites_filling_sky_in_Ahmedabad_d7cd5116.webp",
    "url": "/images/bgos/festivals/makar_sankranti/Kites_filling_sky_in_Ahmedabad_d7cd5116.webp",
    "s3Path": "bgos-business-images/festivals/makar_sankranti/Kites_filling_sky_in_Ahmedabad_d7cd5116.webp",
    "tags": [
      "makar_sankranti",
      "makar sankranti",
      "kites",
      "filling",
      "sky",
      "ahmedabad"
    ]
  },
  {
    "id": "Carved_wooden_dandiya_sticks_ba673c3f",
    "festivalKey": "navratri",
    "festivalLabel": "Navratri & Garba",
    "emoji": "💃",
    "title": "Carved wooden dandiya sticks",
    "fileName": "Carved_wooden_dandiya_sticks_ba673c3f.webp",
    "url": "/images/bgos/festivals/navratri/Carved_wooden_dandiya_sticks_ba673c3f.webp",
    "s3Path": "bgos-business-images/festivals/navratri/Carved_wooden_dandiya_sticks_ba673c3f.webp",
    "tags": [
      "navratri",
      "navratri & garba",
      "carved",
      "wooden",
      "dandiya",
      "sticks"
    ]
  },
  {
    "id": "Dancers_at_Garba_festival_96fef28e",
    "festivalKey": "navratri",
    "festivalLabel": "Navratri & Garba",
    "emoji": "💃",
    "title": "Dancers at Garba festival",
    "fileName": "Dancers_at_Garba_festival_96fef28e.webp",
    "url": "/images/bgos/festivals/navratri/Dancers_at_Garba_festival_96fef28e.webp",
    "s3Path": "bgos-business-images/festivals/navratri/Dancers_at_Garba_festival_96fef28e.webp",
    "tags": [
      "navratri",
      "navratri & garba",
      "dancers",
      "garba",
      "festival"
    ]
  },
  {
    "id": "Dancers_forming_circular_Garba_p…_ab9c8ee2",
    "festivalKey": "navratri",
    "festivalLabel": "Navratri & Garba",
    "emoji": "💃",
    "title": "Dancers forming circular Garba p…",
    "fileName": "Dancers_forming_circular_Garba_p…_ab9c8ee2.webp",
    "url": "/images/bgos/festivals/navratri/Dancers_forming_circular_Garba_p…_ab9c8ee2.webp",
    "s3Path": "bgos-business-images/festivals/navratri/Dancers_forming_circular_Garba_p…_ab9c8ee2.webp",
    "tags": [
      "navratri",
      "navratri & garba",
      "dancers",
      "forming",
      "circular",
      "garba"
    ]
  },
  {
    "id": "Dancers_performing_Navratri_Garb…_7a65b4f8",
    "festivalKey": "navratri",
    "festivalLabel": "Navratri & Garba",
    "emoji": "💃",
    "title": "Dancers performing Navratri Garb…",
    "fileName": "Dancers_performing_Navratri_Garb…_7a65b4f8.webp",
    "url": "/images/bgos/festivals/navratri/Dancers_performing_Navratri_Garb…_7a65b4f8.webp",
    "s3Path": "bgos-business-images/festivals/navratri/Dancers_performing_Navratri_Garb…_7a65b4f8.webp",
    "tags": [
      "navratri",
      "navratri & garba",
      "dancers",
      "performing",
      "garb…"
    ]
  },
  {
    "id": "Chinese_New_Year_dragon_head_461bb093",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Chinese New Year dragon head",
    "fileName": "Chinese_New_Year_dragon_head_461bb093.webp",
    "url": "/images/bgos/festivals/new_year/Chinese_New_Year_dragon_head_461bb093.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Chinese_New_Year_dragon_head_461bb093.webp",
    "tags": [
      "new_year",
      "new year",
      "chinese",
      "new",
      "year",
      "dragon",
      "head"
    ]
  },
  {
    "id": "Confetti_raining_down_on_celebra…_6326396a",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Confetti raining down on celebra…",
    "fileName": "Confetti_raining_down_on_celebra…_6326396a.webp",
    "url": "/images/bgos/festivals/new_year/Confetti_raining_down_on_celebra…_6326396a.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Confetti_raining_down_on_celebra…_6326396a.webp",
    "tags": [
      "new_year",
      "new year",
      "confetti",
      "raining",
      "down",
      "celebra…"
    ]
  },
  {
    "id": "Fireworks_bursting_over_harbor_w…_3e4a20df",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Fireworks bursting over harbor w…",
    "fileName": "Fireworks_bursting_over_harbor_w…_3e4a20df.webp",
    "url": "/images/bgos/festivals/new_year/Fireworks_bursting_over_harbor_w…_3e4a20df.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Fireworks_bursting_over_harbor_w…_3e4a20df.webp",
    "tags": [
      "new_year",
      "new year",
      "fireworks",
      "bursting",
      "over",
      "harbor"
    ]
  },
  {
    "id": "Fireworks_exploding_above_illumi…_87af977a",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Fireworks exploding above illumi…",
    "fileName": "Fireworks_exploding_above_illumi…_87af977a.webp",
    "url": "/images/bgos/festivals/new_year/Fireworks_exploding_above_illumi…_87af977a.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Fireworks_exploding_above_illumi…_87af977a.webp",
    "tags": [
      "new_year",
      "new year",
      "fireworks",
      "exploding",
      "above",
      "illumi…"
    ]
  },
  {
    "id": "Fireworks_exploding_over_city_sk…_24d771d5",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Fireworks exploding over city sk…",
    "fileName": "Fireworks_exploding_over_city_sk…_24d771d5.webp",
    "url": "/images/bgos/festivals/new_year/Fireworks_exploding_over_city_sk…_24d771d5.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Fireworks_exploding_over_city_sk…_24d771d5.webp",
    "tags": [
      "new_year",
      "new year",
      "fireworks",
      "exploding",
      "over",
      "city",
      "sk…"
    ]
  },
  {
    "id": "Lion_dance_near_firecrackers_0c44335b",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Lion dance near firecrackers",
    "fileName": "Lion_dance_near_firecrackers_0c44335b.webp",
    "url": "/images/bgos/festivals/new_year/Lion_dance_near_firecrackers_0c44335b.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Lion_dance_near_firecrackers_0c44335b.webp",
    "tags": [
      "new_year",
      "new year",
      "lion",
      "dance",
      "near",
      "firecrackers"
    ]
  },
  {
    "id": "Lion_dance_performing_in_parade_26c82116",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Lion dance performing in parade",
    "fileName": "Lion_dance_performing_in_parade_26c82116.webp",
    "url": "/images/bgos/festivals/new_year/Lion_dance_performing_in_parade_26c82116.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Lion_dance_performing_in_parade_26c82116.webp",
    "tags": [
      "new_year",
      "new year",
      "lion",
      "dance",
      "performing",
      "parade"
    ]
  },
  {
    "id": "Lion_dancer_mask_performance_bf4a8dbe",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Lion dancer mask performance",
    "fileName": "Lion_dancer_mask_performance_bf4a8dbe.webp",
    "url": "/images/bgos/festivals/new_year/Lion_dancer_mask_performance_bf4a8dbe.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Lion_dancer_mask_performance_bf4a8dbe.webp",
    "tags": [
      "new_year",
      "new year",
      "lion",
      "dancer",
      "mask",
      "performance"
    ]
  },
  {
    "id": "Mardi_Gras_parade_with_confetti_ba872494",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Mardi Gras parade with confetti",
    "fileName": "Mardi_Gras_parade_with_confetti_ba872494.webp",
    "url": "/images/bgos/festivals/new_year/Mardi_Gras_parade_with_confetti_ba872494.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Mardi_Gras_parade_with_confetti_ba872494.webp",
    "tags": [
      "new_year",
      "new year",
      "mardi",
      "gras",
      "parade",
      "with",
      "confetti"
    ]
  },
  {
    "id": "Red_dragon_dance_parade_ff65f522",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Red dragon dance parade",
    "fileName": "Red_dragon_dance_parade_ff65f522.webp",
    "url": "/images/bgos/festivals/new_year/Red_dragon_dance_parade_ff65f522.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Red_dragon_dance_parade_ff65f522.webp",
    "tags": [
      "new_year",
      "new year",
      "red",
      "dragon",
      "dance",
      "parade"
    ]
  },
  {
    "id": "Red_envelopes_with_oranges_and_879a3392",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Red envelopes with oranges and",
    "fileName": "Red_envelopes_with_oranges_and_879a3392.webp",
    "url": "/images/bgos/festivals/new_year/Red_envelopes_with_oranges_and_879a3392.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Red_envelopes_with_oranges_and_879a3392.webp",
    "tags": [
      "new_year",
      "new year",
      "red",
      "envelopes",
      "with",
      "oranges",
      "and"
    ]
  },
  {
    "id": "Red_firecrackers_hanging_for_fes…_2f160f57",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Red firecrackers hanging for fes…",
    "fileName": "Red_firecrackers_hanging_for_fes…_2f160f57.webp",
    "url": "/images/bgos/festivals/new_year/Red_firecrackers_hanging_for_fes…_2f160f57.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Red_firecrackers_hanging_for_fes…_2f160f57.webp",
    "tags": [
      "new_year",
      "new year",
      "red",
      "firecrackers",
      "hanging",
      "for",
      "fes…"
    ]
  },
  {
    "id": "Red_lanterns_hanging_on_street_3b204c36",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Red lanterns hanging on street",
    "fileName": "Red_lanterns_hanging_on_street_3b204c36.webp",
    "url": "/images/bgos/festivals/new_year/Red_lanterns_hanging_on_street_3b204c36.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Red_lanterns_hanging_on_street_3b204c36.webp",
    "tags": [
      "new_year",
      "new year",
      "red",
      "lanterns",
      "hanging",
      "street"
    ]
  },
  {
    "id": "Ship_sailing_with_fireworks_34c04fd3",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Ship sailing with fireworks",
    "fileName": "Ship_sailing_with_fireworks_34c04fd3.webp",
    "url": "/images/bgos/festivals/new_year/Ship_sailing_with_fireworks_34c04fd3.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Ship_sailing_with_fireworks_34c04fd3.webp",
    "tags": [
      "new_year",
      "new year",
      "ship",
      "sailing",
      "with",
      "fireworks"
    ]
  },
  {
    "id": "Traditional_new_year_feast_served_1cd1114e",
    "festivalKey": "new_year",
    "festivalLabel": "New Year",
    "emoji": "🎊",
    "title": "Traditional new year feast served",
    "fileName": "Traditional_new_year_feast_served_1cd1114e.webp",
    "url": "/images/bgos/festivals/new_year/Traditional_new_year_feast_served_1cd1114e.webp",
    "s3Path": "bgos-business-images/festivals/new_year/Traditional_new_year_feast_served_1cd1114e.webp",
    "tags": [
      "new_year",
      "new year",
      "traditional",
      "new",
      "year",
      "feast",
      "served"
    ]
  },
  {
    "id": "Bavarian_beer_garden_with_pretzels_b1c95f17",
    "festivalKey": "oktoberfest",
    "festivalLabel": "Oktoberfest",
    "emoji": "🥨",
    "title": "Bavarian beer garden with pretzels",
    "fileName": "Bavarian_beer_garden_with_pretzels_b1c95f17.webp",
    "url": "/images/bgos/festivals/oktoberfest/Bavarian_beer_garden_with_pretzels_b1c95f17.webp",
    "s3Path": "bgos-business-images/festivals/oktoberfest/Bavarian_beer_garden_with_pretzels_b1c95f17.webp",
    "tags": [
      "oktoberfest",
      "bavarian",
      "beer",
      "garden",
      "with",
      "pretzels"
    ]
  },
  {
    "id": "Bavarian_pretzels_in_basket_4015c0dc",
    "festivalKey": "oktoberfest",
    "festivalLabel": "Oktoberfest",
    "emoji": "🥨",
    "title": "Bavarian pretzels in basket",
    "fileName": "Bavarian_pretzels_in_basket_4015c0dc.webp",
    "url": "/images/bgos/festivals/oktoberfest/Bavarian_pretzels_in_basket_4015c0dc.webp",
    "s3Path": "bgos-business-images/festivals/oktoberfest/Bavarian_pretzels_in_basket_4015c0dc.webp",
    "tags": [
      "oktoberfest",
      "bavarian",
      "pretzels",
      "basket"
    ]
  },
  {
    "id": "Beer_foam_in_glass_stein_5f39e06d",
    "festivalKey": "oktoberfest",
    "festivalLabel": "Oktoberfest",
    "emoji": "🥨",
    "title": "Beer foam in glass stein",
    "fileName": "Beer_foam_in_glass_stein_5f39e06d.webp",
    "url": "/images/bgos/festivals/oktoberfest/Beer_foam_in_glass_stein_5f39e06d.webp",
    "s3Path": "bgos-business-images/festivals/oktoberfest/Beer_foam_in_glass_stein_5f39e06d.webp",
    "tags": [
      "oktoberfest",
      "beer",
      "foam",
      "glass",
      "stein"
    ]
  },
  {
    "id": "Beer_mugs_on_wooden_table_8dd8da8f",
    "festivalKey": "oktoberfest",
    "festivalLabel": "Oktoberfest",
    "emoji": "🥨",
    "title": "Beer mugs on wooden table",
    "fileName": "Beer_mugs_on_wooden_table_8dd8da8f.webp",
    "url": "/images/bgos/festivals/oktoberfest/Beer_mugs_on_wooden_table_8dd8da8f.webp",
    "s3Path": "bgos-business-images/festivals/oktoberfest/Beer_mugs_on_wooden_table_8dd8da8f.webp",
    "tags": [
      "oktoberfest",
      "beer",
      "mugs",
      "wooden",
      "table"
    ]
  },
  {
    "id": "Oktoberfest_celebration_setup_wi…_b9dfd4db",
    "festivalKey": "oktoberfest",
    "festivalLabel": "Oktoberfest",
    "emoji": "🥨",
    "title": "Oktoberfest celebration setup wi…",
    "fileName": "Oktoberfest_celebration_setup_wi…_b9dfd4db.webp",
    "url": "/images/bgos/festivals/oktoberfest/Oktoberfest_celebration_setup_wi…_b9dfd4db.webp",
    "s3Path": "bgos-business-images/festivals/oktoberfest/Oktoberfest_celebration_setup_wi…_b9dfd4db.webp",
    "tags": [
      "oktoberfest",
      "celebration",
      "setup",
      "wi…"
    ]
  },
  {
    "id": "Oktoberfest_feast_platter_with_beer_03b3681c",
    "festivalKey": "oktoberfest",
    "festivalLabel": "Oktoberfest",
    "emoji": "🥨",
    "title": "Oktoberfest feast platter with beer",
    "fileName": "Oktoberfest_feast_platter_with_beer_03b3681c.webp",
    "url": "/images/bgos/festivals/oktoberfest/Oktoberfest_feast_platter_with_beer_03b3681c.webp",
    "s3Path": "bgos-business-images/festivals/oktoberfest/Oktoberfest_feast_platter_with_beer_03b3681c.webp",
    "tags": [
      "oktoberfest",
      "feast",
      "platter",
      "with",
      "beer"
    ]
  },
  {
    "id": "Pretzels_and_beer_on_table_0c586c84",
    "festivalKey": "oktoberfest",
    "festivalLabel": "Oktoberfest",
    "emoji": "🥨",
    "title": "Pretzels and beer on table",
    "fileName": "Pretzels_and_beer_on_table_0c586c84.webp",
    "url": "/images/bgos/festivals/oktoberfest/Pretzels_and_beer_on_table_0c586c84.webp",
    "s3Path": "bgos-business-images/festivals/oktoberfest/Pretzels_and_beer_on_table_0c586c84.webp",
    "tags": [
      "oktoberfest",
      "pretzels",
      "and",
      "beer",
      "table"
    ]
  },
  {
    "id": "Bharatanatyam_dancer_performing_…_ae84718a",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Bharatanatyam dancer performing …",
    "fileName": "Bharatanatyam_dancer_performing_…_ae84718a.webp",
    "url": "/images/bgos/festivals/onam_pongal/Bharatanatyam_dancer_performing_…_ae84718a.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Bharatanatyam_dancer_performing_…_ae84718a.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "bharatanatyam",
      "dancer",
      "performing"
    ]
  },
  {
    "id": "Boat_carrying_deity_idols_floating_09618014",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Boat carrying deity idols floating",
    "fileName": "Boat_carrying_deity_idols_floating_09618014.webp",
    "url": "/images/bgos/festivals/onam_pongal/Boat_carrying_deity_idols_floating_09618014.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Boat_carrying_deity_idols_floating_09618014.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "boat",
      "carrying",
      "deity",
      "idols",
      "floating"
    ]
  },
  {
    "id": "Elephants_with_parasols_edbc3f71",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Elephants with parasols",
    "fileName": "Elephants_with_parasols_edbc3f71.webp",
    "url": "/images/bgos/festivals/onam_pongal/Elephants_with_parasols_edbc3f71.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Elephants_with_parasols_edbc3f71.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "elephants",
      "with",
      "parasols"
    ]
  },
  {
    "id": "Golden_temple_chariot_procession…_65bc65cc",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Golden temple chariot procession…",
    "fileName": "Golden_temple_chariot_procession…_65bc65cc.webp",
    "url": "/images/bgos/festivals/onam_pongal/Golden_temple_chariot_procession…_65bc65cc.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Golden_temple_chariot_procession…_65bc65cc.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "golden",
      "temple",
      "chariot",
      "procession…"
    ]
  },
  {
    "id": "Karnataka_Ugadi_Pachadi_dish_in_5673b404",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Karnataka Ugadi Pachadi dish in",
    "fileName": "Karnataka_Ugadi_Pachadi_dish_in_5673b404.webp",
    "url": "/images/bgos/festivals/onam_pongal/Karnataka_Ugadi_Pachadi_dish_in_5673b404.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Karnataka_Ugadi_Pachadi_dish_in_5673b404.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "karnataka",
      "ugadi",
      "pachadi",
      "dish"
    ]
  },
  {
    "id": "Kerala_Vishu_ritual_tray_setup_ca9195cb",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Kerala Vishu ritual tray setup",
    "fileName": "Kerala_Vishu_ritual_tray_setup_ca9195cb.webp",
    "url": "/images/bgos/festivals/onam_pongal/Kerala_Vishu_ritual_tray_setup_ca9195cb.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Kerala_Vishu_ritual_tray_setup_ca9195cb.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "kerala",
      "vishu",
      "ritual",
      "tray",
      "setup"
    ]
  },
  {
    "id": "Pongal_pot_overflowing_sweet_rice_5f3e64a2",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Pongal pot overflowing sweet rice",
    "fileName": "Pongal_pot_overflowing_sweet_rice_5f3e64a2.webp",
    "url": "/images/bgos/festivals/onam_pongal/Pongal_pot_overflowing_sweet_rice_5f3e64a2.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Pongal_pot_overflowing_sweet_rice_5f3e64a2.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "pongal",
      "pot",
      "overflowing",
      "sweet",
      "rice"
    ]
  },
  {
    "id": "Pookkalam_flower_arrangement_clo…_47ad9684",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Pookkalam flower arrangement clo…",
    "fileName": "Pookkalam_flower_arrangement_clo…_47ad9684.webp",
    "url": "/images/bgos/festivals/onam_pongal/Pookkalam_flower_arrangement_clo…_47ad9684.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Pookkalam_flower_arrangement_clo…_47ad9684.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "pookkalam",
      "flower",
      "arrangement",
      "clo…"
    ]
  },
  {
    "id": "Raising_traditional_Gudi_flag_47b0b494",
    "festivalKey": "onam_pongal",
    "festivalLabel": "Onam & Pongal",
    "emoji": "🌸",
    "title": "Raising traditional Gudi flag",
    "fileName": "Raising_traditional_Gudi_flag_47b0b494.webp",
    "url": "/images/bgos/festivals/onam_pongal/Raising_traditional_Gudi_flag_47b0b494.webp",
    "s3Path": "bgos-business-images/festivals/onam_pongal/Raising_traditional_Gudi_flag_47b0b494.webp",
    "tags": [
      "onam_pongal",
      "onam & pongal",
      "raising",
      "traditional",
      "gudi",
      "flag"
    ]
  },
  {
    "id": "Sister_tying_rakhi_on_brother_8cf6d9d3",
    "festivalKey": "rakhi",
    "festivalLabel": "Raksha Bandhan",
    "emoji": "🧵",
    "title": "Sister tying rakhi on brother",
    "fileName": "Sister_tying_rakhi_on_brother_8cf6d9d3.webp",
    "url": "/images/bgos/festivals/rakhi/Sister_tying_rakhi_on_brother_8cf6d9d3.webp",
    "s3Path": "bgos-business-images/festivals/rakhi/Sister_tying_rakhi_on_brother_8cf6d9d3.webp",
    "tags": [
      "rakhi",
      "raksha bandhan",
      "sister",
      "tying",
      "brother"
    ]
  },
  {
    "id": "Crowds_celebrating_Ram_Navami_Ay…_fd775bd5",
    "festivalKey": "ram_navami",
    "festivalLabel": "Ram Navami",
    "emoji": "🏹",
    "title": "Crowds celebrating Ram Navami Ay…",
    "fileName": "Crowds_celebrating_Ram_Navami_Ay…_fd775bd5.webp",
    "url": "/images/bgos/festivals/ram_navami/Crowds_celebrating_Ram_Navami_Ay…_fd775bd5.webp",
    "s3Path": "bgos-business-images/festivals/ram_navami/Crowds_celebrating_Ram_Navami_Ay…_fd775bd5.webp",
    "tags": [
      "ram_navami",
      "ram navami",
      "crowds",
      "celebrating",
      "ram",
      "navami",
      "ay…"
    ]
  },
  {
    "id": "Ao_Naga_dancers_celebrating_harvest_4cd2a87c",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Ao Naga dancers celebrating harvest",
    "fileName": "Ao_Naga_dancers_celebrating_harvest_4cd2a87c.webp",
    "url": "/images/bgos/festivals/regional_cultural/Ao_Naga_dancers_celebrating_harvest_4cd2a87c.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Ao_Naga_dancers_celebrating_harvest_4cd2a87c.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "naga",
      "dancers",
      "celebrating",
      "harvest"
    ]
  },
  {
    "id": "Bihu_dancers_performing_with_drums_e1c2a7ed",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Bihu dancers performing with drums",
    "fileName": "Bihu_dancers_performing_with_drums_e1c2a7ed.webp",
    "url": "/images/bgos/festivals/regional_cultural/Bihu_dancers_performing_with_drums_e1c2a7ed.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Bihu_dancers_performing_with_drums_e1c2a7ed.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "bihu",
      "dancers",
      "performing",
      "with",
      "drums"
    ]
  },
  {
    "id": "Bodo_women_dancing_traditional_f…_8009447f",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Bodo women dancing traditional f…",
    "fileName": "Bodo_women_dancing_traditional_f…_8009447f.webp",
    "url": "/images/bgos/festivals/regional_cultural/Bodo_women_dancing_traditional_f…_8009447f.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Bodo_women_dancing_traditional_f…_8009447f.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "bodo",
      "women",
      "dancing",
      "traditional"
    ]
  },
  {
    "id": "Camels_standing_on_sand_dunes_bfcf83a9",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Camels standing on sand dunes",
    "fileName": "Camels_standing_on_sand_dunes_bfcf83a9.webp",
    "url": "/images/bgos/festivals/regional_cultural/Camels_standing_on_sand_dunes_bfcf83a9.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Camels_standing_on_sand_dunes_bfcf83a9.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "camels",
      "standing",
      "sand",
      "dunes"
    ]
  },
  {
    "id": "Candles_glowing_on_marigold_altar_26498557",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Candles glowing on marigold altar",
    "fileName": "Candles_glowing_on_marigold_altar_26498557.webp",
    "url": "/images/bgos/festivals/regional_cultural/Candles_glowing_on_marigold_altar_26498557.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Candles_glowing_on_marigold_altar_26498557.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "candles",
      "glowing",
      "marigold",
      "altar"
    ]
  },
  {
    "id": "Carved_wooden_warrior_mask_a439ccae",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Carved wooden warrior mask",
    "fileName": "Carved_wooden_warrior_mask_a439ccae.webp",
    "url": "/images/bgos/festivals/regional_cultural/Carved_wooden_warrior_mask_a439ccae.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Carved_wooden_warrior_mask_a439ccae.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "carved",
      "wooden",
      "warrior",
      "mask"
    ]
  },
  {
    "id": "Chhattisgarh_Maghi_Purnima_at_Rajim_5b9ca921",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Chhattisgarh Maghi Purnima at Rajim",
    "fileName": "Chhattisgarh_Maghi_Purnima_at_Rajim_5b9ca921.webp",
    "url": "/images/bgos/festivals/regional_cultural/Chhattisgarh_Maghi_Purnima_at_Rajim_5b9ca921.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Chhattisgarh_Maghi_Purnima_at_Rajim_5b9ca921.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "chhattisgarh",
      "maghi",
      "purnima",
      "rajim"
    ]
  },
  {
    "id": "Cultural_musical_performance_on_…_9d589507",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Cultural musical performance on …",
    "fileName": "Cultural_musical_performance_on_…_9d589507.webp",
    "url": "/images/bgos/festivals/regional_cultural/Cultural_musical_performance_on_…_9d589507.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Cultural_musical_performance_on_…_9d589507.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "cultural",
      "musical",
      "performance"
    ]
  },
  {
    "id": "Dancer_performing_at_Khajuraho_t…_0d6a8fbb",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancer performing at Khajuraho t…",
    "fileName": "Dancer_performing_at_Khajuraho_t…_0d6a8fbb.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancer_performing_at_Khajuraho_t…_0d6a8fbb.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancer_performing_at_Khajuraho_t…_0d6a8fbb.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancer",
      "performing",
      "khajuraho"
    ]
  },
  {
    "id": "Dancer_performing_mudra_ea13eb79",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancer performing mudra",
    "fileName": "Dancer_performing_mudra_ea13eb79.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancer_performing_mudra_ea13eb79.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancer_performing_mudra_ea13eb79.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancer",
      "performing",
      "mudra"
    ]
  },
  {
    "id": "Dancer_performing_traditional_dh…_df8dedbf",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancer performing traditional dh…",
    "fileName": "Dancer_performing_traditional_dh…_df8dedbf.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancer_performing_traditional_dh…_df8dedbf.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancer_performing_traditional_dh…_df8dedbf.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancer",
      "performing",
      "traditional",
      "dh…"
    ]
  },
  {
    "id": "Dancers_performing_Cham_dance_be899772",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancers performing Cham dance",
    "fileName": "Dancers_performing_Cham_dance_be899772.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancers_performing_Cham_dance_be899772.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancers_performing_Cham_dance_be899772.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancers",
      "performing",
      "cham",
      "dance"
    ]
  },
  {
    "id": "Dancers_performing_Cheraw_bamboo…_a8a9424b",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancers performing Cheraw bamboo…",
    "fileName": "Dancers_performing_Cheraw_bamboo…_a8a9424b.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancers_performing_Cheraw_bamboo…_a8a9424b.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancers_performing_Cheraw_bamboo…_a8a9424b.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancers",
      "performing",
      "cheraw",
      "bamboo…"
    ]
  },
  {
    "id": "Dancers_performing_at_Lokrang_fe…_c19e1b95",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancers performing at Lokrang fe…",
    "fileName": "Dancers_performing_at_Lokrang_fe…_c19e1b95.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancers_performing_at_Lokrang_fe…_c19e1b95.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancers_performing_at_Lokrang_fe…_c19e1b95.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancers",
      "performing",
      "lokrang",
      "fe…"
    ]
  },
  {
    "id": "Dancers_performing_at_palace_71f92455",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancers performing at palace",
    "fileName": "Dancers_performing_at_palace_71f92455.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancers_performing_at_palace_71f92455.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancers_performing_at_palace_71f92455.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancers",
      "performing",
      "palace"
    ]
  },
  {
    "id": "Dancers_wearing_traditional_attire_1522e09a",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Dancers wearing traditional attire",
    "fileName": "Dancers_wearing_traditional_attire_1522e09a.webp",
    "url": "/images/bgos/festivals/regional_cultural/Dancers_wearing_traditional_attire_1522e09a.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Dancers_wearing_traditional_attire_1522e09a.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "dancers",
      "wearing",
      "traditional",
      "attire"
    ]
  },
  {
    "id": "Deccan_festival_performances_at_…_5369ba56",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Deccan festival performances at …",
    "fileName": "Deccan_festival_performances_at_…_5369ba56.webp",
    "url": "/images/bgos/festivals/regional_cultural/Deccan_festival_performances_at_…_5369ba56.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Deccan_festival_performances_at_…_5369ba56.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "deccan",
      "festival",
      "performances"
    ]
  },
  {
    "id": "Devotees_carrying_kavadi_in_proc…_94f65d75",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Devotees carrying kavadi in proc…",
    "fileName": "Devotees_carrying_kavadi_in_proc…_94f65d75.webp",
    "url": "/images/bgos/festivals/regional_cultural/Devotees_carrying_kavadi_in_proc…_94f65d75.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Devotees_carrying_kavadi_in_proc…_94f65d75.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "devotees",
      "carrying",
      "kavadi",
      "proc…"
    ]
  },
  {
    "id": "Embroidery_and_tassels_on_garment_47b97586",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Embroidery and tassels on garment",
    "fileName": "Embroidery_and_tassels_on_garment_47b97586.webp",
    "url": "/images/bgos/festivals/regional_cultural/Embroidery_and_tassels_on_garment_47b97586.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Embroidery_and_tassels_on_garment_47b97586.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "embroidery",
      "and",
      "tassels",
      "garment"
    ]
  },
  {
    "id": "Farmer_sowing_seeds_during_ritual_7b417005",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Farmer sowing seeds during ritual",
    "fileName": "Farmer_sowing_seeds_during_ritual_7b417005.webp",
    "url": "/images/bgos/festivals/regional_cultural/Farmer_sowing_seeds_during_ritual_7b417005.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Farmer_sowing_seeds_during_ritual_7b417005.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "farmer",
      "sowing",
      "seeds",
      "during",
      "ritual"
    ]
  },
  {
    "id": "Festival_participant_splashing_w…_6de18de1",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Festival participant splashing w…",
    "fileName": "Festival_participant_splashing_w…_6de18de1.webp",
    "url": "/images/bgos/festivals/regional_cultural/Festival_participant_splashing_w…_6de18de1.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Festival_participant_splashing_w…_6de18de1.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "festival",
      "participant",
      "splashing"
    ]
  },
  {
    "id": "Festivalgoers_celebrating_with_w…_d0f5f547",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Festivalgoers celebrating with w…",
    "fileName": "Festivalgoers_celebrating_with_w…_d0f5f547.webp",
    "url": "/images/bgos/festivals/regional_cultural/Festivalgoers_celebrating_with_w…_d0f5f547.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Festivalgoers_celebrating_with_w…_d0f5f547.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "festivalgoers",
      "celebrating",
      "with"
    ]
  },
  {
    "id": "Flower_swing_tied_to_tree_8cb2b82b",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Flower swing tied to tree",
    "fileName": "Flower_swing_tied_to_tree_8cb2b82b.webp",
    "url": "/images/bgos/festivals/regional_cultural/Flower_swing_tied_to_tree_8cb2b82b.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Flower_swing_tied_to_tree_8cb2b82b.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "flower",
      "swing",
      "tied",
      "tree"
    ]
  },
  {
    "id": "Folk_dancers_performing_on_salt_d488b313",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Folk dancers performing on salt",
    "fileName": "Folk_dancers_performing_on_salt_d488b313.webp",
    "url": "/images/bgos/festivals/regional_cultural/Folk_dancers_performing_on_salt_d488b313.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Folk_dancers_performing_on_salt_d488b313.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "folk",
      "dancers",
      "performing",
      "salt"
    ]
  },
  {
    "id": "Garo_men_playing_long_drums_13aca487",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Garo men playing long drums",
    "fileName": "Garo_men_playing_long_drums_13aca487.webp",
    "url": "/images/bgos/festivals/regional_cultural/Garo_men_playing_long_drums_13aca487.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Garo_men_playing_long_drums_13aca487.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "garo",
      "men",
      "playing",
      "long",
      "drums"
    ]
  },
  {
    "id": "Goan_folk_dancers_performing_Mando_e920b6d9",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Goan folk dancers performing Mando",
    "fileName": "Goan_folk_dancers_performing_Mando_e920b6d9.webp",
    "url": "/images/bgos/festivals/regional_cultural/Goan_folk_dancers_performing_Mando_e920b6d9.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Goan_folk_dancers_performing_Mando_e920b6d9.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "goan",
      "folk",
      "dancers",
      "performing",
      "mando"
    ]
  },
  {
    "id": "Guest_holding_golden_lace_fan_b09b33da",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Guest holding golden lace fan",
    "fileName": "Guest_holding_golden_lace_fan_b09b33da.webp",
    "url": "/images/bgos/festivals/regional_cultural/Guest_holding_golden_lace_fan_b09b33da.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Guest_holding_golden_lace_fan_b09b33da.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "guest",
      "holding",
      "golden",
      "lace",
      "fan"
    ]
  },
  {
    "id": "Handicrafts_and_puppets_at_festival_f41b8842",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Handicrafts and puppets at festival",
    "fileName": "Handicrafts_and_puppets_at_festival_f41b8842.webp",
    "url": "/images/bgos/festivals/regional_cultural/Handicrafts_and_puppets_at_festival_f41b8842.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Handicrafts_and_puppets_at_festival_f41b8842.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "handicrafts",
      "and",
      "puppets",
      "festival"
    ]
  },
  {
    "id": "Holy_mace_procession_in_mountains_11694b0b",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Holy mace procession in mountains",
    "fileName": "Holy_mace_procession_in_mountains_11694b0b.webp",
    "url": "/images/bgos/festivals/regional_cultural/Holy_mace_procession_in_mountains_11694b0b.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Holy_mace_procession_in_mountains_11694b0b.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "holy",
      "mace",
      "procession",
      "mountains"
    ]
  },
  {
    "id": "Incan_priest_performing_Sun_cere…_834d3820",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Incan priest performing Sun cere…",
    "fileName": "Incan_priest_performing_Sun_cere…_834d3820.webp",
    "url": "/images/bgos/festivals/regional_cultural/Incan_priest_performing_Sun_cere…_834d3820.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Incan_priest_performing_Sun_cere…_834d3820.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "incan",
      "priest",
      "performing",
      "sun",
      "cere…"
    ]
  },
  {
    "id": "Inti_Raymi_Sun_festival_Peru_4edae460",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Inti Raymi Sun festival Peru",
    "fileName": "Inti_Raymi_Sun_festival_Peru_4edae460.webp",
    "url": "/images/bgos/festivals/regional_cultural/Inti_Raymi_Sun_festival_Peru_4edae460.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Inti_Raymi_Sun_festival_Peru_4edae460.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "inti",
      "raymi",
      "sun",
      "festival",
      "peru"
    ]
  },
  {
    "id": "Jammu_Bahu_Mela_temple_fair_34e84acb",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Jammu Bahu Mela temple fair",
    "fileName": "Jammu_Bahu_Mela_temple_fair_34e84acb.webp",
    "url": "/images/bgos/festivals/regional_cultural/Jammu_Bahu_Mela_temple_fair_34e84acb.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Jammu_Bahu_Mela_temple_fair_34e84acb.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "jammu",
      "bahu",
      "mela",
      "temple",
      "fair"
    ]
  },
  {
    "id": "Kamakhya_temple_illuminated_with…_6b4c91d4",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Kamakhya temple illuminated with…",
    "fileName": "Kamakhya_temple_illuminated_with…_6b4c91d4.webp",
    "url": "/images/bgos/festivals/regional_cultural/Kamakhya_temple_illuminated_with…_6b4c91d4.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Kamakhya_temple_illuminated_with…_6b4c91d4.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "kamakhya",
      "temple",
      "illuminated",
      "with…"
    ]
  },
  {
    "id": "Kashmiri_Pandits_offering_flower…_07245f4e",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Kashmiri Pandits offering flower…",
    "fileName": "Kashmiri_Pandits_offering_flower…_07245f4e.webp",
    "url": "/images/bgos/festivals/regional_cultural/Kashmiri_Pandits_offering_flower…_07245f4e.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Kashmiri_Pandits_offering_flower…_07245f4e.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "kashmiri",
      "pandits",
      "offering",
      "flower…"
    ]
  },
  {
    "id": "Kharchi_Puja_deity_worship_ae9d0666",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Kharchi Puja deity worship",
    "fileName": "Kharchi_Puja_deity_worship_ae9d0666.webp",
    "url": "/images/bgos/festivals/regional_cultural/Kharchi_Puja_deity_worship_ae9d0666.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Kharchi_Puja_deity_worship_ae9d0666.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "kharchi",
      "puja",
      "deity",
      "worship"
    ]
  },
  {
    "id": "Lingaraj_temple_chariot_procession_98a9264e",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Lingaraj temple chariot procession",
    "fileName": "Lingaraj_temple_chariot_procession_98a9264e.webp",
    "url": "/images/bgos/festivals/regional_cultural/Lingaraj_temple_chariot_procession_98a9264e.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Lingaraj_temple_chariot_procession_98a9264e.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "lingaraj",
      "temple",
      "chariot",
      "procession"
    ]
  },
  {
    "id": "Madhya_Pradesh_Tejaji_fair_bustling_ba23350f",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Madhya Pradesh Tejaji fair bustling",
    "fileName": "Madhya_Pradesh_Tejaji_fair_bustling_ba23350f.webp",
    "url": "/images/bgos/festivals/regional_cultural/Madhya_Pradesh_Tejaji_fair_bustling_ba23350f.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Madhya_Pradesh_Tejaji_fair_bustling_ba23350f.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "madhya",
      "pradesh",
      "tejaji",
      "fair",
      "bustling"
    ]
  },
  {
    "id": "Mizo_dancers_stepping_between_ba…_432ac618",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Mizo dancers stepping between ba…",
    "fileName": "Mizo_dancers_stepping_between_ba…_432ac618.webp",
    "url": "/images/bgos/festivals/regional_cultural/Mizo_dancers_stepping_between_ba…_432ac618.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Mizo_dancers_stepping_between_ba…_432ac618.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "mizo",
      "dancers",
      "stepping",
      "between",
      "ba…"
    ]
  },
  {
    "id": "Mizo_villagers_celebrating_harvest_2e6c750f",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Mizo villagers celebrating harvest",
    "fileName": "Mizo_villagers_celebrating_harvest_2e6c750f.webp",
    "url": "/images/bgos/festivals/regional_cultural/Mizo_villagers_celebrating_harvest_2e6c750f.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Mizo_villagers_celebrating_harvest_2e6c750f.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "mizo",
      "villagers",
      "celebrating",
      "harvest"
    ]
  },
  {
    "id": "Mongolian_archers_aiming_arrows_…_3b56738d",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Mongolian archers aiming arrows …",
    "fileName": "Mongolian_archers_aiming_arrows_…_3b56738d.webp",
    "url": "/images/bgos/festivals/regional_cultural/Mongolian_archers_aiming_arrows_…_3b56738d.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Mongolian_archers_aiming_arrows_…_3b56738d.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "mongolian",
      "archers",
      "aiming",
      "arrows"
    ]
  },
  {
    "id": "Monks_blowing_brass_trumpets_d348cdd1",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Monks blowing brass trumpets",
    "fileName": "Monks_blowing_brass_trumpets_d348cdd1.webp",
    "url": "/images/bgos/festivals/regional_cultural/Monks_blowing_brass_trumpets_d348cdd1.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Monks_blowing_brass_trumpets_d348cdd1.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "monks",
      "blowing",
      "brass",
      "trumpets"
    ]
  },
  {
    "id": "Musician_playing_ravanhatha_inst…_0768483c",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Musician playing ravanhatha inst…",
    "fileName": "Musician_playing_ravanhatha_inst…_0768483c.webp",
    "url": "/images/bgos/festivals/regional_cultural/Musician_playing_ravanhatha_inst…_0768483c.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Musician_playing_ravanhatha_inst…_0768483c.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "musician",
      "playing",
      "ravanhatha",
      "inst…"
    ]
  },
  {
    "id": "Mysore_Palace_illuminated_at_night_6f5da2b0",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Mysore Palace illuminated at night",
    "fileName": "Mysore_Palace_illuminated_at_night_6f5da2b0.webp",
    "url": "/images/bgos/festivals/regional_cultural/Mysore_Palace_illuminated_at_night_6f5da2b0.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Mysore_Palace_illuminated_at_night_6f5da2b0.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "mysore",
      "palace",
      "illuminated",
      "night"
    ]
  },
  {
    "id": "Naga_tribal_warriors_celebrating…_fc014646",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Naga tribal warriors celebrating…",
    "fileName": "Naga_tribal_warriors_celebrating…_fc014646.webp",
    "url": "/images/bgos/festivals/regional_cultural/Naga_tribal_warriors_celebrating…_fc014646.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Naga_tribal_warriors_celebrating…_fc014646.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "naga",
      "tribal",
      "warriors",
      "celebrating…"
    ]
  },
  {
    "id": "Novice_monks_smiling_at_Rumtek_dd432395",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Novice monks smiling at Rumtek",
    "fileName": "Novice_monks_smiling_at_Rumtek_dd432395.webp",
    "url": "/images/bgos/festivals/regional_cultural/Novice_monks_smiling_at_Rumtek_dd432395.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Novice_monks_smiling_at_Rumtek_dd432395.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "novice",
      "monks",
      "smiling",
      "rumtek"
    ]
  },
  {
    "id": "Offering_newly_harvested_rice_e2dd0146",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Offering newly harvested rice",
    "fileName": "Offering_newly_harvested_rice_e2dd0146.webp",
    "url": "/images/bgos/festivals/regional_cultural/Offering_newly_harvested_rice_e2dd0146.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Offering_newly_harvested_rice_e2dd0146.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "offering",
      "newly",
      "harvested",
      "rice"
    ]
  },
  {
    "id": "People_dancing_around_Maypole_3dcfb24b",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "People dancing around Maypole",
    "fileName": "People_dancing_around_Maypole_3dcfb24b.webp",
    "url": "/images/bgos/festivals/regional_cultural/People_dancing_around_Maypole_3dcfb24b.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/People_dancing_around_Maypole_3dcfb24b.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "people",
      "dancing",
      "around",
      "maypole"
    ]
  },
  {
    "id": "People_dancing_in_circle_68e5f0a9",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "People dancing in circle",
    "fileName": "People_dancing_in_circle_68e5f0a9.webp",
    "url": "/images/bgos/festivals/regional_cultural/People_dancing_in_circle_68e5f0a9.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/People_dancing_in_circle_68e5f0a9.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "people",
      "dancing",
      "circle"
    ]
  },
  {
    "id": "People_enjoying_Boryeong_Mud_Fes…_4acc76df",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "People enjoying Boryeong Mud Fes…",
    "fileName": "People_enjoying_Boryeong_Mud_Fes…_4acc76df.webp",
    "url": "/images/bgos/festivals/regional_cultural/People_enjoying_Boryeong_Mud_Fes…_4acc76df.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/People_enjoying_Boryeong_Mud_Fes…_4acc76df.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "people",
      "enjoying",
      "boryeong",
      "mud",
      "fes…"
    ]
  },
  {
    "id": "Pilgrimage_procession_through_al…_2de7a820",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Pilgrimage procession through al…",
    "fileName": "Pilgrimage_procession_through_al…_2de7a820.webp",
    "url": "/images/bgos/festivals/regional_cultural/Pilgrimage_procession_through_al…_2de7a820.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Pilgrimage_procession_through_al…_2de7a820.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "pilgrimage",
      "procession",
      "through",
      "al…"
    ]
  },
  {
    "id": "Priest_worshiping_sacred_bamboo_…_e6997f54",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Priest worshiping sacred bamboo …",
    "fileName": "Priest_worshiping_sacred_bamboo_…_e6997f54.webp",
    "url": "/images/bgos/festivals/regional_cultural/Priest_worshiping_sacred_bamboo_…_e6997f54.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Priest_worshiping_sacred_bamboo_…_e6997f54.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "priest",
      "worshiping",
      "sacred",
      "bamboo"
    ]
  },
  {
    "id": "Rash_Chakra_tower_spinning_at_687f3399",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Rash Chakra tower spinning at",
    "fileName": "Rash_Chakra_tower_spinning_at_687f3399.webp",
    "url": "/images/bgos/festivals/regional_cultural/Rash_Chakra_tower_spinning_at_687f3399.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Rash_Chakra_tower_spinning_at_687f3399.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "rash",
      "chakra",
      "tower",
      "spinning"
    ]
  },
  {
    "id": "Sunburn_festival_main_stage_lights_b155ef62",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Sunburn festival main stage lights",
    "fileName": "Sunburn_festival_main_stage_lights_b155ef62.webp",
    "url": "/images/bgos/festivals/regional_cultural/Sunburn_festival_main_stage_lights_b155ef62.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Sunburn_festival_main_stage_lights_b155ef62.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "sunburn",
      "festival",
      "main",
      "stage",
      "lights"
    ]
  },
  {
    "id": "Sunburn_festival_stage_on_beach_6748867b",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Sunburn festival stage on beach",
    "fileName": "Sunburn_festival_stage_on_beach_6748867b.webp",
    "url": "/images/bgos/festivals/regional_cultural/Sunburn_festival_stage_on_beach_6748867b.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Sunburn_festival_stage_on_beach_6748867b.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "sunburn",
      "festival",
      "stage",
      "beach"
    ]
  },
  {
    "id": "Tomato_fight_festival_in_Buñol_e556a34c",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Tomato fight festival in Buñol",
    "fileName": "Tomato_fight_festival_in_Buñol_e556a34c.webp",
    "url": "/images/bgos/festivals/regional_cultural/Tomato_fight_festival_in_Buñol_e556a34c.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Tomato_fight_festival_in_Buñol_e556a34c.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "tomato",
      "fight",
      "festival",
      "buñol"
    ]
  },
  {
    "id": "Torchbearers_surrounding_Viking_…_14eee6a9",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Torchbearers surrounding Viking …",
    "fileName": "Torchbearers_surrounding_Viking_…_14eee6a9.webp",
    "url": "/images/bgos/festivals/regional_cultural/Torchbearers_surrounding_Viking_…_14eee6a9.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Torchbearers_surrounding_Viking_…_14eee6a9.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "torchbearers",
      "surrounding",
      "viking"
    ]
  },
  {
    "id": "Tribal_artisans_pulling_wooden_c…_3bdcc7f2",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Tribal artisans pulling wooden c…",
    "fileName": "Tribal_artisans_pulling_wooden_c…_3bdcc7f2.webp",
    "url": "/images/bgos/festivals/regional_cultural/Tribal_artisans_pulling_wooden_c…_3bdcc7f2.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Tribal_artisans_pulling_wooden_c…_3bdcc7f2.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "tribal",
      "artisans",
      "pulling",
      "wooden"
    ]
  },
  {
    "id": "Tribal_dancers_performing_folk_d…_fdf29461",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Tribal dancers performing folk d…",
    "fileName": "Tribal_dancers_performing_folk_d…_fdf29461.webp",
    "url": "/images/bgos/festivals/regional_cultural/Tribal_dancers_performing_folk_d…_fdf29461.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Tribal_dancers_performing_folk_d…_fdf29461.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "tribal",
      "dancers",
      "performing",
      "folk"
    ]
  },
  {
    "id": "Tribal_dancers_performing_in_valley_28865e7d",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Tribal dancers performing in valley",
    "fileName": "Tribal_dancers_performing_in_valley_28865e7d.webp",
    "url": "/images/bgos/festivals/regional_cultural/Tribal_dancers_performing_in_valley_28865e7d.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Tribal_dancers_performing_in_valley_28865e7d.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "tribal",
      "dancers",
      "performing",
      "valley"
    ]
  },
  {
    "id": "Tribal_women_dancing_during_fest…_174f2ca8",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Tribal women dancing during fest…",
    "fileName": "Tribal_women_dancing_during_fest…_174f2ca8.webp",
    "url": "/images/bgos/festivals/regional_cultural/Tribal_women_dancing_during_fest…_174f2ca8.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Tribal_women_dancing_during_fest…_174f2ca8.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "tribal",
      "women",
      "dancing",
      "during",
      "fest…"
    ]
  },
  {
    "id": "Tribe_elder_conducting_blessing_…_0561cea7",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Tribe elder conducting blessing …",
    "fileName": "Tribe_elder_conducting_blessing_…_0561cea7.webp",
    "url": "/images/bgos/festivals/regional_cultural/Tribe_elder_conducting_blessing_…_0561cea7.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Tribe_elder_conducting_blessing_…_0561cea7.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "tribe",
      "elder",
      "conducting",
      "blessing"
    ]
  },
  {
    "id": "Tribe_members_performing_ritual_…_661aba2c",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Tribe members performing ritual …",
    "fileName": "Tribe_members_performing_ritual_…_661aba2c.webp",
    "url": "/images/bgos/festivals/regional_cultural/Tribe_members_performing_ritual_…_661aba2c.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Tribe_members_performing_ritual_…_661aba2c.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "tribe",
      "members",
      "performing",
      "ritual"
    ]
  },
  {
    "id": "Turkey_feast_table_with_pumpkins_5d377af1",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Turkey feast table with pumpkins",
    "fileName": "Turkey_feast_table_with_pumpkins_5d377af1.webp",
    "url": "/images/bgos/festivals/regional_cultural/Turkey_feast_table_with_pumpkins_5d377af1.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Turkey_feast_table_with_pumpkins_5d377af1.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "turkey",
      "feast",
      "table",
      "with",
      "pumpkins"
    ]
  },
  {
    "id": "Uttar_Pradesh_Khichdi_festival_o…_77a15e39",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Uttar Pradesh Khichdi festival o…",
    "fileName": "Uttar_Pradesh_Khichdi_festival_o…_77a15e39.webp",
    "url": "/images/bgos/festivals/regional_cultural/Uttar_Pradesh_Khichdi_festival_o…_77a15e39.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Uttar_Pradesh_Khichdi_festival_o…_77a15e39.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "uttar",
      "pradesh",
      "khichdi",
      "festival"
    ]
  },
  {
    "id": "Villagers_celebrating_Gochi_fest…_dfc282c0",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Villagers celebrating Gochi fest…",
    "fileName": "Villagers_celebrating_Gochi_fest…_dfc282c0.webp",
    "url": "/images/bgos/festivals/regional_cultural/Villagers_celebrating_Gochi_fest…_dfc282c0.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Villagers_celebrating_Gochi_fest…_dfc282c0.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "villagers",
      "celebrating",
      "gochi",
      "fest…"
    ]
  },
  {
    "id": "Villagers_celebrating_around_bam…_4502f93a",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Villagers celebrating around bam…",
    "fileName": "Villagers_celebrating_around_bam…_4502f93a.webp",
    "url": "/images/bgos/festivals/regional_cultural/Villagers_celebrating_around_bam…_4502f93a.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Villagers_celebrating_around_bam…_4502f93a.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "villagers",
      "celebrating",
      "around",
      "bam…"
    ]
  },
  {
    "id": "Women_carrying_Tusu_structures_t…_1a326994",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Women carrying Tusu structures t…",
    "fileName": "Women_carrying_Tusu_structures_t…_1a326994.webp",
    "url": "/images/bgos/festivals/regional_cultural/Women_carrying_Tusu_structures_t…_1a326994.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Women_carrying_Tusu_structures_t…_1a326994.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "women",
      "carrying",
      "tusu",
      "structures"
    ]
  },
  {
    "id": "Women_carrying_clay_idols_in_e863bb5f",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Women carrying clay idols in",
    "fileName": "Women_carrying_clay_idols_in_e863bb5f.webp",
    "url": "/images/bgos/festivals/regional_cultural/Women_carrying_clay_idols_in_e863bb5f.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Women_carrying_clay_idols_in_e863bb5f.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "women",
      "carrying",
      "clay",
      "idols"
    ]
  },
  {
    "id": "Women_carrying_pots_with_lamps_38f28e41",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Women carrying pots with lamps",
    "fileName": "Women_carrying_pots_with_lamps_38f28e41.webp",
    "url": "/images/bgos/festivals/regional_cultural/Women_carrying_pots_with_lamps_38f28e41.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Women_carrying_pots_with_lamps_38f28e41.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "women",
      "carrying",
      "pots",
      "with",
      "lamps"
    ]
  },
  {
    "id": "Women_dancing_around_floral_stack_e58c088b",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Women dancing around floral stack",
    "fileName": "Women_dancing_around_floral_stack_e58c088b.webp",
    "url": "/images/bgos/festivals/regional_cultural/Women_dancing_around_floral_stack_e58c088b.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Women_dancing_around_floral_stack_e58c088b.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "women",
      "dancing",
      "around",
      "floral",
      "stack"
    ]
  },
  {
    "id": "Women_offering_harvest_crops_6f582482",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Women offering harvest crops",
    "fileName": "Women_offering_harvest_crops_6f582482.webp",
    "url": "/images/bgos/festivals/regional_cultural/Women_offering_harvest_crops_6f582482.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Women_offering_harvest_crops_6f582482.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "women",
      "offering",
      "harvest",
      "crops"
    ]
  },
  {
    "id": "Women_swinging_on_tree_swings_23d1ca18",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Women swinging on tree swings",
    "fileName": "Women_swinging_on_tree_swings_23d1ca18.webp",
    "url": "/images/bgos/festivals/regional_cultural/Women_swinging_on_tree_swings_23d1ca18.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Women_swinging_on_tree_swings_23d1ca18.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "women",
      "swinging",
      "tree",
      "swings"
    ]
  },
  {
    "id": "Wooden_sculpture_illuminated_at_…_1aad4790",
    "festivalKey": "regional_cultural",
    "festivalLabel": "Regional Fairs & Traditions",
    "emoji": "✨",
    "title": "Wooden sculpture illuminated at …",
    "fileName": "Wooden_sculpture_illuminated_at_…_1aad4790.webp",
    "url": "/images/bgos/festivals/regional_cultural/Wooden_sculpture_illuminated_at_…_1aad4790.webp",
    "s3Path": "bgos-business-images/festivals/regional_cultural/Wooden_sculpture_illuminated_at_…_1aad4790.webp",
    "tags": [
      "regional_cultural",
      "regional fairs & traditions",
      "wooden",
      "sculpture",
      "illuminated"
    ]
  },
  {
    "id": "Person_laughing_during_Songkran_…_c1382072",
    "festivalKey": "songkran",
    "festivalLabel": "Songkran",
    "emoji": "💦",
    "title": "Person laughing during Songkran …",
    "fileName": "Person_laughing_during_Songkran_…_c1382072.webp",
    "url": "/images/bgos/festivals/songkran/Person_laughing_during_Songkran_…_c1382072.webp",
    "s3Path": "bgos-business-images/festivals/songkran/Person_laughing_during_Songkran_…_c1382072.webp",
    "tags": [
      "songkran",
      "person",
      "laughing",
      "during"
    ]
  },
  {
    "id": "Songkran_water_festival_celebration_56853561",
    "festivalKey": "songkran",
    "festivalLabel": "Songkran",
    "emoji": "💦",
    "title": "Songkran water festival celebration",
    "fileName": "Songkran_water_festival_celebration_56853561.webp",
    "url": "/images/bgos/festivals/songkran/Songkran_water_festival_celebration_56853561.webp",
    "s3Path": "bgos-business-images/festivals/songkran/Songkran_water_festival_celebration_56853561.webp",
    "tags": [
      "songkran",
      "water",
      "festival",
      "celebration"
    ]
  },
  {
    "id": "Songkran_water_splashing_street_…_d60d01b7",
    "festivalKey": "songkran",
    "festivalLabel": "Songkran",
    "emoji": "💦",
    "title": "Songkran water splashing street …",
    "fileName": "Songkran_water_splashing_street_…_d60d01b7.webp",
    "url": "/images/bgos/festivals/songkran/Songkran_water_splashing_street_…_d60d01b7.webp",
    "s3Path": "bgos-business-images/festivals/songkran/Songkran_water_splashing_street_…_d60d01b7.webp",
    "tags": [
      "songkran",
      "water",
      "splashing",
      "street"
    ]
  },
  {
    "id": "Water_droplets_splashing_in_sunl…_3e910aeb",
    "festivalKey": "songkran",
    "festivalLabel": "Songkran",
    "emoji": "💦",
    "title": "Water droplets splashing in sunl…",
    "fileName": "Water_droplets_splashing_in_sunl…_3e910aeb.webp",
    "url": "/images/bgos/festivals/songkran/Water_droplets_splashing_in_sunl…_3e910aeb.webp",
    "s3Path": "bgos-business-images/festivals/songkran/Water_droplets_splashing_in_sunl…_3e910aeb.webp",
    "tags": [
      "songkran",
      "water",
      "droplets",
      "splashing",
      "sunl…"
    ]
  },
  {
    "id": "Water_droplets_splashing_in_suns…_0805234c",
    "festivalKey": "songkran",
    "festivalLabel": "Songkran",
    "emoji": "💦",
    "title": "Water droplets splashing in suns…",
    "fileName": "Water_droplets_splashing_in_suns…_0805234c.webp",
    "url": "/images/bgos/festivals/songkran/Water_droplets_splashing_in_suns…_0805234c.webp",
    "s3Path": "bgos-business-images/festivals/songkran/Water_droplets_splashing_in_suns…_0805234c.webp",
    "tags": [
      "songkran",
      "water",
      "droplets",
      "splashing",
      "suns…"
    ]
  },
  {
    "id": "Four-leaf_clover_with_dewdrop_d9182a4f",
    "festivalKey": "st_patricks_day",
    "festivalLabel": "St. Patrick's Day",
    "emoji": "🍀",
    "title": "Four leaf clover with dewdrop",
    "fileName": "Four-leaf_clover_with_dewdrop_d9182a4f.webp",
    "url": "/images/bgos/festivals/st_patricks_day/Four-leaf_clover_with_dewdrop_d9182a4f.webp",
    "s3Path": "bgos-business-images/festivals/st_patricks_day/Four-leaf_clover_with_dewdrop_d9182a4f.webp",
    "tags": [
      "st_patricks_day",
      "st. patrick's day",
      "four",
      "leaf",
      "clover",
      "with",
      "dewdrop"
    ]
  },
  {
    "id": "Leprechaun_top_hat_with_shamrocks_35628d82",
    "festivalKey": "st_patricks_day",
    "festivalLabel": "St. Patrick's Day",
    "emoji": "🍀",
    "title": "Leprechaun top hat with shamrocks",
    "fileName": "Leprechaun_top_hat_with_shamrocks_35628d82.webp",
    "url": "/images/bgos/festivals/st_patricks_day/Leprechaun_top_hat_with_shamrocks_35628d82.webp",
    "s3Path": "bgos-business-images/festivals/st_patricks_day/Leprechaun_top_hat_with_shamrocks_35628d82.webp",
    "tags": [
      "st_patricks_day",
      "st. patrick's day",
      "leprechaun",
      "top",
      "hat",
      "with",
      "shamrocks"
    ]
  },
  {
    "id": "Saint_Patrick's_Day_parade_decor…_c0d8b7c6",
    "festivalKey": "st_patricks_day",
    "festivalLabel": "St. Patrick's Day",
    "emoji": "🍀",
    "title": "Saint Patrick's Day parade decor…",
    "fileName": "Saint_Patrick's_Day_parade_decor…_c0d8b7c6.webp",
    "url": "/images/bgos/festivals/st_patricks_day/Saint_Patrick's_Day_parade_decor…_c0d8b7c6.webp",
    "s3Path": "bgos-business-images/festivals/st_patricks_day/Saint_Patrick's_Day_parade_decor…_c0d8b7c6.webp",
    "tags": [
      "st_patricks_day",
      "st. patrick's day",
      "saint",
      "patrick's",
      "day",
      "parade",
      "decor…"
    ]
  },
  {
    "id": "Shamrocks_and_golden_coins_445261a3",
    "festivalKey": "st_patricks_day",
    "festivalLabel": "St. Patrick's Day",
    "emoji": "🍀",
    "title": "Shamrocks and golden coins",
    "fileName": "Shamrocks_and_golden_coins_445261a3.webp",
    "url": "/images/bgos/festivals/st_patricks_day/Shamrocks_and_golden_coins_445261a3.webp",
    "s3Path": "bgos-business-images/festivals/st_patricks_day/Shamrocks_and_golden_coins_445261a3.webp",
    "tags": [
      "st_patricks_day",
      "st. patrick's day",
      "shamrocks",
      "and",
      "golden",
      "coins"
    ]
  },
  {
    "id": "Sunlit_green_clover_field_b28789ec",
    "festivalKey": "st_patricks_day",
    "festivalLabel": "St. Patrick's Day",
    "emoji": "🍀",
    "title": "Sunlit green clover field",
    "fileName": "Sunlit_green_clover_field_b28789ec.webp",
    "url": "/images/bgos/festivals/st_patricks_day/Sunlit_green_clover_field_b28789ec.webp",
    "s3Path": "bgos-business-images/festivals/st_patricks_day/Sunlit_green_clover_field_b28789ec.webp",
    "tags": [
      "st_patricks_day",
      "st. patrick's day",
      "sunlit",
      "green",
      "clover",
      "field"
    ]
  },
  {
    "id": "Harbin_ice_towers_lit_at_db36a95e",
    "festivalKey": "winter_ice_festival",
    "festivalLabel": "Ice & Snow Festival",
    "emoji": "❄️",
    "title": "Harbin ice towers lit at",
    "fileName": "Harbin_ice_towers_lit_at_db36a95e.webp",
    "url": "/images/bgos/festivals/winter_ice_festival/Harbin_ice_towers_lit_at_db36a95e.webp",
    "s3Path": "bgos-business-images/festivals/winter_ice_festival/Harbin_ice_towers_lit_at_db36a95e.webp",
    "tags": [
      "winter_ice_festival",
      "ice & snow festival",
      "harbin",
      "ice",
      "towers",
      "lit"
    ]
  },
  {
    "id": "Ice_dragon_sculpture_illuminated_60a9bfe2",
    "festivalKey": "winter_ice_festival",
    "festivalLabel": "Ice & Snow Festival",
    "emoji": "❄️",
    "title": "Ice dragon sculpture illuminated",
    "fileName": "Ice_dragon_sculpture_illuminated_60a9bfe2.webp",
    "url": "/images/bgos/festivals/winter_ice_festival/Ice_dragon_sculpture_illuminated_60a9bfe2.webp",
    "s3Path": "bgos-business-images/festivals/winter_ice_festival/Ice_dragon_sculpture_illuminated_60a9bfe2.webp",
    "tags": [
      "winter_ice_festival",
      "ice & snow festival",
      "ice",
      "dragon",
      "sculpture",
      "illuminated"
    ]
  },
  {
    "id": "Illuminated_ice_castle_sculpture_e03486d3",
    "festivalKey": "winter_ice_festival",
    "festivalLabel": "Ice & Snow Festival",
    "emoji": "❄️",
    "title": "Illuminated ice castle sculpture",
    "fileName": "Illuminated_ice_castle_sculpture_e03486d3.webp",
    "url": "/images/bgos/festivals/winter_ice_festival/Illuminated_ice_castle_sculpture_e03486d3.webp",
    "s3Path": "bgos-business-images/festivals/winter_ice_festival/Illuminated_ice_castle_sculpture_e03486d3.webp",
    "tags": [
      "winter_ice_festival",
      "ice & snow festival",
      "illuminated",
      "ice",
      "castle",
      "sculpture"
    ]
  },
  {
    "id": "Illuminated_ice_palace_dfd50e76",
    "festivalKey": "winter_ice_festival",
    "festivalLabel": "Ice & Snow Festival",
    "emoji": "❄️",
    "title": "Illuminated ice palace",
    "fileName": "Illuminated_ice_palace_dfd50e76.webp",
    "url": "/images/bgos/festivals/winter_ice_festival/Illuminated_ice_palace_dfd50e76.webp",
    "s3Path": "bgos-business-images/festivals/winter_ice_festival/Illuminated_ice_palace_dfd50e76.webp",
    "tags": [
      "winter_ice_festival",
      "ice & snow festival",
      "illuminated",
      "ice",
      "palace"
    ]
  },
  {
    "id": "Illuminated_ice_palace_glowing_a…_20d13a15",
    "festivalKey": "winter_ice_festival",
    "festivalLabel": "Ice & Snow Festival",
    "emoji": "❄️",
    "title": "Illuminated ice palace glowing a…",
    "fileName": "Illuminated_ice_palace_glowing_a…_20d13a15.webp",
    "url": "/images/bgos/festivals/winter_ice_festival/Illuminated_ice_palace_glowing_a…_20d13a15.webp",
    "s3Path": "bgos-business-images/festivals/winter_ice_festival/Illuminated_ice_palace_glowing_a…_20d13a15.webp",
    "tags": [
      "winter_ice_festival",
      "ice & snow festival",
      "illuminated",
      "ice",
      "palace",
      "glowing"
    ]
  }
];

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
  const qTokens = (query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);

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
