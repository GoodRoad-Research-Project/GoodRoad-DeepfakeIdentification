import cv2
import os
import glob

# --- CONFIGURATION ---
SOURCE_FOLDER = "raw_videos/fake"   # Folder containing your deepfake MP4s
DEST_FOLDER = "dataset/fake"        # Folder to save extracted images
FRAMES_PER_VIDEO = 89               # Extract 60 frames per video for better learning

def extract_frames():
    # Clear old data to ensure clean training
    if os.path.exists(DEST_FOLDER):
        files = glob.glob(f"{DEST_FOLDER}/*.jpg")
        for f in files:
            os.remove(f)
    else:
        os.makedirs(DEST_FOLDER, exist_ok=True)
    
    video_files = glob.glob(f"{SOURCE_FOLDER}/*.mp4")
    
    if not video_files:
        print(f"No videos found in {SOURCE_FOLDER}. Please add files.")
        return

    print(f"Found {len(video_files)} fake videos. extracting frames...")
    
    total_images = 0

    for video_path in video_files:
        filename = os.path.basename(video_path).split('.')[0]
        cap = cv2.VideoCapture(video_path)
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames == 0: continue
            
        skip = max(1, total_frames // FRAMES_PER_VIDEO)
        count = 0
        saved_count = 0
        
        while cap.isOpened() and saved_count < FRAMES_PER_VIDEO:
            ret, frame = cap.read()
            if not ret: break
            
            if count % skip == 0:
                try:
                    frame = cv2.resize(frame, (256, 256))
                    save_name = f"{DEST_FOLDER}/{filename}_{saved_count}.jpg"
                    cv2.imwrite(save_name, frame)
                    saved_count += 1
                    total_images += 1
                except:
                    pass
            count += 1
            
        cap.release()
        print(f"Processed {filename}: {saved_count} frames.")

    print(f"Done! {total_images} fake images ready for training.")

if __name__ == "__main__":
    extract_frames()