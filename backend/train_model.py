import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from mesonet import Meso4
import os

# --- CONFIGURATION ---
DATA_DIR = 'dataset'
IMG_WIDTH, IMG_HEIGHT = 256, 256
BATCH_SIZE = 32
EPOCHS = 25  # Run for 25 epochs

# --- IMPROVED DATA GENERATORS (Augmentation) ---
# This creates "new" images by rotating/zooming existing ones.
# It forces the AI to learn features, not just memorize files.
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    shear_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    fill_mode='nearest',
    validation_split=0.2
)

train_generator = train_datagen.flow_from_directory(
    DATA_DIR,
    target_size=(IMG_WIDTH, IMG_HEIGHT),
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='training'
)

val_generator = train_datagen.flow_from_directory(
    DATA_DIR,
    target_size=(IMG_WIDTH, IMG_HEIGHT),
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='validation'
)

# --- TRAIN ---
print("Initializing MesoNet...")
meso = Meso4()

print("Starting Training with Augmentation...")
meso.model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=val_generator
)

# --- SAVE ---
meso.save('Meso4_DF.weights.h5')
print("Model saved as Meso4_DF.weights.h5")