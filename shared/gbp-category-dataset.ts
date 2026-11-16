/**
 * Master Google Business Profile (GBP) Category Dataset
 * 
 * First-class data architecture for Google's commercial taxonomy.
 * Maps 4,000+ GBP categories to:
 *  - Official ID (`gcid:...`)
 *  - Standard Display Name
 *  - Mapped Universal Industry Pillar
 *  - Related Categories
 *  - Core Trade Products & Offerings
 *  - High-Intent Customer Search Queries
 *  - Visual Photography & AI Generation Search Terms
 *  - Preferred Design Themes & Commercial Hooks
 */

export interface GbpCategoryDefinition {
  id: string;
  displayName: string;
  pillar: string;
  aliases?: string[];
  relatedCategories: string[];
  coreProducts: string[];
  customerIntentKeywords: string[];
  visualSearchTerms: string[];
  preferredTheme: 'emerald' | 'amber' | 'rose_chic' | 'cyber_tech' | 'royal_gold' | 'luxe_dark' | 'trust_amber' | 'sand';
  defaultHooks: {
    offerHeadline: string;
    showcaseHeadline: string;
    trustHeadline: string;
    subtitle: string;
    bullets: string[];
    cta: string;
  };
}

export const MASTER_GBP_CATEGORIES: GbpCategoryDefinition[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. BUILDING MATERIALS, HARDWARE, TIMBER & INTERIORS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:plywood_supplier',
    displayName: 'Plywood supplier',
    pillar: 'building_materials_hardware',
    aliases: ['plywood shop', 'plywood store', 'ply shop', 'plywood dealer', 'timber and plywood'],
    relatedCategories: ['Timber merchant', 'Lumber store', 'Building materials supplier', 'Hardware store', 'Wood floor installation service'],
    coreProducts: ['IS:710 Marine Grade Plywood', 'Commercial Calibrated Boards', 'Decorative Sunmica Laminates', 'Teak & Oak Veneers', 'Flush Doors', 'Shuttering Ply'],
    customerIntentKeywords: ['wholesale plywood rates', 'waterproof ply for modular kitchen', 'best plywood supplier near me', '18mm calibrated ply price', 'termite proof board'],
    visualSearchTerms: ['architectural stacked marine plywood sheets', 'timber lumber wood workshop', 'calibrated wood panels interior'],
    preferredTheme: 'trust_amber',
    defaultHooks: {
      offerHeadline: 'Premium Waterproof Marine Plywood — Factory Direct Rates',
      showcaseHeadline: 'Guaranteed 100% Termite & Borer Proof Calibrated Boards',
      trustHeadline: 'Leading Plywood & Architectural Surface Partner in {city}',
      subtitle: 'IS:710 Marine Grade certified boards with 25-year manufacturer guarantee and on-site delivery.',
      bullets: ['IS:710 Marine Grade Quality', '25-Year Termite & Fungus Guarantee', 'Factory Wholesale Pricing'],
      cta: 'GET WHOLESALE QUOTE',
    },
  },
  {
    id: 'gcid:timber_merchant',
    displayName: 'Timber merchant',
    pillar: 'building_materials_hardware',
    aliases: ['wood merchant', 'wood supplier', 'lumber merchant', 'saw mill'],
    relatedCategories: ['Plywood supplier', 'Lumber store', 'Woodworking supply store', 'Saw mill'],
    coreProducts: ['Teak Wood Logs', 'Sal Wood Planks', 'Pine Wood Rafters', 'Engineered Timber', 'Custom Wood Sizing'],
    customerIntentKeywords: ['teak wood price per cubic feet', 'sal wood rafters for construction', 'timber merchant near me'],
    visualSearchTerms: ['natural timber wood planks lumber', 'stacked wood logs sawmill craftsmanship'],
    preferredTheme: 'trust_amber',
    defaultHooks: {
      offerHeadline: 'Seasoned Natural Timber & Hardwood Planks — Best Rates',
      showcaseHeadline: '100% Chemically Treated & Kiln-Dried Construction Timber',
      trustHeadline: 'Trusted High-Grade Timber Merchant Serving {city}',
      subtitle: 'Premium grade Teak, Sal, and Pine wood custom-cut to exact architectural specifications.',
      bullets: ['Kiln-Dried Moisture-Controlled Wood', 'Accurate Custom Sizing & Planning', 'Direct Mill Wholesale Pricing'],
      cta: 'REQUEST TIMBER ESTIMATE',
    },
  },
  {
    id: 'gcid:hardware_store',
    displayName: 'Hardware store',
    pillar: 'building_materials_hardware',
    aliases: ['hardware shop', 'tools and hardware', 'sanitary and hardware'],
    relatedCategories: ['Tools store', 'Fastener supplier', 'Paint store', 'Plumbing supply store'],
    coreProducts: ['Heavy-Duty Hinges & Drawer Channels', 'Power Tools & Drills', 'Door Locks & Handles', 'Fasteners & Screws', 'Architectural Fittings'],
    customerIntentKeywords: ['hardware store near me', 'modular kitchen fittings price', 'power tools wholesale shop'],
    visualSearchTerms: ['precision hardware tools drill bits', 'modern architectural door handles display', 'hardware store interior'],
    preferredTheme: 'amber',
    defaultHooks: {
      offerHeadline: 'Heavy-Duty Hardware & Architectural Fittings — Flat 20% OFF',
      showcaseHeadline: 'Branded Modular Kitchen Fittings, Locks & Power Tools',
      trustHeadline: 'The Most Reliable Hardware & Tools Destination in {city}',
      subtitle: 'Complete range of stainless steel architectural fittings, branded locks, and precision power tools.',
      bullets: ['SS 304 Rust-Free Hardware', 'Authorized Brand Distributor', 'Wholesale Bulk Supply Rates'],
      cta: 'VISIT HARDWARE STORE',
    },
  },
  {
    id: 'gcid:paint_store',
    displayName: 'Paint store',
    pillar: 'building_materials_hardware',
    aliases: ['paint shop', 'asian paints dealer', 'wall paint store'],
    relatedCategories: ['Painter', 'Interior decorator', 'Waterproofing service', 'Wallpaper store'],
    coreProducts: ['Interior Emulsion Paints', 'Exterior Weatherproof Finishes', 'Waterproofing Chemicals', 'Wood Stains & Enamels', 'Designer Wall Textures'],
    customerIntentKeywords: ['paint shop near me', 'asian paints price list', 'waterproofing contractor in {city}'],
    visualSearchTerms: ['vibrant paint color swatches buckets', 'interior modern wall painting finish', 'designer paint textures'],
    preferredTheme: 'emerald',
    defaultHooks: {
      offerHeadline: 'Festival Wall Makeover — Flat 25% OFF on Interior Paints',
      showcaseHeadline: 'Waterproof Luxury Emulsions & Anti-Fungal Exterior Coatings',
      trustHeadline: 'Authorized Distributor of Premium Wall Finishes in {city}',
      subtitle: 'Explore 2,000+ vibrant designer shades with computerized color tinting and free home shade consultation.',
      bullets: ['Computerized Instant Tinting', '10-Year Weatherproof Guarantee', 'Free Expert Color Consultation'],
      cta: 'GET COLOR CATALOG',
    },
  },
  {
    id: 'gcid:tile_store',
    displayName: 'Tile store',
    pillar: 'building_materials_hardware',
    aliases: ['tiles showroom', 'ceramic tiles shop', 'vitrified tiles dealer', 'marble and tiles'],
    relatedCategories: ['Marble supplier', 'Bathroom supply store', 'Granite supplier', 'Flooring contractor'],
    coreProducts: ['Large Format Vitrified Tiles', 'Designer Bathroom Wall Tiles', 'Anti-Skid Outdoor Pavers', 'Italian Marble Slabs', 'Epoxy Tile Grouts'],
    customerIntentKeywords: ['tiles showroom near me', 'vitrified floor tiles price', 'designer bathroom tiles {city}'],
    visualSearchTerms: ['luxury marble tile showroom display', 'modern bathroom wall tiles interior', 'large format floor tiles'],
    preferredTheme: 'sand',
    defaultHooks: {
      offerHeadline: 'Grand Tiles & Marble Showcase — Direct Factory Clearance',
      showcaseHeadline: 'High-Gloss Vitrified & Stain-Proof Italian Finish Tiles',
      trustHeadline: 'The Premier Flooring & Architectural Surface Studio in {city}',
      subtitle: 'Over 500+ live displays of large slab tiles, polished Italian marble, and anti-skid bathroom solutions.',
      bullets: ['Zero Water Absorption Vitrified', 'Scratch & Stain Resistant', 'Direct Factory Distributor Rates'],
      cta: 'EXPLORE TILE SHOWROOM',
    },
  },
  {
    id: 'gcid:glass_shop',
    displayName: 'Glass shop',
    pillar: 'building_materials_hardware',
    aliases: ['toughened glass dealer', 'mirror shop', 'glass and aluminium store'],
    relatedCategories: ['Glazier', 'Window installation service', 'Interior designer', 'Mirror shop'],
    coreProducts: ['Toughened Safety Glass', 'Acoustic Double Glazed Units', 'LED Bathroom Mirrors', 'Glass Railings & Partitions', 'Lacquered Decorative Glass'],
    customerIntentKeywords: ['toughened glass supplier {city}', 'led touch mirror price', 'glass railing contractor'],
    visualSearchTerms: ['architectural toughened glass railing', 'modern led illuminated mirror interior', 'glass partition modern office'],
    preferredTheme: 'cyber_tech',
    defaultHooks: {
      offerHeadline: 'Custom Toughened Glass & LED Mirrors — Factory Direct Prices',
      showcaseHeadline: 'Frameless Glass Railings, Shower Cubicles & Partitions',
      trustHeadline: 'Precision Glass Fabrication & Architectural Glazing in {city}',
      subtitle: 'Engineered architectural glass cut, polished, and tempered to precision millimeter measurements.',
      bullets: ['12mm Certified Toughened Glass', 'Sleek Frameless Hardware', 'Precision On-Site Installation'],
      cta: 'REQUEST GLASS QUOTE',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. FOOD, SWEETS, BAKERY & CONFECTIONERY
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:indian_sweets_shop',
    displayName: 'Indian sweets shop',
    pillar: 'food_sweets_confectionery',
    aliases: ['sweet shop', 'mithai shop', 'halwai', 'sweets store', 'namkeen store'],
    relatedCategories: ['Bakery', 'Confectionery store', 'Restaurant', 'Caterer', 'Dairy store'],
    coreProducts: ['Pure Desi Ghee Kaju Katli', 'Motichoor Ladoos', 'Hot Crispy Jalebi', 'Dry Fruit Gift Boxes', 'Gulab Jamun & Rasgulla', 'Spicy Namkeen Assortments'],
    customerIntentKeywords: ['best sweet shop in {city}', 'pure desi ghee mithai near me', 'diwali sweets gift box', 'bulk wedding sweets order'],
    visualSearchTerms: ['authentic indian traditional sweets mithai', 'hot gulab jamun festive syrup dessert', 'luxury festive mithai gift box'],
    preferredTheme: 'royal_gold',
    defaultHooks: {
      offerHeadline: '100% Pure Desi Ghee Sweets & Festive Gift Hampers',
      showcaseHeadline: 'Handcrafted Daily with Pure Ingredients & Royal Dry Fruits',
      trustHeadline: 'Generations of Authentic Sweet Taste & Purity in {city}',
      subtitle: 'Prepared fresh every morning using 100% pure desi ghee, premium saffron, and certified ingredients.',
      bullets: ['100% Pure Desi Ghee Preparation', 'Zero Artificial Preservatives', 'Customized Corporate & Wedding Boxes'],
      cta: 'ORDER FRESH SWEETS',
    },
  },
  {
    id: 'gcid:bakery',
    displayName: 'Bakery',
    pillar: 'food_sweets_confectionery',
    aliases: ['cake shop', 'pastry shop', 'artisan bakery', 'birthday cake bakery'],
    relatedCategories: ['Indian sweets shop', 'Cafe', 'Confectionery store', 'Dessert shop'],
    coreProducts: ['Designer Theme Birthday Cakes', 'Belgian Chocolate Pastries', 'Artisan Sourdough Bread', 'Fresh Fruit Tarts', 'Handmade Cookies & Muffins'],
    customerIntentKeywords: ['cake shop near me', 'customized birthday cake in {city}', 'best bakery delivery'],
    visualSearchTerms: ['designer chocolate birthday cake bakery', 'freshly baked artisan pastry display', 'bakery dessert celebration'],
    preferredTheme: 'rose_chic',
    defaultHooks: {
      offerHeadline: 'Artisan Birthday Cakes & Pastries — Flat 20% OFF Pre-Orders',
      showcaseHeadline: 'Custom Customized Theme Cakes Made with 100% Pure Dairy Butter',
      trustHeadline: 'The Highest-Rated Cake Studio & Artisan Bakery in {city}',
      subtitle: 'Baking sweet memories with customized handcrafted cakes, rich ganache, and gourmet pastries.',
      bullets: ['Eggless & Sugar-Free Options', 'Midnight Doorstep Delivery', 'Custom 3D Theme Customization'],
      cta: 'ORDER CUSTOM CAKE',
    },
  },
  {
    id: 'gcid:restaurant',
    displayName: 'Restaurant',
    pillar: 'food_sweets_confectionery',
    aliases: ['family restaurant', 'dining restaurant', 'veg restaurant', 'fine dining'],
    relatedCategories: ['Cafe', 'Indian sweets shop', 'Bar & grill', 'Caterer', 'Delivery Restaurant'],
    coreProducts: ['Authentic North Indian Curries', 'Live Charcoal Tandoor Starters', 'Hyderabadi Dum Biryani', 'Chinese & Continental Platters', 'Family Thali Feasts'],
    customerIntentKeywords: ['best family restaurant near me', 'top rated dining in {city}', 'table booking discount restaurant'],
    visualSearchTerms: ['fine dining luxury restaurant table food', 'authentic indian tandoori feast platter', 'warm restaurant family ambiance'],
    preferredTheme: 'royal_gold',
    defaultHooks: {
      offerHeadline: 'Royal Family Dining Feast — Flat 20% OFF on Advance Table Booking',
      showcaseHeadline: 'Authentic Tandoor, Handcrafted Curries & Exquisite Ambience',
      trustHeadline: 'Voted {city}’s Favourite Multi-Cuisine Family Dining Destination',
      subtitle: 'Experience culinary excellence with locally sourced ingredients, secret royal spices, and warm hospitality.',
      bullets: ['Live Tandoor & Charcoal Grills', 'Spacious Private Dining Rooms', 'Zero Wait Time with Pre-Booking'],
      cta: 'RESERVE A TABLE',
    },
  },
  {
    id: 'gcid:cafe',
    displayName: 'Cafe',
    pillar: 'food_sweets_confectionery',
    aliases: ['coffee shop', 'espresso bar', 'bistro cafe', 'youth cafe'],
    relatedCategories: ['Restaurant', 'Bakery', 'Coffee store', 'Fast food restaurant'],
    coreProducts: ['Specialty Arabica Espresso & Cappuccino', 'Wood-Fired Pizza', 'Gourmet Burgers & Fries', 'Boba & Handcrafted Coolers', 'Dessert Platters'],
    customerIntentKeywords: ['best cafe near me', 'cozy coffee shop for work', 'rooftop cafe in {city}'],
    visualSearchTerms: ['cozy modern coffee shop interior barista', 'latte art coffee cup cafe aesthetic', 'cafe friends food table'],
    preferredTheme: 'sand',
    defaultHooks: {
      offerHeadline: 'Fresh Brews, Cozy Vibes & Wood-Fired Pizzas — Special Combo',
      showcaseHeadline: '100% Arabica Specialty Coffee Roasted to Perfection',
      trustHeadline: 'Your Go-To Neighbourhood Cafe for Conversations & Coffee in {city}',
      subtitle: 'Relax in our ambient seating with artisanal hand-poured coffees, fresh food, and high-speed Wi-Fi.',
      bullets: ['100% Single-Origin Arabica Beans', 'Comfortable Work-Friendly Seating', 'Live Fresh Oven Kitchen'],
      cta: 'EXPLORE CAFE MENU',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. BEAUTY, SALON, SPA & PERSONAL CARE
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:beauty_salon',
    displayName: 'Beauty salon',
    pillar: 'beauty_personal_care',
    aliases: ['beauty parlour', 'unisex salon', 'ladies salon', 'beauty parlor', 'saloon'],
    relatedCategories: ['Hair salon', 'Spa and health club', 'Make-up artist', 'Nail salon', 'Barber shop'],
    coreProducts: ['HD Bridal Airbrush Makeup', 'Keratin & Botox Hair Spa', 'Detox & Brightening Facials', 'Precision Layer Cuts & Balayage', 'Organic Waxing & Mani-Pedi'],
    customerIntentKeywords: ['best beauty salon near me', 'bridal makeup package in {city}', 'hair salon for women price', 'top saloon near me'],
    visualSearchTerms: ['luxury hair salon styling blowout', 'professional bridal makeup beauty cosmetics', 'modern salon interior mirrors'],
    preferredTheme: 'rose_chic',
    defaultHooks: {
      offerHeadline: 'Bridal Makeover & Luxury Hair Spa — Flat 25% OFF Packages',
      showcaseHeadline: 'Certified Celebrity Stylists & International Cosmetic Brands',
      trustHeadline: '{city}’s Most Trusted Destination for Radiant Beauty & Hair Care',
      subtitle: 'Experience personalized beauty therapy with certified artists, camera-ready makeup, and hygienic care.',
      bullets: ['International Cosmetic Brands', 'Complimentary Pre-Bridal Consultation', '100% Sanitized Private Styling Rooms'],
      cta: 'BOOK SALON APPOINTMENT',
    },
  },
  {
    id: 'gcid:hair_salon',
    displayName: 'Hair salon',
    pillar: 'beauty_personal_care',
    aliases: ['hairdresser', 'hair studio', 'hair cut salon'],
    relatedCategories: ['Beauty salon', 'Barber shop', 'Hair replacement service'],
    coreProducts: ['Advanced Keratin Smoothing', 'Precision Taper & Layer Cuts', 'Global Hair Colour & Balayage', 'Anti-Dandruff Scalp Detox', 'Nanoplastia Treatment'],
    customerIntentKeywords: ['hair salon near me', 'best hair stylist in {city}', 'keratin treatment price'],
    visualSearchTerms: ['hair salon haircut stylist precision shears', 'modern salon styling chair wash basin'],
    preferredTheme: 'luxe_dark',
    defaultHooks: {
      offerHeadline: 'Transform Your Locks — Keratin & Balayage Special Offer',
      showcaseHeadline: 'Precision Styling & Deep Conditioning for Mirror-Shine Hair',
      trustHeadline: 'Award-Winning Hairdressing & Scalp Specialists in {city}',
      subtitle: 'Revitalize dull hair with tailored protein treatments, trendy cuts, and international hair colors.',
      bullets: ['Formaldehyde-Free Treatments', 'Custom Hair Texture Analysis', 'Trained Senior Colourists'],
      cta: 'RESERVE HAIR SLOT',
    },
  },
  {
    id: 'gcid:barber_shop',
    displayName: 'Barber shop',
    pillar: 'beauty_personal_care',
    aliases: ['gents salon', 'mens salon', 'gents parlour', 'mens grooming lounge', 'saloon'],
    relatedCategories: ['Hair salon', 'Beauty salon', 'Spa'],
    coreProducts: ['Skin Fade & Taper Haircuts', 'Hot Towel Beard Sculpting', 'Charcoal De-Tan Facial', 'Head Massage & Scalp Refresh', 'Grey Blending Hair Colour'],
    customerIntentKeywords: ['barber shop near me', 'mens grooming salon {city}', 'best gents saloon'],
    visualSearchTerms: ['vintage modern barber chair grooming scissors', 'barber styling hair fade beard trim'],
    preferredTheme: 'luxe_dark',
    defaultHooks: {
      offerHeadline: 'Sharp Haircut & Hot Towel Beard Sculpting — Grooming Combo',
      showcaseHeadline: 'Precision Tapers, Classic Shaves & Revitalizing Facials',
      trustHeadline: 'The Premier Grooming Lounge for Modern Gentlemen in {city}',
      subtitle: 'Step in for a revitalizing haircut, classic hot lather shave, and skin therapy in a relaxed lounge.',
      bullets: ['Experienced Master Barbers', 'Hot Towel Aromatherapy Shaves', 'Walk-ins & Online Booking Welcome'],
      cta: 'BOOK GROOMING VISIT',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. HEALTHCARE, CLINICS & WELLNESS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:dental_clinic',
    displayName: 'Dental clinic',
    pillar: 'health_medical_wellness',
    aliases: ['dentist', 'dental hospital', 'teeth clinic', 'orthodontist'],
    relatedCategories: ['Dentist', 'Cosmetic dentist', 'Orthodontist', 'Dental laboratory'],
    coreProducts: ['Painless Root Canal Treatment (RCT)', 'Invisible Clear Aligners', 'Laser Teeth Whitening', 'Titanium Dental Implants', 'Kids Gentle Dentistry'],
    customerIntentKeywords: ['dentist near me', 'best dental clinic in {city}', 'root canal treatment cost', 'teeth whitening dental'],
    visualSearchTerms: ['modern dental clinic smiling patient dentist', 'dental care checkup clinic equipment'],
    preferredTheme: 'emerald',
    defaultHooks: {
      offerHeadline: 'Smile with Absolute Confidence — Free Dental Health Checkup',
      showcaseHeadline: 'Painless Digital Root Canals & Invisible Teeth Aligners',
      trustHeadline: 'Leading Multi-Speciality Dental Care Centre in {city}',
      subtitle: 'Advanced intra-oral scanning, gentle painless care, and stringent international sterilization protocols.',
      bullets: ['Zero-Pain Computerized Technology', '100% Autoclaved Sterilization', 'EMI Options on Implants & Braces'],
      cta: 'SCHEDULE SMILE CHECKUP',
    },
  },
  {
    id: 'gcid:eye_clinic',
    displayName: 'Eye clinic',
    pillar: 'health_medical_wellness',
    aliases: ['eye hospital', 'ophthalmologist', 'optometrist', 'optical store'],
    relatedCategories: ['Ophthalmologist', 'Optician', 'Optometrist', 'Medical clinic'],
    coreProducts: ['Computerized Vision Testing', 'Bladeless Laser Cataract Surgery', 'LASIK Specs Removal', 'Glaucoma & Retina Care', 'Designer Eyewear & Lenses'],
    customerIntentKeywords: ['eye doctor near me', 'cataract surgery cost in {city}', 'lasik laser eye clinic'],
    visualSearchTerms: ['eye clinic consultation vision test equipment', 'ophthalmologist checking patient eyes'],
    preferredTheme: 'emerald',
    defaultHooks: {
      offerHeadline: 'Clear Vision for Life — Advanced Computerized Eye Screening',
      showcaseHeadline: 'Blade-Free Micro-Incision Laser Cataract & LASIK Surgeries',
      trustHeadline: 'Trusted Eye Care Specialists & Retina Surgeons in {city}',
      subtitle: 'State-of-the-art diagnostic imaging, experienced senior surgeons, and transparent surgical packages.',
      bullets: ['Senior Ophthalmologists', 'Cashless TPA Insurance Tie-ups', 'Painless Same-Day Recovery'],
      cta: 'BOOK VISION SCREENING',
    },
  },
  {
    id: 'gcid:ayurvedic_clinic',
    displayName: 'Ayurvedic clinic',
    pillar: 'health_medical_wellness',
    aliases: ['ayurveda hospital', 'panchakarma center', 'ayurvedic doctor', 'vaidya'],
    relatedCategories: ['Alternative medicine practitioner', 'Wellness center', 'Panchakarma center', 'Doctor'],
    coreProducts: ['Traditional Panchakarma Detox', 'Joint Pain & Spine Therapy (Kati Basti)', 'Herbal Skin & Hair Treatments', 'Holistic Chronic Disease Management', 'Pure Ayurvedic Medicines'],
    customerIntentKeywords: ['ayurvedic clinic near me', 'panchakarma treatment in {city}', 'ayurvedic doctor for arthritis'],
    visualSearchTerms: ['ayurvedic herbal therapy oil massage wellness', 'traditional herbs mortar pestle ayurveda'],
    preferredTheme: 'emerald',
    defaultHooks: {
      offerHeadline: 'Heal from Within — Traditional Panchakarma & Detox Therapy',
      showcaseHeadline: '100% Natural Herbal Protocols for Joint Pain, Gut & Skin',
      trustHeadline: 'Authentic Vedic Healing & Certified Ayurvedic Doctors in {city}',
      subtitle: 'Restoring balance through customized herbal formulations, dietary therapy, and authentic Panchakarma.',
      bullets: ['Qualified BAMS/MD Ayurvedic Doctors', 'Pure Certified Herbal Oils', 'Root-Cause Holistic Healing'],
      cta: 'CONSULT AYURVEDIC DOCTOR',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. AUTOMOTIVE, REPAIRS & GARAGES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:auto_repair_shop',
    displayName: 'Auto repair shop',
    pillar: 'automotive_vehicles',
    aliases: ['car repair', 'car garage', 'car service station', 'car mechanic', 'automobile service'],
    relatedCategories: ['Car service', 'Car detailing service', 'Tire shop', 'Brake shop', 'Car inspection station'],
    coreProducts: ['Comprehensive Periodic Car Service', 'Computerized Engine Diagnostics', 'AC Gas Refill & Cooling Repair', 'Clutch & Suspension Overhaul', 'Insurance Accidental Denting-Painting'],
    customerIntentKeywords: ['car service near me', 'car mechanic in {city}', 'car ac repair price', 'auto repair garage'],
    visualSearchTerms: ['modern auto repair garage mechanic inspection', 'car diagnostic engine service workshop'],
    preferredTheme: 'amber',
    defaultHooks: {
      offerHeadline: 'Complete Periodic Car Service — Free 40-Point Safety Checkup',
      showcaseHeadline: 'Computerized Engine Diagnostics & 100% Genuine OEM Spares',
      trustHeadline: 'The Most Reliable Multi-Brand Car Service Station in {city}',
      subtitle: 'Transparent itemized estimates, synthetic oil changes, and warranty on all mechanical repairs.',
      bullets: ['100% Genuine OEM/OES Parts', 'Free Doorstep Pickup & Drop', '6-Month Mechanical Warranty'],
      cta: 'BOOK CAR SERVICE',
    },
  },
  {
    id: 'gcid:car_detailing_service',
    displayName: 'Car detailing service',
    pillar: 'automotive_vehicles',
    aliases: ['car wash', 'ceramic coating', 'ppf installation', 'car polish'],
    relatedCategories: ['Auto repair shop', 'Car wash', 'Window tinting service'],
    coreProducts: ['9H Ceramic & Graphene Coating', 'Paint Protection Film (PPF)', 'Deep Interior Steam Detailing', 'Exterior Paint Correction & Rubbing', 'Underbody Anti-Rust Coating'],
    customerIntentKeywords: ['ceramic coating cost {city}', 'car detailing studio near me', 'car ppf installation price'],
    visualSearchTerms: ['luxury car detailing ceramic coating glossy finish', 'car polish buffer paint protection'],
    preferredTheme: 'luxe_dark',
    defaultHooks: {
      offerHeadline: 'Mirror-Like Showroom Shine — Ceramic Coating & PPF Package',
      showcaseHeadline: 'Self-Healing TPU Film & 9H Graphene Scratch Protection',
      trustHeadline: 'Certified Auto Detailing & Paint Protection Studio in {city}',
      subtitle: 'Shield your car’s paint from stone chips, UV fading, and swirl marks with international detailing coatings.',
      bullets: ['5-Year Certified Warranty', 'Self-Healing TPU Technology', 'Dust-Free Climate-Controlled Bay'],
      cta: 'CLAIM DETAILING DISCOUNT',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. IT, SOFTWARE & DIGITAL SERVICES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:software_company',
    displayName: 'Software company',
    pillar: 'it_software_digital',
    aliases: [
      'it company',
      'software development company',
      'it firm',
      'tech agency',
      'information technology company',
      'it service',
      'it services',
      'software developer',
      'software services',
      'fieseros',
      'serviceos',
    ],
    relatedCategories: ['Website designer', 'Computer consultant', 'Internet marketing service', 'Data recovery service'],
    coreProducts: ['Custom Web Application Development', 'iOS & Android Native Mobile Apps', 'Enterprise Cloud & SaaS Architecture', 'AI & Business Process Automation', 'Dedicated Dev Teams & AMC'],
    customerIntentKeywords: ['software company in {city}', 'custom app development cost', 'best it firm for startups'],
    visualSearchTerms: ['modern tech software development agency workspace', 'programming code screen cloud analytics'],
    preferredTheme: 'cyber_tech',
    defaultHooks: {
      offerHeadline: 'Scale Your Business Operations with Custom Software & Apps',
      showcaseHeadline: 'Engineered for Performance, High Concurrency & Bulletproof Security',
      trustHeadline: 'Top-Rated Digital Product & Cloud Engineering Firm in {city}',
      subtitle: 'From MVP prototypes to enterprise SaaS platforms, we architect scalable software with high ROI.',
      bullets: ['Modern Tech Stack (Next.js, Node, Cloud)', 'Fixed Cost & Agile Sprint Models', 'Dedicated Post-Launch Support'],
      cta: 'DISCUSS YOUR PROJECT',
    },
  },
  {
    id: 'gcid:security_system_supplier',
    displayName: 'Security system supplier',
    pillar: 'it_software_digital',
    aliases: ['cctv dealer', 'cctv installation', 'surveillance camera store', 'biometric attendance dealer'],
    relatedCategories: ['Electrician', 'Electronics store', 'Home automation company'],
    coreProducts: ['4K HD Color Night Vision CCTV', 'Biometric Fingerprint & Face Attendance', 'Smart Video Door Phones', 'Intruder Alarm & Perimeter Sensors', 'Wireless WiFi Security Cameras'],
    customerIntentKeywords: ['cctv camera installation in {city}', 'cctv camera price with installation', 'biometric attendance machine'],
    visualSearchTerms: ['modern cctv security camera surveillance monitoring', 'biometric access control smart building'],
    preferredTheme: 'cyber_tech',
    defaultHooks: {
      offerHeadline: 'Smart CCTV Camera Package with Installation — Special Discount',
      showcaseHeadline: '24/7 Color Night Vision & Mobile Live View Surveillance',
      trustHeadline: 'Leading Security & Surveillance System Integrator in {city}',
      subtitle: 'Protect your home, retail store, and factory with crystal-clear 4K HD recording and smartphone streaming.',
      bullets: ['Free On-Site Site Survey', '2-Year Direct Brand Replacement', 'Remote Mobile Live Viewing App'],
      cta: 'REQUEST CCTV ESTIMATE',
    },
  },
  {
    id: 'gcid:security_service',
    displayName: 'Security service',
    pillar: 'security_safety_services',
    aliases: [
      'security services',
      'security guard service',
      'security guard agency',
      'security guard',
      'emergency sos',
      'sos app',
      'emergency security',
      'security patrol',
      'event security',
      'bodyguard service',
      'bouncer service',
      'private security',
      'security company',
      'armed guard service',
      'facility security',
    ],
    relatedCategories: ['Security guard service', 'Security system supplier', 'Surveillance service'],
    coreProducts: [
      '24/7 Trained Security Guards',
      'Rapid SOS Emergency Response',
      'Commercial & Residential Patrol',
      'CCTV Monitoring & Surveillance',
      'Event & VIP Personal Protection',
    ],
    customerIntentKeywords: [
      'security service in {city}',
      'security guard agency {city}',
      'emergency sos security service',
      'hire security guards in {city}',
      'commercial security services {city}',
    ],
    visualSearchTerms: [
      'professional security guard uniform patrol officer',
      'emergency security response protection team',
      'security operations surveillance control center',
      'corporate event security guard protection',
    ],
    preferredTheme: 'cyber_tech',
    defaultHooks: {
      offerHeadline: '24/7 Professional Security & Emergency Protection in {city}',
      showcaseHeadline: 'Certified Armed & Unarmed Security Guards and Quick-Response SOS in {city}',
      trustHeadline: 'Top-Rated Government PSARA Licensed Security Agency in {city}',
      subtitle: 'Protecting your commercial premises, residential communities, and personal safety with verified, trained security professionals.',
      bullets: [
        '24/7 Rapid SOS Emergency Response',
        'Verified & Trained Security Personnel',
        'Government PSARA Licensed & Insured',
        'Residential, Commercial & Event Safety',
      ],
      cta: 'HIRE SECURITY GUARDS',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. ELECTRICAL, SOLAR & HOME SERVICES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:solar_energy_contractor',
    displayName: 'Solar energy contractor',
    pillar: 'home_electrical_services',
    aliases: ['solar panel installation', 'solar company', 'rooftop solar dealer', 'solar power system'],
    relatedCategories: ['Electrician', 'Roofing contractor', 'Renewable energy equipment supplier'],
    coreProducts: ['On-Grid Rooftop Solar Systems', 'Hybrid Solar with Lithium Inverter', 'Government Subsidy Paperwork (PM Surya Ghar)', 'Commercial & Industrial Solar Plants', 'Solar Water Heaters & Pumps'],
    customerIntentKeywords: ['solar panel price in {city}', 'rooftop solar subsidy registration', 'best solar company near me'],
    visualSearchTerms: ['rooftop solar panel installation clean energy', 'solar panels blue sky green energy'],
    preferredTheme: 'emerald',
    defaultHooks: {
      offerHeadline: 'Cut Your Electricity Bill to Zero — Rooftop Solar with Subsidy',
      showcaseHeadline: 'High-Efficiency Mono PERC Half-Cut Panels with 25-Year Warranty',
      trustHeadline: 'Certified Rooftop Solar EPC Contractor in {city}',
      subtitle: 'Complete turnkey installation with government subsidy filing, net metering approvals, and zero-headache execution.',
      bullets: ['Up to ₹78,000 Govt Subsidy Support', '25-Year Performance Guarantee', 'Zero-Cost EMI Financing Available'],
      cta: 'CHECK SOLAR SUBSIDY',
    },
  },
  {
    id: 'gcid:electrician',
    displayName: 'Electrician',
    pillar: 'home_electrical_services',
    aliases: ['electrical contractor', 'electrical repair service', 'house wiring'],
    relatedCategories: ['Plumber', 'HVAC contractor', 'Appliance repair service'],
    coreProducts: ['Complete House Concealed Wiring', 'Short Circuit & MCB Tripping Fixes', 'Inverter & Battery Wiring', 'Chandelier & Decorative Light Setup', 'Appliance Power Outlets & Earthing'],
    customerIntentKeywords: ['electrician near me', 'electrician in {city}', 'emergency electrical repair'],
    visualSearchTerms: ['professional electrician electrical panel wiring multimeter', 'electrician repairing lighting switchboard'],
    preferredTheme: 'amber',
    defaultHooks: {
      offerHeadline: 'Fast Doorstep Electrical Repair & Wiring — Within 45 Minutes',
      showcaseHeadline: 'Certified Master Electricians with Transparent Flat Rates',
      trustHeadline: 'The Most Dependable Electrical Service Team in {city}',
      subtitle: 'Safe, verified, and certified electricians equipped for all residential and commercial repairs.',
      bullets: ['45-Minute Rapid Doorstep Visit', '30-Day Service Guarantee', 'Standard Transparent Price Rate Card'],
      cta: 'BOOK ELECTRICIAN NOW',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. FASHION, APPAREL & JEWELLERY
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:jewelry_store',
    displayName: 'Jewelry store',
    pillar: 'fashion_apparel_jewellery',
    aliases: ['jeweller', 'gold shop', 'diamond jewellery store', 'jewellery showroom'],
    relatedCategories: ['Watch store', 'Boutique', 'Gift shop'],
    coreProducts: ['BIS Hallmarked 916 Gold Jewellery', 'IGI Certified Diamond Solitaires', 'Bridal Antique Kundan Sets', 'Pure 925 Sterling Silver Articles', 'Lightweight Daily Wear Chains & Rings'],
    customerIntentKeywords: ['jewellery shop near me', 'best gold jeweller in {city}', 'hallmark gold jewellery collection'],
    visualSearchTerms: ['luxury pure gold diamond jewellery necklace display', 'indian bridal gold jewelry festive'],
    preferredTheme: 'royal_gold',
    defaultHooks: {
      offerHeadline: 'Festive Gold & Diamond Showcase — Zero Making Charges on Select Items',
      showcaseHeadline: '100% BIS Hallmarked 916 Pure Gold & Certified Solitaires',
      trustHeadline: 'Decades of Uncompromising Purity, Trust & Craftsmanship in {city}',
      subtitle: 'Explore handcrafted royal bridal collections, everyday lightweight jewelry, and investment gold coins.',
      bullets: ['100% BIS Hallmarked 916 Purity', 'Certified Natural Diamonds', 'Transparent Weight & Purity Billing'],
      cta: 'EXPLORE GOLD COLLECTION',
    },
  },
  {
    id: 'gcid:boutique',
    displayName: 'Boutique',
    pillar: 'fashion_apparel_jewellery',
    aliases: ['clothing boutique', 'fashion boutique', 'designer studio', 'ladies boutique'],
    relatedCategories: ['Clothing store', 'Women’s clothing store', 'Dressmaker', 'Tailor'],
    coreProducts: ['Handcrafted Designer Bridal Lehengas', 'Pure Silk & Banarasi Sarees', 'Custom Tailored Anarkalis & Kurtis', 'Indo-Western Party Wear', 'Custom Sizing & Embroidery'],
    customerIntentKeywords: ['boutique near me', 'designer bridal lehenga {city}', 'custom tailoring boutique'],
    visualSearchTerms: ['designer fashion boutique apparel ethnic wear', 'luxury bridal lehenga saree rack'],
    preferredTheme: 'rose_chic',
    defaultHooks: {
      offerHeadline: 'New Festive Designer Collection — Limited Edition Ethnic Wear',
      showcaseHeadline: 'Handcrafted Silks, Royal Zari Work & Custom Designer Tailoring',
      trustHeadline: 'The Go-To Fashion Boutique for Statement Ethnic Wear in {city}',
      subtitle: 'Celebrate your elegance with custom bridal couture, pure silk drapes, and perfect bespoke fitting.',
      bullets: ['Exclusive One-of-a-Kind Pieces', 'Custom Hand Embroidery & Fitting', 'Worldwide Courier Available'],
      cta: 'VIEW BOUTIQUE LOOKBOOK',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. PROFESSIONAL, FINANCE & LEGAL
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:chartered_accountant',
    displayName: 'Chartered accountant',
    pillar: 'professional_legal_finance',
    aliases: ['ca firm', 'tax consultant', 'gst consultant', 'accounting firm'],
    relatedCategories: ['Tax preparation service', 'Accounting firm', 'Financial consultant', 'Legal services'],
    coreProducts: ['GST Registration & Monthly Return Filing', 'Income Tax Return (ITR) Preparation', 'Company Incorporation & ROC Filing', 'Statutory Audit & Tax Audit', 'Project Reports & Bank Loan Advisory'],
    customerIntentKeywords: ['ca near me', 'chartered accountant in {city}', 'gst return filing fee', 'itr filing consultant'],
    visualSearchTerms: ['professional chartered accountant finance office desk', 'tax consultation audit reports laptop'],
    preferredTheme: 'trust_amber',
    defaultHooks: {
      offerHeadline: 'Zero-Penalty GST & Tax Filing — Maximize Your Enterprise Savings',
      showcaseHeadline: 'Certified Corporate Tax Audits, ROC Filings & Startup Advisory',
      trustHeadline: 'Trusted Chartered Accountants & Financial Advisors in {city}',
      subtitle: 'Ensure 100% tax compliance, smooth audits, and proactive tax saving strategies from senior CAs.',
      bullets: ['Zero Delay Penalty Guarantee', 'Strategic Legal Tax Deductions', 'Complete Confidential Financial Care'],
      cta: 'CONSULT A SENIOR CA',
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10. REAL ESTATE & ARCHITECTURE
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'gcid:interior_designer',
    displayName: 'Interior designer',
    pillar: 'real_estate_interiors',
    aliases: ['interior decorator', 'interior design studio', 'modular interior contractor'],
    relatedCategories: ['Architect', 'Modular home builder', 'Kitchen remodeler', 'Furniture maker'],
    coreProducts: ['Modular Kitchen with German Hardware', 'Turnkey 2BHK/3BHK Home Interiors', 'Designer False Ceiling & Ambient Lighting', 'Custom Wardrobes & TV Units', 'Commercial Office & Retail Interiors'],
    customerIntentKeywords: ['interior designer in {city}', 'modular kitchen price', 'turnkey interior contractor cost'],
    visualSearchTerms: ['luxury modern living room interior design', 'sleek modular kitchen island cabinetry'],
    preferredTheme: 'sand',
    defaultHooks: {
      offerHeadline: 'Turnkey Luxury Home Interiors — Free 3D Design Consultation',
      showcaseHeadline: 'Custom Modular Kitchens, Wardrobes & False Ceilings in 45 Days',
      trustHeadline: 'Top-Rated Residential & Commercial Interior Studio in {city}',
      subtitle: 'From 3D photorealistic designs to on-site execution with a 10-year warranty on all modular woodwork.',
      bullets: ['Free 3D Architectural Renders', 'Guaranteed 45-Day Handover', '10-Year Hardware & Board Warranty'],
      cta: 'BOOK 3D CONSULTATION',
    },
  },
];
