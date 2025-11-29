import cv2
import numpy as np
import os
import glob
import random

# --- CONFIGURATION ---
REAL_FOLDER = "dataset/real"
FAKE_FOLDER = "dataset/fake"

def add_noise(image):
    """Adds random noise to simulate digital tampering artifacts"""
    row, col, ch = image.shape
    mean = 0
    var = 0.5
    sigma = var ** 0.5
    gauss = np.random.normal(mean, sigma, (row, col, ch))
    noisy = image + gauss * 20
    return np.clip(noisy, 0, 255).astype(np.uint8)

def apply_blur(image):
    """Applies blurring to simulate smoothing often seen in Deepfakes"""
    return cv2.GaussianBlur(image, (5, 5), 0)

def reduce_quality(image):
    """Simulates compression artifacts"""
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 30]
    result, encimg = cv2.imencode('.jpg', image, encode_param)
    decimg = cv2.imdecode(encimg, 1)
    return decimg

def generate_fakes():
    os.makedirs(FAKE_FOLDER, exist_ok=True)
    
    # Get all real images
    real_images = glob.glob(f"{REAL_FOLDER}/*.jpg")
    
    if not real_images:
        print("No real images found! Please run process_real_videos.py first.")
        return

    print(f"Found {len(real_images)} real images. Generating synthetic fakes...")
    
    count = 0
    for img_path in real_images:
        # Read the real image
        img = cv2.imread(img_path)
        if img is None: continue
        
        # Randomly choose a distortion method
        distortion_type = random.choice(['noise', 'blur', 'compression', 'mix'])
        
        if distortion_type == 'noise':
            fake_img = add_noise(img)
        elif distortion_type == 'blur':
            fake_img = apply_blur(img)
        elif distortion_type == 'compression':
            fake_img = reduce_quality(img)
        else:
            # Mix: Blur then Noise
            fake_img = add_noise(apply_blur(img))
            
        # Save to fake folder
        filename = os.path.basename(img_path)
        save_path = f"{FAKE_FOLDER}/fake_{filename}"
        cv2.imwrite(save_path, fake_img)
        count += 1
        
    print(f"Done! Generated {count} fake images in '{FAKE_FOLDER}'.")

if __name__ == "__main__":
    generate_fakes()