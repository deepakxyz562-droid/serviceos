const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '../gptform-mobile-app/assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// 1. App Icon SVG (1024 x 1024)
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#090D16" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>

    <!-- Radial Glow Behind N -->
    <radialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#10B981" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#090D16" stop-opacity="0" />
    </radialGradient>

    <!-- Left Pillar Gradient (Indigo -> Violet) -->
    <linearGradient id="leftPillar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>

    <!-- Diagonal Bridge Gradient (Electric Violet -> Cyan -> Emerald) -->
    <linearGradient id="diagonalBridge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="45%" stop-color="#6366F1" />
      <stop offset="75%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>

    <!-- Right Pillar Gradient (Emerald -> Teal) -->
    <linearGradient id="rightPillar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Specular Highlight Overlay -->
    <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <!-- Border Ring Glow -->
    <linearGradient id="borderGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.6" />
      <stop offset="50%" stop-color="#10B981" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0.1" />
    </linearGradient>
  </defs>

  <!-- Base Dark Canvas -->
  <rect width="1024" height="1024" rx="224" fill="url(#bgGrad)" />

  <!-- Ambient Glow Core -->
  <circle cx="512" cy="512" r="420" fill="url(#ambientGlow)" />

  <!-- Subtle Border Stroke -->
  <rect x="8" y="8" width="1008" height="1008" rx="216" fill="none" stroke="url(#borderGlow)" stroke-width="6" />

  <!-- Geometric Nuvora Mark Group -->
  <g transform="translate(512, 512) scale(1.05) translate(-512, -512)">
    <!-- Ambient Shadow Under Emblem -->
    <path d="M 270,720 L 754,720" stroke="#000000" stroke-width="60" stroke-linecap="round" opacity="0.4" filter="blur(24px)" />

    <!-- 1. Left Upright Pillar -->
    <rect x="250" y="270" width="124" height="484" rx="44" fill="url(#leftPillar)" />
    <!-- Highlight sheen on left pillar -->
    <rect x="256" y="276" width="40" height="240" rx="20" fill="url(#highlightGrad)" />

    <!-- 2. Dynamic Diagonal Prism Sweeping Down -->
    <path d="M 280,280 L 374,270 L 774,700 L 680,754 Z"
          fill="url(#diagonalBridge)" />

    <!-- 3. Right Upright Pillar -->
    <rect x="650" y="270" width="124" height="484" rx="44" fill="url(#rightPillar)" />
    <!-- Highlight sheen on right pillar -->
    <rect x="656" y="276" width="40" height="240" rx="20" fill="url(#highlightGrad)" />

    <!-- 4. Overlapping Fusion Caps (gives high-end 3D ribbon depth) -->
    <circle cx="312" cy="332" r="62" fill="url(#leftPillar)" />
    <circle cx="712" cy="692" r="62" fill="url(#rightPillar)" />

    <!-- 5. Floating Accent Star (Innovation & AI Copilot Spark) -->
    <g transform="translate(760, 240)">
      <path d="M 0,-24 Q 0,0 24,0 Q 0,0 0,24 Q 0,0 -24,0 Q 0,0 0,-24 Z" fill="#38BDF8" opacity="0.9" />
      <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
    </g>
  </g>
</svg>
`;

// 2. Adaptive Icon (Foreground only, 1024 x 1024)
const adaptiveIconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="leftPillar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="diagonalBridge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="45%" stop-color="#6366F1" />
      <stop offset="75%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
    <linearGradient id="rightPillar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>
  </defs>

  <g transform="translate(512, 512) scale(0.72) translate(-512, -512)">
    <rect x="250" y="270" width="124" height="484" rx="44" fill="url(#leftPillar)" />
    <rect x="256" y="276" width="40" height="240" rx="20" fill="url(#highlightGrad)" />
    <path d="M 280,280 L 374,270 L 774,700 L 680,754 Z" fill="url(#diagonalBridge)" />
    <rect x="650" y="270" width="124" height="484" rx="44" fill="url(#rightPillar)" />
    <rect x="656" y="276" width="40" height="240" rx="20" fill="url(#highlightGrad)" />
    <circle cx="312" cy="332" r="62" fill="url(#leftPillar)" />
    <circle cx="712" cy="692" r="62" fill="url(#rightPillar)" />
    <g transform="translate(760, 240)">
      <path d="M 0,-24 Q 0,0 24,0 Q 0,0 0,24 Q 0,0 -24,0 Q 0,0 0,-24 Z" fill="#38BDF8" />
      <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
    </g>
  </g>
</svg>
`;

// 3. Splash Screen SVG (1284 x 2778) - iPhone 14/15/16 Pro Max resolution
const splashSvg = `
<svg width="1284" height="2778" viewBox="0 0 1284 2778" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="40%" stop-color="#080C14" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>

    <radialGradient id="splashGlow" cx="50%" cy="44%" r="40%">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.28" />
      <stop offset="50%" stop-color="#10B981" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#080C14" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="leftPillar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="diagonalBridge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="45%" stop-color="#6366F1" />
      <stop offset="75%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
    <linearGradient id="rightPillar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Full Background -->
  <rect width="1284" height="2778" fill="url(#splashBg)" />

  <!-- Center Ambient Radial Halo -->
  <circle cx="642" cy="1200" r="700" fill="url(#splashGlow)" />

  <!-- Emblem Center Group -->
  <g transform="translate(642, 1160) scale(0.48) translate(-512, -512)">
    <rect x="250" y="270" width="124" height="484" rx="44" fill="url(#leftPillar)" />
    <rect x="256" y="276" width="40" height="240" rx="20" fill="url(#highlightGrad)" />
    <path d="M 280,280 L 374,270 L 774,700 L 680,754 Z" fill="url(#diagonalBridge)" />
    <rect x="650" y="270" width="124" height="484" rx="44" fill="url(#rightPillar)" />
    <rect x="656" y="276" width="40" height="240" rx="20" fill="url(#highlightGrad)" />
    <circle cx="312" cy="332" r="62" fill="url(#leftPillar)" />
    <circle cx="712" cy="692" r="62" fill="url(#rightPillar)" />
    <g transform="translate(760, 240)">
      <path d="M 0,-24 Q 0,0 24,0 Q 0,0 0,24 Q 0,0 -24,0 Q 0,0 0,-24 Z" fill="#38BDF8" />
      <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
    </g>
  </g>

  <!-- Typography: N U V O R A -->
  <text x="642" y="1460"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
        font-size="64"
        font-weight="800"
        letter-spacing="14"
        fill="#FFFFFF"
        text-anchor="middle">
    NUVORA
  </text>

  <!-- Tagline -->
  <text x="642" y="1530"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif"
        font-size="24"
        font-weight="500"
        letter-spacing="3"
        fill="#94A3B8"
        text-anchor="middle">
    BUSINESS MANAGEMENT OS
  </text>

  <!-- Bottom Accent Pill -->
  <g transform="translate(642, 2480)">
    <rect x="-180" y="-24" width="360" height="48" rx="24" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
    <text x="0" y="7"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
          font-size="16"
          font-weight="600"
          letter-spacing="1.5"
          fill="#38BDF8"
          text-anchor="middle">
      ADAPTIVE · FAST · SECURE
    </text>
  </g>
</svg>
`;

const PUBLIC_DIR = path.join(__dirname, '../public');

async function buildAssets() {
  console.log('Rendering Nuvora App Assets...');

  // Mobile Assets
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('✔ Created mobile assets/icon.png (1024x1024)');

  await sharp(Buffer.from(adaptiveIconSvg))
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('✔ Created mobile assets/adaptive-icon.png (1024x1024)');

  await sharp(Buffer.from(splashSvg))
    .resize(1284, 2778)
    .png({ quality: 100 })
    .toFile(path.join(ASSETS_DIR, 'splash.png'));
  console.log('✔ Created mobile assets/splash.png (1284x2778)');

  await sharp(Buffer.from(iconSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('✔ Created mobile assets/favicon.png (48x48)');

  // Web Public Assets
  if (fs.existsSync(PUBLIC_DIR)) {
    await sharp(Buffer.from(iconSvg))
      .resize(512, 512)
      .png({ quality: 100 })
      .toFile(path.join(PUBLIC_DIR, 'brand-icon.png'));
    console.log('✔ Created web public/brand-icon.png (512x512)');

    await sharp(Buffer.from(iconSvg))
      .resize(192, 192)
      .png({ quality: 100 })
      .toFile(path.join(PUBLIC_DIR, 'icon-192.png'));
    console.log('✔ Created web public/icon-192.png (192x192)');

    await sharp(Buffer.from(iconSvg))
      .resize(512, 512)
      .png({ quality: 100 })
      .toFile(path.join(PUBLIC_DIR, 'icon-512.png'));
    console.log('✔ Created web public/icon-512.png (512x512)');

    await sharp(Buffer.from(iconSvg))
      .resize(32, 32)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon.png'));
    console.log('✔ Created web public/favicon.png (32x32)');

    fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), iconSvg.trim());
    console.log('✔ Created web public/icon.svg');
  }

  console.log('All Nuvora branding assets successfully compiled!');
}

buildAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
