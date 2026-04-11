// Quick script to check portfolio_collections in Firestore for corrupted URLs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Use default credentials (gcloud auth)
initializeApp({ projectId: 'six9studio', storageBucket: 'six9studio.firebasestorage.app' });

const db = getFirestore();
const bucket = getStorage().bucket();

async function main() {
    console.log('=== Checking portfolio_collections ===\n');
    
    const collectionsSnap = await db.collection('portfolio_collections').orderBy('order').get();
    
    for (const doc of collectionsSnap.docs) {
        const data = doc.data();
        console.log(`Collection: "${data.title}" (id: ${doc.id})`);
        console.log(`  Cover image: ${data.image}`);
        console.log(`  Visible: ${data.visible}`);
        
        // Check if cover image URL has double-encoded chars
        if (data.image && data.image.includes('%2520')) {
            console.log('  ⚠️  DOUBLE-ENCODED URL DETECTED in cover image!');
        }
        
        // Check gallery items
        const itemsSnap = await db.collection('portfolio_collections').doc(doc.id).collection('items').orderBy('order').get();
        console.log(`  Items: ${itemsSnap.size}`);
        
        for (const itemDoc of itemsSnap.docs) {
            const item = itemDoc.data();
            const hasDoubleEncode = item.url && item.url.includes('%2520');
            const isVideo = item.type === 'video';
            if (hasDoubleEncode || isVideo) {
                console.log(`    - [${item.type}] ${itemDoc.id}: ${item.url?.substring(0, 80)}...`);
                if (hasDoubleEncode) console.log('      ⚠️  DOUBLE-ENCODED URL!');
            }
        }
        console.log('');
    }
    
    // Also check what's in storage under the "short films" path
    console.log('=== Checking Storage files under 3six9/ ===\n');
    try {
        const [files] = await bucket.getFiles({ prefix: '3six9/', maxResults: 50 });
        for (const file of files) {
            console.log(`  ${file.name} (${(file.metadata.size / 1024 / 1024).toFixed(1)} MB)`);
        }
    } catch (e) {
        console.log('  Could not list storage:', e.message);
    }
}

main().catch(console.error);
