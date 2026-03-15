import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const TARGET_DIRS = [
  'c:\\Users\\lotus\\Documents\\369\\369studios\\public\\3six9\\product photos',
  'c:\\Users\\lotus\\Documents\\369\\369studios\\public\\3six9\\logos'
];

async function run() {
  try {
    let totalConverted = 0;
    
    for (const targetDir of TARGET_DIRS) {
      console.log(`\nReading directory: ${targetDir}`);
      
      let files;
      try {
        files = await fs.readdir(targetDir);
      } catch (err) {
        console.error(`Could not read directory ${targetDir}: ${err.message}`);
        continue;
      }
      
      let converted = 0;
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          const inputPath = path.join(targetDir, file);
          const fileNameWithoutExt = path.basename(file, ext);
          const outputPath = path.join(targetDir, `${fileNameWithoutExt}.webp`);
          
          console.log(`Converting: ${file}...`);
          
          // Convert to lossless webp
          await sharp(inputPath)
            .webp({ lossless: true })
            .toFile(outputPath);
            
          // Delete the original file
          await fs.unlink(inputPath);
          
          console.log(`Successfully converted and replaced: ${file} -> ${fileNameWithoutExt}.webp`);
          converted++;
          totalConverted++;
        }
      }
      
      console.log(`Converted ${converted} image(s) in this directory.`);
    }
    
    console.log(`\nFinished! Successfully converted a total of ${totalConverted} image(s) to lossless WebP.`);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();
