import os
import subprocess
from PIL import Image
import json

SOURCE_DIR = 'public/3six9'
TARGET_DIR = 'public/thumbnails'

# Optimization settings
IMG_MAX_HEIGHT = 480
IMG_QUALITY = 50 # Heavier compression
VIDEO_MAX_HEIGHT = 360
VIDEO_CRF = 35 # Heavy compression
VIDEO_BITRATE = '400k'

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def optimize_image(src, dest):
    try:
        with Image.open(src) as img:
            # Resize if height > IMG_MAX_HEIGHT
            if img.height > IMG_MAX_HEIGHT:
                ratio = IMG_MAX_HEIGHT / float(img.height)
                new_width = int(float(img.width) * ratio)
                img = img.resize((new_width, IMG_MAX_HEIGHT), Image.LANCZOS)
            
            # Convert to RGB (in case of RGBA)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                
            img.save(dest, "JPEG", quality=IMG_QUALITY, optimize=True)
            print(f"Optimized image: {src} -> {dest}")
            return True
    except Exception as e:
        print(f"Error optimizing image {src}: {e}")
        return False

def optimize_video(src, dest):
    try:
        # ffmpeg command for heavy compression and resizing
        cmd = [
            'ffmpeg', '-y',
            '-i', src,
            '-vf', f'scale=-2:{VIDEO_MAX_HEIGHT}',
            '-c:v', 'libx264',
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-crf', str(VIDEO_CRF),
            '-b:v', VIDEO_BITRATE,
            '-maxrate', VIDEO_BITRATE,
            '-bufsize', '800k',
            '-preset', 'veryfast',
            '-c:a', 'aac',
            '-b:a', '48k',
            '-movflags', '+faststart',
            dest
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"FFmpeg error for {src}: {result.stderr}")
            return False
        print(f"Optimized video: {src} -> {dest}")
        return True
    except Exception as e:
        print(f"Error optimizing video {src}: {e}")
        return False

def main():
    root_dir = os.path.join(os.getcwd())
    src_root = os.path.join(root_dir, SOURCE_DIR)
    dest_root = os.path.join(root_dir, TARGET_DIR)
    
    ensure_dir(dest_root)
    
    if not os.path.exists(src_root):
        print(f"Source directory {src_root} not found.")
        return

    categories = [d for d in os.listdir(src_root) if os.path.isdir(os.path.join(src_root, d))]
    
    mapping = {}

    for cat in categories:
        cat_src = os.path.join(src_root, cat)
        cat_dest = os.path.join(dest_root, cat)
        ensure_dir(cat_dest)
        
        files = [f for f in sorted(os.listdir(cat_src)) if not f.startswith('.')]
        if not files:
            continue
            
        # Optimize ALL files in the category directory as low-res fallbacks
        # This gives us more flexibility in the UI later
        optimized_files = []
        for f in files:
            src_path = os.path.join(cat_src, f)
            ext = os.path.splitext(f)[1].lower()
            
            dest_filename = f
            success = False
            
            if ext in ['.jpg', '.jpeg', '.png', '.webp']:
                dest_filename = os.path.splitext(f)[0] + '.thumb.jpg'
                dest_path = os.path.join(cat_dest, dest_filename)
                success = optimize_image(src_path, dest_path)
            elif ext in ['.mp4', '.webm']:
                dest_filename = os.path.splitext(f)[0] + '.thumb.mp4'
                dest_path = os.path.join(cat_dest, dest_filename)
                success = optimize_video(src_path, dest_path)
            
            if success:
                optimized_files.append({
                    'original': f'/3six9/{cat}/{f}',
                    'thumbnail': f'/thumbnails/{cat}/{dest_filename}'
                })

        if optimized_files:
            mapping[cat] = optimized_files

    with open(os.path.join(dest_root, 'mapping.json'), 'w') as f:
        json.dump(mapping, f, indent=4)
    print("Optimization complete. Mapping saved to public/thumbnails/mapping.json")

if __name__ == '__main__':
    main()
