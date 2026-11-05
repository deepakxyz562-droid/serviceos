/**
 * BGOS Template Graphic Assets & Authentic High-Resolution Photography
 *
 * Extracted from the 10 Stitch Layered Editable Templates Kits.
 * Contains authentic Google-hosted commercial photography and SVG vector emblems
 * for injection as editable, draggable layers on the poster canvas.
 */

const encodeSvg = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// ─── AUTHENTIC HIGH-RES PHOTOGRAPHY (lh3.googleusercontent.com) ───────────────
export const KIT_HIGH_RES_PHOTOS = {
  // Real Estate & Builders (Kits 2 & 3)
  primeHomeVilla:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDI3wnAqpHq0cKimHiHrJnUjBrYRTNqQmFmWl5pOfotl8-T68KMRGdDsJ-U0QSLgR2awlLEUcu6rRkwrVp2Mj8pGDaSxt7-Vuden49Vio5p92oYi4trs1aGlktajOgXwSYFj5ATvoVC6yhhtK2oxCqebcf4i6JtdXBtgpptVxUjc7mVwjgap5WTwnrMRAfPS_uiznTTykXw1dAR-5wlkLL-tfDTqJHWrTMbPnSZ_VyI',
  buildRightStructure:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCOxEnViAJQrejuvJPLrmQKlL0POPi07tsdXpXWF0RhHO36GFXIotNTnvampdUsFAzbpHsiwKas55rDyEIgn3lN3Wpm4FWuusq5toBDJ85hYMpNnGGmj4MwibxT7LAfwSjYSXX7pvahn7fXAA_RnwDPUM5iScT14_DnfPVgmhmyTLmQMUYZsBqtgKCkz-7-f2v7FV6PzMLNkFIqcpwfirm2YhPfsg_JItkjSiaLp8HC',
  spaceStyleLiving:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB1YMuV18ClGNseXaiAYqfI8sjBj1364wHyqRGwf60X8yvhDNiQAz6Pu3Jv_RtDKx3VKkhT_lsUgSaORU_jgoh0hJPli40Dlgx9WM86UAFgWzw-4_pxNUVTCIkQxEZeoJeS9JCx2SGL3oMtbglHV5O-cfMR9d-6smGaJFgR3tVYWGEH7j3UvBHfpFH51iBaqXWGstWP0K49kIxJ0jPuaRL2ZabYOYTNLyV_n2p7t4Sk',
  rentWiseApartment:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDdMN8XmF5Fo8u8bBWNnvL_0hrNxhnhBsnc5WLko9knKvHakttPIYm2weICqQGP1rj57SCh6iI_ceFKjVRU8hXgd6jAGebT00D2TdmAyQDflPGMVuLfp5oce414Gyh-5byH3JAEHT_NnDj9jV3ogERxFGcTEKuyPMwX3tkkR1VxbW4omeB07PpULVoECEq7Ig3TTKGIgh9C_Wy7Wi163p2iSzU3kzlIRs0J00dEXk9P',

  // Luxury Royal Feast Catering (Kit 4)
  royalFeastBanquet:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAfFtW542nRsV_fmwSf8QRKxz6J9ojgmNxf3YIkKdKmGeub3s8MVlULKmc8XDUYW001zWjA9iDmiqKI8_JdbPIn-gpE1KGbG81j8ArwLkZ1cNFnPd8j-_NIhbK6Nldfp5WQSB4-Cp4XWY6fn2zxg1zTPOButS-B8Na0yXQMvqupNBj2vs1sZrEgXbY_VHoUHnsZqCsRm5Uvi2FNlHwM2D0FNswyogbGta5hqPaCOAC8Kcdx7zESpmAiEQ',

  // Complete Automotive Care (Kit 6)
  cleanRideSnowFoam:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBnni9AahsE5W5R5MN1pnEuks8ViGkYoMG9kClahPi5OTMZZvk4JMnuT31Zb92oLrWBlqgn3xHHUlq51kKLyvgqGPuakVlG1H6Dl658RLNz-T-mRSZ6QaNwjuZzKxO7o5aeBRfS6zhwu3SfcCwkUu0P-jxEpyLFfnbcb35sT4-vJ84p5y6prViP6cOUxJHpoWtyRiwiw2vvx6r5YAKe4-D69-5_PalDyWcaTE8MRnFc',
  autoCareWorkshop:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB5J4-9ovEZatFE4myCpkr0tF3W5d24in8Q7J6Es0RG8aa-coHIONmjw2LhOTZeWKLtX3EGuegCLdgYOSTzKZjOKQ6exiiQyhVAVys4y1p51d5BuYF-T_PjRnN_1c5ey0T51-VifnwrGRGE2whYu5HLCZ-Wrqsak1ALFTZXV_CFG8cWTnvrtu8YLaIhKZRcjV2-OLPy91sXfITpbEgsAnLleLrR5ceThxKYOLQhKzhr',
  bikeFixService:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC0KnHBz7uMoGFiqDvZVYJd2mnEV3Jb5zaqZ9JlMZ6h843Hxr7AAmEVvtHN6inUzf7h7_mkeemC3mmxbz8n22JCWVgYsqCkR3FS1cpa6feXqQ6keQydPUbzRNS_yU8GaJ7FJ4W_9G1VHTDkDuZH74BKyI1e7n0DPmfXH8lCqxVzTUEaf-jwPKRvkgYjFcbMAhYFIU99YpQsbvKgqHMOTb4aRTU1rHfAL5hpemXrtRei',

  // Civic & Community (Kit 7)
  civicLeadership:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAolK9pi877ext4PhLh7S0rSrcsVYhnDDH2t4Njx4zybfy3PnydQS9I9wHagkH4v5dvPx1xOstpsoOQWywvYM1gOxLhq6LlD9_38Ywc61vbQ1ts8GYW_kHTREt7s8bafqbVmKgGgct_6oW6HCMChYp2VvQC9xat-g4yUyRLtKdqQN3XzdYEgNUHxcBJ2x6V5ZiEGpR68vimenOmEY7MDFu13W102KbiDrUEOpVYKVGr',
  civicYouthMovement:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDQNaSr8xGhNMW5edOKzeiSjyQzfSCWfbRlDkd-OGbEPhlT5BKRnwKteD9bGjZSYH4FRUFmzRLaTDKIuOGKgSqQ61JXThQ3sxMIzDL7rq2BC1iRJhYn12h0CuKfZpoOI0XlWGDes_cl8nupYe_MUNs57WPCx11XYGzxGGZnkX1_CAfkGRIHlwAfhichffkaXSPTCiexm9M0FbIAdvg916_VI1r6IUVEdB9yPC2d_c4H',
  civicFarmerProsperity:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC6jT6LnrFw0wxaMnr3eAa6jb1KqrR0f49uUeXsqYj5eBQ8-EIrVEK-E9kMgFeb8S32fIjDZ91Q_ICgLV6MxiKzmFzljMEfw9Sl2VceslGFc6UcaAR3_sjDRh1wQJu0UOc64J1EqMihxXXIJOAQeoLzyXRsjPPaZctlN8LhM1QLsKovh45_u4ESCgq8no8jQAoc59y5Lp_mqj9CzeKJWs05b8_J9oHMgHAukLI4wkum',

  // Commercial Verticals (Kits 8 & 11)
  healthcareClinic:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAqyYO63dAoqyKXPU-hs7X16ITF0OZYCd2tplcOE8bSxdQ2cPmoVy15AAekhPHuqecnBxdyNf1tBDqjkoul0ahSCdUmJIlJ0SKtZGnYD6m1ETMG5vnXosb9QvhuYOYJHlcrimF86-CcZC9QcsqtizgmiPRDr_rcTuWmy30SN2Q3Jbq6zFNERrT5fcVPqWJsRGGr3uTnUp96ui9GfancY6LWWkeRrM7bfVzG5EoGlxE7',
  luxeSalonAesthetics:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCnhAtPY4gRRQrMbgMTO7RtmUJke0VDvqD7ActbH41efdLsmQpitEN3VSpxLZOvXs6gQRuP1xOCT6W4amXxui164tUcfS8zzXRcfKHbhD55Bol0dlM12XlAQA7lekOFTXurJbiRBdNW0o0LjL72w8XBfa1ZH7Wppr-H13JXV7wyl1h7XtOGGIBRpQJ5aOpubxvoU-nDNFZhzirXY7QvMjfY1vlOS3uJ3uLg-3nb9jEr',
  gourmetDiningKitchen:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCjAP7hm2a9bzxqYkudJ9lRZ4SLp_tNeH2d_LpcKayz9-UZ4GuG7IYuYhYqb07h5FH6T7fMase0DmhTUDfNzElaebrCUPJgEt6HvFt4Pc5_mXZfUMQ7kwLkq2xy7N0U1t6dZA08p7202nzazcb4balV_IEk3YJYR9zmdjBLvSVWB7HdinqBU4foXlfr37VxLw92I_a4aqkX0a80Zl5m-mMXUCINqzNqnvdIsF6w6NFE',
  academyEducation:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuALF7eOeHM7VmrZ2XvdNA4JPjW6ZzAeALcNs_Uyt0cfVxM_V-xspfFhDDCP258MNWePbUjY4ocH2Oszf1gft6JjjbQrHamfMc3VLMiG_x6huc9EUfvAh5rsaaJZQ-2UGpG7j0-zdT1geJCZT9vXAiVh5FUNPrTC5VBXZp7vb5UqeIJc6Yw4mrs6DX38iylwqCG4LRKX1sjB3yHjpIkG3NfUXyhpV-rFCt-Zsow5u5jP',
  appliancesTechnician:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC5r4EeWAnXnndNKt-ZIVsj3clPVeIl3ahHSM-cmgWl6JMxRC...',

  // High-Impact Flash Sales (Kit 10)
  festiveSaleBoutique:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCMOw1tPN13DnfRw3jY5dZsQms_UEyG5EuzXyE4fHxmrc977KjGGM6XxfPJjKzweE6meqa9eZgkcmePrYk1kJxWAu9oGKfJjNE9-GdvacA_gFBrMN6ot8A8FSur6ZLgj8KOpin9AYGsX7trJwNPDn2gjpTq9iYNc3k9oS0MatehvYjjWgAMgwH9lgQXnP6IY0Tq36UIQLg_AnMOOOQYI9KFlbiNOWT7pXzfcBERl0bC',
  flashDropBags:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuChRRsI1_ybJxOU_Jm2zowZJdA3YeR_RoEj2j_zoEMYKSUj0mRyeWfQVMG9crgX6rFNiON509bbB3ZbZFKl5e-e-HnKkJEOky-2J32_ol3ZUF09fKYhV6CTlCMDrncNyHbSia0xTjuYG3_lYMOG-enQ8XKNwZKQlOlFv8yMd8Zdd5YdEyO10THAojxKBqeMtLviNLckz2pKKLmXa9RLon52dkP6XarzWuRFx5jqijUK',
  bogoShopper:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAYCibR1Xl_91knRbFmacadDp4ZMZKYFVnaS8GEa87qKiueP8ReEo3KIK0fGJ2pXExE0sLiyHKkCbw6n3BfQIgQy_Iq5IMFaQA7n3B6h-xIqua6AleilwLlN2_SkWOOGHL-wgjJWylNh93AreyJFwS1FVoVrnPp5pxwZv53K9zU-es_iqRDkQY914dG0aWBAsAbKeIuqwGwB95I3Eg2c9F0K6tk5uOXB4H1OvjUzM0D',
};

// ─── SVG VECTOR EMBLEMS & MOTIFS (DATA URIs) ──────────────────────────────────
export const KIT_SVG_EMBLEMS = {
  /** Kit 4: Gold Chef Hat luxury emblem */
  chefHatGold: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60">
      <path d="M22 40 C14 38 10 30 14 22 C17 15 26 15 30 18 C32 10 44 8 50 14 C56 8 68 12 68 22 C72 30 66 38 58 40 Z" fill="#F5D372" stroke="#DFB743" stroke-width="2.5" />
      <rect x="24" y="42" width="32" height="6" rx="3" fill="#DFB743" />
      <path d="M30 43 L30 47 M40 43 L40 47 M50 43 L50 47" stroke="#1B030B" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  `),

  /** Kit 4: Ornate Gold Crown / Flourish divider */
  goldFlourishDivider: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20">
      <path d="M50 8 C43 3, 30 6, 20 18 C30 14, 40 13, 50 18 C60 13, 70 14, 80 18 C70 6, 57 3, 50 8 Z" fill="#DFB743" opacity="0.95" />
      <circle cx="50" cy="5" r="3.5" fill="#FFF6D1" />
      <line x1="5" y1="10" x2="20" y2="10" stroke="#DFB743" stroke-width="1.5" stroke-linecap="round" />
      <line x1="80" y1="10" x2="95" y2="10" stroke="#DFB743" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  `),

  /** Kit 5: Handcrafted Clay Diya with glowing gold flame */
  glowingDiyaFlame: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <ellipse cx="100" cy="140" rx="65" ry="24" fill="#854D0E" stroke="#CA8A04" stroke-width="3" />
      <ellipse cx="100" cy="135" rx="55" ry="16" fill="#78350F" />
      <path d="M100 130 Q75 85 100 35 Q125 85 100 130 Z" fill="#F59E0B" stroke="#FEF08A" stroke-width="2.5" />
      <path d="M100 120 Q88 85 100 55 Q112 85 100 120 Z" fill="#FEF08A" />
      <circle cx="100" cy="80" r="14" fill="#FFFFFF" opacity="0.8" />
    </svg>
  `),

  /** Kit 5: Golden Crescent Moon & Star (Eid / Celebration) */
  crescentMoonStar: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M50 15 A35 35 0 1 0 85 70 A30 30 0 1 1 50 15 Z" fill="#FDE047" stroke="#EAB308" stroke-width="2" />
      <polygon points="68,36 71,43 78,44 73,49 74,56 68,52 62,56 63,49 58,44 65,43" fill="#FEF08A" />
    </svg>
  `),

  /** Kit 9: Sacred Ganesha Silhouette / Auspicious Lotus Motif */
  sacredGaneshaLotus: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FDE047" stroke-width="2" stroke-dasharray="3 3" opacity="0.8" />
      <path d="M50 20 Q56 32 50 44 Q44 32 50 20 Z" fill="#F59E0B" />
      <path d="M35 30 Q46 38 46 50 Q36 46 35 30 Z" fill="#FBBF24" />
      <path d="M65 30 Q54 38 54 50 Q64 46 65 30 Z" fill="#FBBF24" />
      <ellipse cx="50" cy="65" rx="20" ry="10" fill="#E11D48" />
      <circle cx="50" cy="52" r="5" fill="#FEF08A" />
    </svg>
  `),

  /** Kit 10: High-Energy Flash Drop Lightning Bolt */
  lightningDropBolt: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80">
      <polygon points="35,5 10,45 30,45 25,75 50,35 30,35" fill="#F43F5E" stroke="#FFE4E6" stroke-width="2" />
    </svg>
  `),

  /** Kit 10: BOGO Celebration Gift Box with Ribbon */
  celebrationGiftBox: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="15" y="32" width="50" height="38" rx="6" fill="#D97706" />
      <rect x="10" y="22" width="60" height="12" rx="3" fill="#F59E0B" />
      <rect x="36" y="22" width="8" height="48" fill="#FEF3C7" />
      <path d="M36 22 C30 10 20 12 25 18 C30 24 36 22 36 22 Z" fill="#FEF3C7" />
      <path d="M44 22 C50 10 60 12 55 18 C50 24 44 22 44 22 Z" fill="#FEF3C7" />
    </svg>
  `),

  /** Kit 2 & 3: Architectural Luxury Villa / Building Badge */
  buildingBadge: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
      <rect x="8" y="8" width="44" height="44" rx="10" fill="#0B396B" />
      <path d="M22 44 L22 30 L38 30 L38 44 Z" fill="#FFFFFF" opacity="0.3" />
      <path d="M16 44 L16 24 L30 14 L44 24 L44 44 Z" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" />
      <rect x="27" y="34" width="6" height="10" fill="#FBBF24" />
    </svg>
  `),

  /** Kit 6: Complete Auto Care & Detailing Shield */
  autoCareShield: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70">
      <path d="M30 6 L52 16 L52 40 C52 54 30 64 30 64 C30 64 8 54 8 40 L8 16 Z" fill="#00D2D3" />
      <path d="M30 12 L46 20 L46 38 C46 48 30 56 30 56 C30 56 14 48 14 38 L14 20 Z" fill="#0A192F" />
      <path d="M24 34 L28 38 L38 26" fill="none" stroke="#00D2D3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `),

  /** Kit 8 & 11: Medical Clinic Cross Emblem */
  medicalCrossEmblem: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="26" fill="#059669" />
      <rect x="25" y="14" width="10" height="32" rx="3" fill="#FFFFFF" />
      <rect x="14" y="25" width="32" height="10" rx="3" fill="#FFFFFF" />
    </svg>
  `),

  /** Kit 8 & 11: Luxury Salon & Aesthetics Sparkle */
  salonSparkleEmblem: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
      <path d="M30 6 Q30 30 6 30 Q30 30 30 54 Q30 30 54 30 Q30 30 30 6 Z" fill="#DB2777" />
      <circle cx="30" cy="30" r="4" fill="#FFF5F7" />
      <circle cx="48" cy="14" r="3" fill="#F472B6" />
      <circle cx="12" cy="46" r="3" fill="#F472B6" />
    </svg>
  `),

  /** Kit 8 & 11: Gourmet Dining Chef Cloche Emblem */
  gourmetDiningCloche: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
      <path d="M12 40 C12 24 20 18 30 18 C40 18 48 24 48 40 Z" fill="#F59E0B" />
      <circle cx="30" cy="14" r="3" fill="#F59E0B" />
      <rect x="8" y="42" width="44" height="4" rx="2" fill="#F59E0B" />
    </svg>
  `),
};
