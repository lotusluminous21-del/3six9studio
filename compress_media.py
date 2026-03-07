import os
import subprocess
import json
import shutil
from pathlib import Path

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    print("WARNING: Pillow (PIL) library is not installed.")

TARGET_DIR = r"c:\Users\lotus\Documents\369\369studios\public\3six9"
STATE_FILE = os.path.join(TARGET_DIR, "optimization_state.json")

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
AUDIO_EXTENSIONS = {'.wav', '.mp3', '.m4a', '.flac', '.ogg'}

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load state file: {e}")
    return {}

def save_state(state):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=4)
    except Exception as e:
        print(f"Warning: Could not save state: {e}")

def get_ffmpeg_path():
    sys_path = shutil.which("ffmpeg")
    if sys_path: return sys_path
    
    localappdata = os.environ.get('LOCALAPPDATA', '')
    winget_packages = Path(localappdata) / "Microsoft" / "WinGet" / "Packages"
    if winget_packages.exists():
        for exe in winget_packages.rglob("ffmpeg.exe"):
            return str(exe)
    return "ffmpeg"

def compress_image(input_path):
    if not PILLOW_AVAILABLE:
        return False, None
    
    output_path = input_path.with_suffix('.webp')
    temp_path = output_path.with_name(f"{output_path.stem}_temp.webp")
    
    try:
        with Image.open(input_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")
            
            max_dimension = 1920
            if max(img.width, img.height) > max_dimension:
                ratio = max_dimension / float(max(img.width, img.height))
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                
            img.save(temp_path, "WEBP", quality=60, method=6)
            
        if input_path != output_path and input_path.exists():
            input_path.unlink()
            
        if output_path.exists():
            output_path.unlink()
        temp_path.rename(output_path)
        return True, output_path
    except Exception as e:
        print(f"Error compressing image {input_path}: {e}")
        if temp_path.exists(): temp_path.unlink()
        return False, None

def compress_video(input_path):
    output_path = input_path.with_suffix('.mp4')
    temp_path = output_path.with_name(f"{output_path.stem}_temp.mp4")
    
    command = [
        get_ffmpeg_path(),
        "-y",
        "-i", str(input_path),
        "-vf", "scale='if(gt(iw,ih),min(720,iw),-2)':'if(gt(iw,ih),-2,min(720,ih))'",
        "-vcodec", "libx264",
        "-crf", "38",
        "-preset", "faster",
        "-c:a", "aac",
        "-b:a", "96k",
        "-movflags", "+faststart",
        str(temp_path)
    ]
    
    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if input_path != output_path and input_path.exists():
            input_path.unlink()
            
        if output_path.exists():
            output_path.unlink()
        temp_path.rename(output_path)
        return True, output_path
    except subprocess.CalledProcessError:
        print(f"Error compressing video {input_path}")
        if temp_path.exists(): temp_path.unlink()
        return False, None
    except FileNotFoundError:
        print("FFmpeg not found. Video compression failed.")
        return False, None

def compress_audio(input_path):
    output_path = input_path.with_suffix('.mp3')
    temp_path = output_path.with_name(f"{output_path.stem}_temp.mp3")
    
    command = [
        get_ffmpeg_path(),
        "-y",
        "-i", str(input_path),
        "-c:a", "libmp3lame",
        "-b:a", "320k",
        str(temp_path)
    ]
    
    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if input_path != output_path and input_path.exists():
            input_path.unlink()
            
        if output_path.exists():
            output_path.unlink()
        temp_path.rename(output_path)
        return True, output_path
    except subprocess.CalledProcessError:
        print(f"Error compressing audio {input_path}")
        if temp_path.exists(): temp_path.unlink()
        return False, None
    except FileNotFoundError:
        print("FFmpeg not found. Audio compression failed.")
        return False, None

def process_directory(directory):
    base_dir = Path(directory)
    if not base_dir.exists():
        print(f"Target directory {base_dir} does not exist.")
        return
        
    print(f"Scanning {base_dir} for media files...")
    state = load_state()
    
    files_to_process = []
    skipped_files = 0
    
    for f in base_dir.rglob('*'):
        if f.is_file() and '_temp' not in f.name and f.name != "optimization_state.json":
            
            # Check if we should skip this file based on optimization_state
            rel_path = str(f.relative_to(base_dir))
            current_mtime = str(f.stat().st_mtime)
            current_size = str(f.stat().st_size)
            
            # Use relative path as key. Value is a dict with mtime/size.
            is_cached = False
            if rel_path in state:
                cached_data = state[rel_path]
                if cached_data.get('mtime') == current_mtime and cached_data.get('size') == current_size:
                    is_cached = True
            
            if is_cached:
                skipped_files += 1
            else:
                files_to_process.append(f)
            
    processed_images = 0
    processed_videos = 0
    processed_audio = 0
    
    for item in files_to_process:
        if not item.exists(): continue
        
        print(f"Processing: {item.name}")
        ext = item.suffix.lower()
        
        success = False
        final_path = None
        
        if ext in IMAGE_EXTENSIONS:
            success, final_path = compress_image(item)
            if success: processed_images += 1
        elif ext in VIDEO_EXTENSIONS:
            success, final_path = compress_video(item)
            if success: processed_videos += 1
        elif ext in AUDIO_EXTENSIONS:
            success, final_path = compress_audio(item)
            if success: processed_audio += 1
            
        # Update state for the newly generated/overwritten file
        if success and final_path and final_path.exists():
            new_rel_path = str(final_path.relative_to(base_dir))
            state[new_rel_path] = {
                'mtime': str(final_path.stat().st_mtime),
                'size': str(final_path.stat().st_size)
            }
            # Remove any old entry if the name changed (e.g. .jpg to .webp)
            old_rel_path = str(item.relative_to(base_dir))
            if old_rel_path != new_rel_path and old_rel_path in state:
                del state[old_rel_path]
            
            # Save incrementally after every successful file so we can cancel safely
            save_state(state)

    print(f"\n--- Compression Summary ---")
    print(f"Processed images: {processed_images}")
    print(f"Processed videos: {processed_videos}")
    print(f"Processed audio: {processed_audio}")
    print(f"Skipped files (already optimized): {skipped_files}")
    print(f"Total newly compressed media: {processed_images + processed_videos + processed_audio}")
    print("Done!")

if __name__ == "__main__":
    process_directory(TARGET_DIR)
