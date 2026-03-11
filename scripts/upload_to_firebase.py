import os
import json
import urllib.parse
from pathlib import Path
from firebase_admin import credentials, initialize_app, storage
import argparse
import sys

def upload_file_to_firebase(bucket, local_path, destination_blob_name):
    """Uploads a file to the bucket and makes it public."""
    blob = bucket.blob(destination_blob_name)
    
    # Check if exists to avoid re-uploading every time during testing
    if blob.exists():
        print(f"Skipping {destination_blob_name} (already exists)")
        blob.make_public()
        return blob.public_url

    print(f"Uploading {local_path} to {destination_blob_name}...")
    blob.upload_from_filename(local_path, timeout=600)
    blob.make_public()
    return blob.public_url

def main():
    parser = argparse.ArgumentParser(description='Upload media to Firebase Storage')
    parser.add_argument('--key', type=str, required=True, help='Path to Firebase Service Account JSON key')
    args = parser.parse_args()

    key_path = args.key
    if not os.path.exists(key_path):
        print(f"Error: Service account key not found at {key_path}")
        sys.exit(1)

    # Initialize Firebase
    cred = credentials.Certificate(key_path)
    # The bucket name gs://six9studio.firebasestorage.app without the gs:// protocol
    bucket_name = 'six9studio.firebasestorage.app'
    try:
        initialize_app(cred, {'storageBucket': bucket_name})
    except ValueError:
        pass # Already initialized

    bucket = storage.bucket()

    base_dir = Path(__file__).parent.parent
    public_dir = base_dir / 'public'
    media_base_dir = public_dir / '3six9'
    thumbnails_dir = public_dir / 'thumbnails'
    
    if not media_base_dir.exists():
        print(f"Error: Directory {media_base_dir} not found.")
        sys.exit(1)

    gallery_data = []
    
    # Get all categories
    categories = [d.name for d in media_base_dir.iterdir() if d.is_dir()]
    
    for index, category in enumerate(categories):
        category_path = media_base_dir / category
        files = [f for f in category_path.iterdir() if f.is_file() and not f.name.startswith('.')]
        
        gallery = []
        for file in files:
            ext = file.suffix.lower()
            basename = file.stem
            file_type = 'image'
            
            # Destination path in GCS
            dest_blob_name = f"3six9/{category}/{file.name}"
            file_url = upload_file_to_firebase(bucket, str(file), dest_blob_name)
            
            # Default thumbnail URL is the asset itself unless overridden
            thumb_url = file_url
            
            if ext in ['.mp4', '.webm']:
                file_type = 'video'
                potential_thumb = thumbnails_dir / category / f"{basename}.thumb.mp4"
                if potential_thumb.exists():
                    thumb_dest = f"thumbnails/{category}/{basename}.thumb.mp4"
                    thumb_url = upload_file_to_firebase(bucket, str(potential_thumb), thumb_dest)
            elif ext in ['.mp3', '.wav']:
                file_type = 'audio'
            elif ext in ['.jpg', '.jpeg', '.png', '.webp']:
                potential_thumb = thumbnails_dir / category / f"{basename}.thumb.jpg"
                if potential_thumb.exists():
                    thumb_dest = f"thumbnails/{category}/{basename}.thumb.jpg"
                    thumb_url = upload_file_to_firebase(bucket, str(potential_thumb), thumb_dest)
            
            gallery.append({
                'type': file_type,
                'url': file_url,
                'thumbnail': thumb_url
            })
        
        if not gallery:
            continue
            
        gallery_data.append({
            'id': index,
            'title': category.upper(),
            'subtitle': f"COLLECTION {index + 1}",
            'image': gallery[0]['thumbnail'],
            'gallery': gallery
        })

    # Save to src/data/gallery.json
    output_dir = base_dir / 'src' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / 'gallery.json'
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(gallery_data, f, indent=4, ensure_ascii=False)
        
    print(f"\nSuccessfully uploaded assets and generated {output_path}")

if __name__ == '__main__':
    main()
