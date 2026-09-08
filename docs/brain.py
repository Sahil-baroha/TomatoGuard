import torch
import torch.nn as nn
import torch.optim as optim
import torchvision.models as models
import torchvision.transforms as transforms
import torchvision.datasets as datasets
from torch.utils.data import DataLoader
import os

# --- 1. DEVICE SETUP ---
# This checks if you have an NVIDIA GPU. If not, it uses your CPU.
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# --- 2. THE MODEL (Fixing the Warning) ---
print("Loading EfficientNetB0...")
model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)

# Freeze base layers
for param in model.parameters():
    param.requires_grad = False

# Replace the head for 10 tomato classes
model.classifier[1] = nn.Linear(1280, 10)
model = model.to(device)

# --- 3. THE DATA LOADER (Fixing the Error) ---
# We must resize images to 224x224 because that's what EfficientNet expects
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# IMPORTANT: You need a folder named 'dataset' in the same directory as this script!
dataset_path = 'dataset'

if not os.path.exists(dataset_path):
    print(f"\nSTOP! You need to create a folder named '{dataset_path}' in the same folder as brain.py")
    print("Inside it, put a few folders of tomato leaves (e.g., 'Early_Blight', 'Healthy').")
    exit()

print("Loading images...")
# Load the images from your folders
train_data = datasets.ImageFolder(root=dataset_path, transform=transform)
# train_loader acts as a conveyor belt, feeding 32 images at a time to the AI
train_loader = DataLoader(train_data, batch_size=32, shuffle=True)


# --- 4. THE TRAINING LOOP ---
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)

epochs = 1
print("Starting training...")
for epoch in range(epochs):
    model.train()
    running_loss = 0.0
    
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()
        
    print(f"Epoch {epoch+1} - Loss: {running_loss/len(train_loader)}")

print("Training script ran successfully!")

# Save the trained model weights to a file
torch.save(model.state_dict(), 'tomato_model.pth')
print("Model saved as tomato_model.pth!")