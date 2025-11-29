import cv2
import numpy as np
import os
import traceback
from mesonet import Meso4

# Initialize global model variable
classifier = None

def load_model_weights():
    global classifier
    if classifier is None:
        possible_files = ['Meso4_DF.weights.h5', 'Meso4_DF.h5']
        weights_path = None
        for f in possible_files:
            if os.path.exists(f):
                weights_path = f
                break
        
        if weights_path:
            try:
                print(f"Loading model from: {weights_path}")
                classifier = Meso4()
                classifier.load(weights_path)
                print("MesoNet weights loaded successfully.")
            except Exception as e:
                print(f"Error loading model: {e}")
                return None
    return classifier

def analyze_video(video_path):
    print(f"DEBUG: Starting analysis for {video_path}")
    
    try:
        # 1. Load Model
        model = load_model_weights()
        if model is None: return "error", 0.0
        
        # 2. Extract Frames
        cap = cv2.VideoCapture(video_path)
        frames = []
        MAX_FRAMES = 30  # Analyze more frames for better sensitivity
        
        while len(frames) < MAX_FRAMES:
            ret, frame = cap.read()
            if not ret: break
            try:
                frame = cv2.resize(frame, (256, 256))
                frame = frame / 255.0
                frames.append(frame)
            except: continue
            for _ in range(5): cap.read() # Skip frames
        cap.release()

        if len(frames) == 0: return "error", 0.0
        
        np_frames = np.array(frames)

        # 3. Predict Per Frame
        predictions = model.model.predict(np_frames)
        
        fake_frame_count = 0
        real_frame_count = 0
        
        print("DEBUG: Frame Scores:")
        for score in predictions:
            # FIX: If score is LOW (close to 0), it is FAKE
            if score < 0.5:  
                fake_frame_count += 1
                print(f" [red-FAKE] {score[0]:.4f}", end="")
            # FIX: If score is HIGH (close to 1), it is REAL
            else:
                real_frame_count += 1
                print(f" [grn-REAL] {score[0]:.4f}", end="")
        print("\n")

        total_frames = len(predictions)
        fake_ratio = fake_frame_count / total_frames
        
        print(f"DEBUG: Fake Ratio: {fake_ratio:.2f} ({fake_frame_count}/{total_frames} frames flagged as fake)")

        # --- DECISION ---
        # If more than 40% of frames look Fake, mark the video as Rejected (Tampered)
        # You can adjust this 0.40 threshold to make it more or less sensitive
        if fake_ratio > 0.40:
            status = "rejected"
            # Confidence is the percentage of frames that looked fake
            confidence = round(fake_ratio * 100, 2)
        else:
            status = "verified"
            # Confidence is the percentage of frames that looked real
            confidence = round((1 - fake_ratio) * 100, 2)
            
        return status, confidence

    except Exception as e:
        print("--- CRITICAL ERROR ---")
        traceback.print_exc()
        return "error", 0.0