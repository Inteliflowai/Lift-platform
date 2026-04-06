/**
 * Generate PWA placeholder icons
 * Usage: npx tsx scripts/generate-icons.ts
 * Creates SVG-based placeholder icons at public/icons/
 */
import { writeFileSync } from "fs";

function createSVG(size: number): string {
  const fontSize = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#6366f1"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${fontSize}" font-weight="800">LIFT</text>
</svg>`;
}

// Write as SVG files (browsers accept SVG for PWA icons in many cases)
// For full PNG support, replace these with actual PNG exports
writeFileSync("public/icons/icon-192.png", createSVG(192));
writeFileSync("public/icons/icon-512.png", createSVG(512));
writeFileSync("public/icons/icon-512-maskable.png", createSVG(512));

console.log("Icons generated (SVG placeholders). Replace with actual PNGs for production.");
