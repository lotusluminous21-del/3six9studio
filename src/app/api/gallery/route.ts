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
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const galleryData = categories.map((category, index) => {
            const categoryPath = path.join(mediaBaseDir, category);
            const files = fs.readdirSync(categoryPath).filter(f => !f.startsWith('.'));
            
            // Map files to valid URLs and detect type
            const gallery = files.map(file => {
                const ext = path.extname(file).toLowerCase();
                const basename = path.parse(file).name;
                let type = 'image';
                let thumbUrl = `/3six9/${category}/${file}`; // fallback to original

                if (['.mp4', '.webm'].includes(ext)) {
                    type = 'video';
                    const potentialThumb = path.join(publicDir, 'thumbnails', category, `${basename}.thumb.mp4`);
                    if (fs.existsSync(potentialThumb)) {
                        thumbUrl = `/thumbnails/${category}/${basename}.thumb.mp4`;
                    }
                } else if (['.mp3', '.wav'].includes(ext)) {
                    type = 'audio';
                } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                    const potentialThumb = path.join(publicDir, 'thumbnails', category, `${basename}.thumb.jpg`);
                    if (fs.existsSync(potentialThumb)) {
                        thumbUrl = `/thumbnails/${category}/${basename}.thumb.jpg`;
                    }
                }
                
                return {
                    type,
                    url: `/3six9/${category}/${file}`,
                    thumbnail: thumbUrl
                };
            });

            // If empty, return null or handle gracefully
            if (gallery.length === 0) return null;

            // Use thumbnail for card cover (image field) to massively improve R3F performance
            return {
                id: index,
                title: category.toUpperCase(),
                subtitle: `COLLECTION ${index + 1}`,
                image: gallery[0].thumbnail, 
                gallery: gallery
            };
        }).filter(Boolean); // Remove any null empty categories

        return NextResponse.json(galleryData);
    } catch (error) {
        console.error('Error reading gallery directory:', error);
        return NextResponse.json({ error: 'Failed to read gallery data' }, { status: 500 });
    }
}
