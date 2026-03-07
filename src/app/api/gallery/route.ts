import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export async function GET() {
    try {
        const publicDir = path.join(process.cwd(), 'public');
        const mediaBaseDir = path.join(publicDir, '3six9');
        
        // Read top-level directories
        const entries = fs.readdirSync(mediaBaseDir, { withFileTypes: true });
        const categories = entries
            .filter(dirent => dirent.isDirectory() && dirent.name.toLowerCase() !== 'music')
            .map(dirent => dirent.name);

        const galleryData = categories.map((category, index) => {
            const categoryPath = path.join(mediaBaseDir, category);
            const files = fs.readdirSync(categoryPath);
            
            // Map files to valid URLs and detect type
            const gallery = files.map(file => {
                const ext = path.extname(file).toLowerCase();
                let type = 'image';
                if (['.mp4', '.webm'].includes(ext)) {
                    type = 'video';
                } else if (['.mp3', '.wav'].includes(ext)) {
                    type = 'audio';
                }
                
                return {
                    type,
                    url: `/3six9/${category}/${file}`
                };
            });

            // If empty, return null or handle gracefully
            if (gallery.length === 0) return null;

            // First item used for card cover
            return {
                id: index,
                title: category.toUpperCase(),
                subtitle: `COLLECTION ${index + 1}`,
                image: gallery[0].url, // Will be handled correctly in FloatingCards for videos/audio
                gallery: gallery
            };
        }).filter(Boolean); // Remove any null empty categories

        return NextResponse.json(galleryData);
    } catch (error) {
        console.error('Error reading gallery directory:', error);
        return NextResponse.json({ error: 'Failed to read gallery data' }, { status: 500 });
    }
}
