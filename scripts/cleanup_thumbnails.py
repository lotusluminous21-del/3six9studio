import os
import shutil
import json

SOURCE_DIR = 'public/3six9'
THUMBS_DIR = 'public/thumbnails'

def cleanup():
    root_dir = os.getcwd()
    src_root = os.path.join(root_dir, SOURCE_DIR)
    thumbs_root = os.path.join(root_dir, THUMBS_DIR)
    
    if not os.path.exists(src_root):
        print(f"Source directory {src_root} not found.")
        return

    if not os.path.exists(thumbs_root):
        print(f"Thumbnails directory {thumbs_root} not found.")
        return

    # Get categories
    categories = [d for d in os.listdir(src_root) if os.path.isdir(os.path.join(src_root, d))]
    
    kept_files = []
    
    for cat in categories:
        cat_src = os.path.join(src_root, cat)
        cat_thumbs = os.path.join(thumbs_root, cat)
        
        if not os.path.exists(cat_thumbs):
            continue
            
        # Get all files in category, sorted alphabetically (as route.ts does)
        files = [f for f in sorted(os.listdir(cat_src)) if not f.startswith('.')]
        if not files:
            continue
            
        # The first file is used for the card thumbnail
        first_file = files[0]
        basename = os.path.splitext(first_file)[0]
        ext = os.path.splitext(first_file)[1].lower()
        
        thumb_name = None
        if ext in ['.jpg', '.jpeg', '.png', '.webp']:
            thumb_name = f"{basename}.thumb.jpg"
        elif ext in ['.mp4', '.webm']:
            thumb_name = f"{basename}.thumb.mp4"
            
        # Identify which thumbnail to keep
        thumb_to_keep = os.path.join(cat_thumbs, thumb_name) if thumb_name else None
        
        # List all thumbnails in this category
        existing_thumbs = os.listdir(cat_thumbs)
        
        for t in existing_thumbs:
            t_path = os.path.join(cat_thumbs, t)
            if t_path == thumb_to_keep:
                print(f"Keeping: {t_path}")
                kept_files.append(t_path)
            else:
                print(f"Deleting: {t_path}")
                os.remove(t_path)
                
    # Also delete mapping.json as it might be outdated or unused
    mapping_json = os.path.join(thumbs_root, 'mapping.json')
    if os.path.exists(mapping_json):
        print(f"Deleting: {mapping_json}")
        os.remove(mapping_json)

    print("Cleanup complete.")

if __name__ == '__main__':
    cleanup()
