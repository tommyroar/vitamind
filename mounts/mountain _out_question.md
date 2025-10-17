You are correct, and I apologize for the persistent formatting issue. My intention was to put all the content into a single Markdown code block, but the platform or interface is rendering the separate Python code examples (within that larger block) with individual copy buttons.
Since I cannot directly control how the external interface renders Markdown and you need a single, uninterrupted text block, I will provide the entire output with the Python code blocks converted to plain indented text. This is the only reliable way to prevent the rendering engine from breaking the output into separate copyable sections.
Here is the complete content as a single block of raw Markdown and plain indented text:
## 🛠️ PyTorch Mountain Classification Library (Webcam Optimized)

This is a complete, modular PyTorch training and inference library for a binary image classification task (detecting a mountain in a consistent image source like a webcam feed), including **Test Time Augmentation (TTA)** for robust prediction.

---

### 📂 Project Structure

A clean, modular structure is key for a maintainable library.

    mountain-classifier/
    ├── **data/**
    │   ├── **train/**
    │   │   ├── **mountain/** │   │   └── **no_mountain/** │   ├── **val/**
    │   │   ├── **mountain/**
    │   │   └── **no_mountain/**
    ├── **raw_data/** <-- (Temporary staging for data_splitter.py)
    ├── **config.py** # Stores all hyperparameters and settings
    ├── **data_splitter.py**# Sorts raw images into train/val directories
    ├── **dataset.py** # Handles data loading and transformations
    ├── **model.py** # Defines the CNN architecture and model setup
    ├── **train.py** # Contains the main training loop
    └── **predict.py** # Contains the TTA-enhanced inference logic

---

### 1. `config.py` (Settings and Hyperparameters)

    # config.py

    import torch

    # --- Directory Paths ---
    DATA_DIR = 'data'
    TRAIN_DIR = f'{DATA_DIR}/train'
    VAL_DIR = f'{DATA_DIR}/val'
    MODEL_PATH = 'mountain_classifier.pth'

    # --- Training Hyperparameters ---
    NUM_CLASSES = 2             # Binary classification: mountain, no_mountain
    BATCH_SIZE = 32
    LEARNING_RATE = 0.001
    NUM_EPOCHS = 10
    DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    # --- Image Preprocessing ---
    IMAGE_SIZE = 224 # Standard input size for most pre-trained models (e.g., ResNet)
    # Mean and Std from ImageNet for pre-trained models
    NORM_MEAN = [0.485, 0.456, 0.406]
    NORM_STD = [0.229, 0.224, 0.225]

---

### 2. `data_splitter.py` (Data Preparation)

*Before running this, create a `raw_data` folder and place all your labeled images inside. Customize the `get_label_from_filename` function.*

    # data_splitter.py

    import os
    import shutil
    import random
    from config import DATA_DIR, TRAIN_DIR, VAL_DIR # Import directories from config

    # --- Configuration ---
    SOURCE_DIR = 'raw_data'  # Directory containing all your unlabeled images
    VAL_SPLIT_RATIO = 0.2    # 20% of the data goes to the validation set
    RANDOM_SEED = 42         # For reproducible splits
    CLASS_LABELS = ['mountain', 'no_mountain']

    # --- Naming Convention Mapping ---
    def get_label_from_filename(filename):
        """
        CUSTOMIZE THIS: Logic to extract the label from the filename.
        Example: '_M.jpg' for mountain and '_N.jpg' for no_mountain.
        """
        name = filename.lower()
        if '_m.jpg' in name:
            return 'mountain'
        elif '_n.jpg' in name:
            return 'no_mountain'
        else:
            return None 

    def create_and_split_data():
        print("Starting data preparation and split...")
        random.seed(RANDOM_SEED)

        # 1. Clean up and create target directories
        if os.path.exists(DATA_DIR):
            shutil.rmtree(DATA_DIR)
        
        os.makedirs(DATA_DIR, exist_ok=True)
        
        for phase in ['train', 'val']:
            for label in CLASS_LABELS:
                os.makedirs(os.path.join(DATA_DIR, phase, label), exist_ok=True)

        # 2. Group files by label
        labeled_files = {label: [] for label in CLASS_LABELS}
        
        for filename in os.listdir(SOURCE_DIR):
            if filename.endswith(('.jpg', '.jpeg', '.png')): 
                label = get_label_from_filename(filename)
                if label in CLASS_LABELS:
                    labeled_files[label].append(filename)
                else:
                    print(f"Skipping file with unrecognized label: {filename}")

        # 3. Split and move files
        total_moved = 0
        for label, files in labeled_files.items():
            random.shuffle(files)
            
            val_count = int(len(files) * VAL_SPLIT_RATIO)
            val_files = files[:val_count]
            train_files = files[val_count:]

            for phase, file_list in [('train', train_files), ('val', val_files)]:
                target_dir = os.path.join(DATA_DIR, phase, label)
                
                for filename in file_list:
                    source_path = os.path.join(SOURCE_DIR, filename)
                    target_path = os.path.join(target_dir, filename)
                    shutil.copy(source_path, target_path) 
                    total_moved += 1
            
            print(f"Label '{label}': Train ({len(train_files)}), Val ({len(val_files)})")

        print(f"\nData split complete. Total files moved: {total_moved}")

    if __name__ == '__main__':
        if not os.path.exists(SOURCE_DIR):
            print(f"Error: Source directory '{SOURCE_DIR}' not found. Please create it and add your images.")
        else:
            create_and_split_data()

---

### 3. `dataset.py` (Data Loading and Transformation)

    # dataset.py

    import torch
    from torchvision import datasets, transforms
    from torch.utils.data import DataLoader
    from config import TRAIN_DIR, VAL_DIR, IMAGE_SIZE, NORM_MEAN, NORM_STD, BATCH_SIZE

    # --- Image Transformations ---
    train_transforms = transforms.Compose([
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.8, 1.0)), 
        transforms.RandomHorizontalFlip(), 
        transforms.ColorJitter(brightness=0.1, contrast=0.1), # Robustness to lighting
        transforms.ToTensor(),
        transforms.Normalize(NORM_MEAN, NORM_STD)
    ])

    val_transforms = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(NORM_MEAN, NORM_STD)
    ])

    def get_data_loaders():
        image_datasets = {
            'train': datasets.ImageFolder(TRAIN_DIR, train_transforms),
            'val': datasets.ImageFolder(VAL_DIR, val_transforms)
        }

        data_loaders = {
            'train': DataLoader(image_datasets['train'], batch_size=BATCH_SIZE, shuffle=True, num_workers=4),
            'val': DataLoader(image_datasets['val'], batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
        }
        
        class_names = image_datasets['train'].classes
        
        return data_loaders, class_names

---

### 4. `model.py` (Model Definition)

    # model.py

    import torch.nn as nn
    from torchvision import models
    from config import NUM_CLASSES

    def initialize_model(model_name="resnet18", feature_extract=True, num_classes=NUM_CLASSES):
        """Initializes a pre-trained model (ResNet-18) for Transfer Learning."""
        model = None
        
        if model_name == "resnet18":
            model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
            
            if feature_extract:
                # Freeze all parameters in the base network
                for param in model.parameters():
                    param.requires_grad = False 
            
            # Replace the final fully connected layer for binary classification
            num_ftrs = model.fc.in_features
            model.fc = nn.Linear(num_ftrs, num_classes)
        
        else:
            raise ValueError(f"Model '{model_name}' not supported.")

        return model

---

### 5. `train.py` (Training Script)

    # train.py

    import torch
    import torch.optim as optim
    import torch.nn as nn
    from model import initialize_model
    from dataset import get_data_loaders
    from config import DEVICE, LEARNING_RATE, NUM_EPOCHS, MODEL_PATH

    def train_model():
        # 1. Setup Data
        data_loaders, class_names = get_data_loaders()
        print(f"Classes found: {class_names}")

        # 2. Setup Model, Loss, and Optimizer
        model = initialize_model(model_name="resnet18", feature_extract=True)
        model.to(DEVICE)
        
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam([{'params': model.fc.parameters(), 'lr': LEARNING_RATE}])
        
        # 3. Training Loop
        best_acc = 0.0
        
        for epoch in range(NUM_EPOCHS):
            print(f'\nEpoch {epoch+1}/{NUM_EPOCHS}')
            print('-' * 10)

            for phase in ['train', 'val']:
                if phase == 'train':
                    model.train()  
                else:
                    model.eval()   

                running_loss = 0.0
                running_corrects = 0

                for inputs, labels in data_loaders[phase]:
                    inputs = inputs.to(DEVICE)
                    labels = labels.to(DEVICE)

                    optimizer.zero_grad() 

                    with torch.set_grad_enabled(phase == 'train'):
                        outputs = model(inputs)
                        _, preds = torch.max(outputs, 1)
                        loss = criterion(outputs, labels)

                        if phase == 'train':
                            loss.backward()
                            optimizer.step()

                    running_loss += loss.item() * inputs.size(0)
                    running_corrects += torch.sum(preds == labels.data)

                epoch_loss = running_loss / len(data_loaders[phase].dataset)
                epoch_acc = running_corrects.double() / len(data_loaders[phase].dataset)

                print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

                # Save the best model
                if phase == 'val' and epoch_acc > best_acc:
                    best_acc = epoch_acc
                    torch.save(model.state_dict(), MODEL_PATH)

        print(f'\nTraining complete. Best val Acc: {best_acc:.4f}')

    if __name__ == '__main__':
        train_model()

---

### 6. `predict.py` (Inference with TTA)

    # predict.py

    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from PIL import Image
    from torchvision import transforms
    from model import initialize_model
    from config import DEVICE, IMAGE_SIZE, NORM_MEAN, NORM_STD, MODEL_PATH

    CLASS_NAMES = ['no_mountain', 'mountain']

    def load_model():
        """Loads the saved model state and sets it to evaluation mode."""
        model = initialize_model(model_name="resnet18", feature_extract=False) 
        
        try:
            model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
            model.to(DEVICE)
            model.eval() 
            print(f"Model successfully loaded from {MODEL_PATH}")
            return model
        except FileNotFoundError:
            print(f"Error: Model file not found at {MODEL_PATH}.")
            return None

    def define_tta_transforms():
        """Defines a list of transformations for Test Time Augmentation (TTA)."""
        
        # Base transformation (should match val_transforms)
        base_transform = transforms.Compose([
            transforms.Resize(IMAGE_SIZE),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(NORM_MEAN, NORM_STD)
        ])

        tta_transforms = [
            # 1. Base / Original Image
            base_transform,
            
            # 2. Horizontal Flip
            transforms.Compose([
                transforms.Resize(IMAGE_SIZE),
                transforms.RandomHorizontalFlip(p=1.0),
                transforms.CenterCrop(IMAGE_SIZE),
                transforms.ToTensor(),
                transforms.Normalize(NORM_MEAN, NORM_STD)
            ]),
            
            # 3. Slight Brightness Adjustment
            transforms.Compose([
                transforms.Resize(IMAGE_SIZE),
                transforms.ColorJitter(brightness=0.1),
                transforms.CenterCrop(IMAGE_SIZE),
                transforms.ToTensor(),
                transforms.Normalize(NORM_MEAN, NORM_STD)
            ]),
            
            # 4. Small Random Crop
            transforms.Compose([
                transforms.Resize(IMAGE_SIZE),
                transforms.RandomCrop(IMAGE_SIZE, padding=10, padding_mode='edge'),
                transforms.ToTensor(),
                transforms.Normalize(NORM_MEAN, NORM_STD)
            ])
        ]
        return tta_transforms

    def predict_image_with_tta(image_path, model):
        """Applies TTA and aggregates predictions for a single image."""
        
        tta_transforms = define_tta_transforms()
        image = Image.open(image_path).convert('RGB')
        all_probabilities = []

        for tta_transform in tta_transforms:
            # Apply transformation and prepare batch
            input_tensor = tta_transform(image)
            input_batch = input_tensor.unsqueeze(0).to(DEVICE)

            # Get prediction
            with torch.no_grad():
                output = model(input_batch)
                probabilities = F.softmax(output[0], dim=0)
                all_probabilities.append(probabilities)

        # Aggregate (Average) all probabilities
        avg_probabilities = torch.stack(all_probabilities).mean(dim=0)
        
        # Final prediction
        final_confidence, predicted_index = torch.max(avg_probabilities, 0)
        
        predicted_class = CLASS_NAMES[predicted_index.item()]
        
        return predicted_class, final_confidence.item()


    if __name__ == '__main__':
        model = load_model()
        
        if model:
            # NOTE: Update this path to a real image for testing
            test_image_path = 'path/to/your/new_webcam_image.jpg' 
            
            try:
                prediction, confidence = predict_image_with_tta(test_image_path, model)
                print(f"\n--- TTA Prediction Summary (using {len(define_tta_transforms())} views) ---")
                print(f"Image: {test_image_path}")
                print(f"Final Prediction: **{prediction.upper()}**")
                print(f"Aggregated Confidence: {confidence:.4f}")
                print("-----------------------------------------------------")
                
            except FileNotFoundError:
                print(f"\nError: Test image not found at {test_image_path}. Please update the path.")


