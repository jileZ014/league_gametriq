// Simple SVG-based icon generator for PWA
// This creates basketball-themed icons in various sizes

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgTemplate = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#ff9800" rx="${size * 0.15}"/>
  
  <!-- Basketball icon -->
  <g transform="translate(${size/2}, ${size/2})">
    <!-- Ball outline -->
    <circle cx="0" cy="0" r="${size * 0.35}" fill="none" stroke="#ffffff" stroke-width="${size * 0.03}"/>
    
    <!-- Basketball lines -->
    <path d="M ${-size * 0.35} 0 Q 0 ${-size * 0.2} ${size * 0.35} 0" fill="none" stroke="#ffffff" stroke-width="${size * 0.02}"/>
    <path d="M ${-size * 0.35} 0 Q 0 ${size * 0.2} ${size * 0.35} 0" fill="none" stroke="#ffffff" stroke-width="${size * 0.02}"/>
    <line x1="${-size * 0.35}" y1="0" x2="${size * 0.35}" y2="0" stroke="#ffffff" stroke-width="${size * 0.02}"/>
    <line x1="0" y1="${-size * 0.35}" x2="0" y2="${size * 0.35}" stroke="#ffffff" stroke-width="${size * 0.02}"/>
  </g>
  
  <!-- GameTriq text for larger icons -->
  ${size >= 192 ? `
  <text x="${size/2}" y="${size * 0.9}" font-family="Arial, sans-serif" font-size="${size * 0.08}" font-weight="bold" text-anchor="middle" fill="#ffffff">
    GameTriq
  </text>
  ` : ''}
</svg>`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname);
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
sizes.forEach(size => {
  const svg = svgTemplate(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated ${filename}`);
});

// Generate maskable icon template
const maskableSvg = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Safe area background (80% of icon) -->
  <rect width="${size}" height="${size}" fill="#ff9800"/>
  
  <!-- Basketball icon in safe area -->
  <g transform="translate(${size/2}, ${size/2})">
    <!-- Ball outline -->
    <circle cx="0" cy="0" r="${size * 0.28}" fill="none" stroke="#ffffff" stroke-width="${size * 0.025}"/>
    
    <!-- Basketball lines -->
    <path d="M ${-size * 0.28} 0 Q 0 ${-size * 0.16} ${size * 0.28} 0" fill="none" stroke="#ffffff" stroke-width="${size * 0.015}"/>
    <path d="M ${-size * 0.28} 0 Q 0 ${size * 0.16} ${size * 0.28} 0" fill="none" stroke="#ffffff" stroke-width="${size * 0.015}"/>
    <line x1="${-size * 0.28}" y1="0" x2="${size * 0.28}" y2="0" stroke="#ffffff" stroke-width="${size * 0.015}"/>
    <line x1="0" y1="${-size * 0.28}" x2="0" y2="${size * 0.28}" stroke="#ffffff" stroke-width="${size * 0.015}"/>
  </g>
</svg>`;

// Generate maskable icons
sizes.forEach(size => {
  const svg = maskableSvg(size);
  const filename = path.join(iconsDir, `icon-maskable-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated maskable ${filename}`);
});

console.log('\nIcon generation complete!');
console.log('Note: For production, convert these SVGs to PNG format using a tool like:');
console.log('- ImageMagick: convert icon.svg icon.png');
console.log('- Online converters: svgtopng.com');
console.log('- Or use a build tool like sharp or jimp');