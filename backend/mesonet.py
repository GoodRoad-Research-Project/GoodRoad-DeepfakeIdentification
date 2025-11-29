import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, Flatten, Conv2D, MaxPooling2D, Dropout, LeakyReLU, BatchNormalization, GlobalAveragePooling2D

class Meso4:
    def __init__(self, learning_rate=0.001):
        self.model = self.init_model()
        self.model.compile(optimizer='adam', loss='mean_squared_error', metrics=['accuracy'])

    def init_model(self):
        x = Input(shape=(256, 256, 3))
        
        # Layer 1
        x1 = Conv2D(8, (3, 3), padding='same', activation='relu')(x)
        x1 = BatchNormalization()(x1)
        x1 = MaxPooling2D(pool_size=(2, 2), padding='same')(x1)
        
        # Layer 2
        x2 = Conv2D(8, (5, 5), padding='same', activation='relu')(x1)
        x2 = BatchNormalization()(x2)
        x2 = MaxPooling2D(pool_size=(2, 2), padding='same')(x2)
        
        # Layer 3
        x3 = Conv2D(16, (5, 5), padding='same', activation='relu')(x2)
        x3 = BatchNormalization()(x3)
        x3 = MaxPooling2D(pool_size=(2, 2), padding='same')(x3)
        
        # Layer 4
        x4 = Conv2D(16, (5, 5), padding='same', activation='relu')(x3)
        x4 = BatchNormalization()(x4)
        x4 = MaxPooling2D(pool_size=(4, 4), padding='same')(x4)
        
        # Output Layer
        y = Flatten()(x4)
        y = Dropout(0.5)(y)
        y = Dense(16)(y)
        y = LeakyReLU(alpha=0.1)(y)
        y = Dropout(0.5)(y)
        y = Dense(1, activation='sigmoid')(y)

        return Model(inputs=x, outputs=y)
    
    def load(self, path):
        self.model.load_weights(path)
        
    def save(self, path):
        # Check for correct extension
        if not path.endswith('.weights.h5'):
            path += '.weights.h5'
        self.model.save_weights(path)