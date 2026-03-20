import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Try to read from Firestore first (the CMS manages data there)
        // We check if Firebase env vars are configured before attempting
        if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            try {
                const { compileGalleryData } = await import('@/lib/firestore');
                const firestoreData = await compileGalleryData();

                if (firestoreData && firestoreData.length > 0) {
                    return NextResponse.json(firestoreData, {
                        headers: {
                            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                        },
                    });
                }
            } catch (firestoreError) {
                console.warn('Firestore fetch failed, falling back to gallery.json:', firestoreError);
            }
        }

        // Fallback: use the static gallery.json
        const galleryData = await import('@/data/gallery.json');
        return NextResponse.json(galleryData.default || galleryData, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Error reading gallery data:', error);
        return NextResponse.json(
            { error: 'Failed to read gallery data.' },
            { status: 500 }
        );
    }
}
