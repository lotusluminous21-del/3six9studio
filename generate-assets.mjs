import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const SVG_PATH = path.join(process.cwd(), 'public', '3six9studios logomark.svg');
const OUT_DIR = path.join(process.cwd(), 'src', 'app');

async function generateAssets() {
  try {
    const svgBuffer = await fs.readFile(SVG_PATH);

    console.log('Generating opengraph-image.png...');
    await sharp(svgBuffer)
      .resize(1200, 630, {
        fit: 'contain',
        background: { r: 15, g: 15, b: 15, alpha: 1 } // Dark background
      })
      .png()
      .toFile(path.join(OUT_DIR, 'opengraph-image.png'));

    console.log('Generating twitter-image.png...');
    // Next.js uses opengraph-image for twitter if Twitter isn't explicitly set, 
    // but generating both ensures maximum compatibility and control.
    await sharp(svgBuffer)
      .resize(1200, 630, {
        fit: 'contain',
        background: { r: 15, g: 15, b: 15, alpha: 1 }
      })
      .png()
      .toFile(path.join(OUT_DIR, 'twitter-image.png'));

    console.log('Generating apple-icon.png...');
    await sharp(svgBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 15, g: 15, b: 15, alpha: 1 }
      })
      .png()
      .toFile(path.join(OUT_DIR, 'apple-icon.png'));

    console.log('All assets generated successfully.');
  } catch (error) {
    console.error('Error generating assets:', error);
    process.exit(1);
  }
}

generateAssets();
