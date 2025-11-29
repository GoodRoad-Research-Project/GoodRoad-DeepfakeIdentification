import cv2
import os
import glob

# --- CONFIGURATION ---
SOURCE_FOLDER = "raw_videos/real"   # Where your MP4s are
DEST_FOLDER = "dataset/real"        # Where the images go
FRAMES_PER_VIDEO = 25               # How many images to take from each video

def extract_frames():
    # Create destination folder if it doesn't exist
    os.makedirs(DEST_FOLDER, exist_ok=True)
    
    # Find all mp4 files in the source folder
    video_files = glob.glob(f"{SOURCE_FOLDER}/*.mp4")
    
    if not video_files:
        print(f"No videos found in {SOURCE_FOLDER}. Please add your MP4 files there.")
        return

    print(f"Found {len(video_files)} videos. Starting extraction...")
    
    total_images = 0

    for video_path in video_files:
        filename = os.path.basename(video_path).split('.')[0]
        cap = cv2.VideoCapture(video_path)
        
        # Get total frames in this video
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames == 0:
            continue
            
        # Calculate jump size to get evenly spaced frames
        skip = max(1, total_frames // FRAMES_PER_VIDEO)
        
        count = 0
        saved_count = 0
        
        while cap.isOpened() and saved_count < FRAMES_PER_VIDEO:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Capture every 'skip' frame (e.g., every 50th frame)
            if count % skip == 0:
                # Resize to 256x256 (MesoNet requirement)
                frame = cv2.resize(frame, (256, 256))
                
                # Save image
                save_name = f"{DEST_FOLDER}/{filename}_frame{saved_count}.jpg"
                cv2.imwrite(save_name, frame)
                saved_count += 1
                total_images += 1
            
            count += 1
            
        cap.release()
        print(f"Processed {filename}: Extracted {saved_count} frames.")

    print(f"Done! Total {total_images} images saved to '{DEST_FOLDER}'.")

if __name__ == "__main__":
    extract_frames()