import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import gradio as gr

# -------------------------------------------------------------
# CONFIGURATION & CONSTANTS
# -------------------------------------------------------------
MODEL_PATH = "tomato_model_full.pth"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CONFIDENCE_THRESHOLD = 70.0  # Minimum % confidence required for tomato leaf classification
MIN_PLANT_PIXEL_RATIO = 8.0  # Minimum % green foliage required in HSV space

CLASS_NAMES = [
    'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight',
    'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
    'Tomato___Yellow_Leaf_Curl_Virus', 'Tomato___mosaic_virus', 'Tomato___healthy'
]

INVALID_IMAGE_MSG = "upload plant leaf image, wrongly image uploaded"

# -------------------------------------------------------------
# 1. LOAD MODEL
# -------------------------------------------------------------
def load_model():
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(CLASS_NAMES))
    if os.path.exists(MODEL_PATH):
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        print("✅ Trained PyTorch Model Weights Loaded Successfully!")
    else:
        print("⚠️ Warning: Weight file not found. Running model initialized with standard layers.")
    model.to(DEVICE)
    model.eval()
    return model

model = load_model()

# Preprocessing Transformation
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# -------------------------------------------------------------
# 2. GUARDRAIL 1: OPENCV PLANT GREENNESS CHECK
# -------------------------------------------------------------
def is_valid_plant_leaf(image_pil):
    img_cv = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)

    # Broad range for plant green foliage
    lower_plant_green = np.array([20, 30, 30])
    upper_plant_green = np.array([90, 255, 255])
    
    plant_mask = cv2.inRange(hsv, lower_plant_green, upper_plant_green)
    plant_pixels = cv2.countNonZero(plant_mask)
    total_pixels = img_cv.shape[0] * img_cv.shape[1]

    plant_ratio = (plant_pixels / total_pixels) * 100.0
    return plant_ratio >= MIN_PLANT_PIXEL_RATIO, plant_ratio

# -------------------------------------------------------------
# 3. OPENCV SEVERITY ESTIMATION
# -------------------------------------------------------------
def calculate_severity(image_pil):
    img_cv = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)

    # Healthy green mask
    lower_green = np.array([25, 40, 40])
    upper_green = np.array([85, 255, 255])
    green_mask = cv2.inRange(hsv, lower_green, upper_green)

    # Diseased spots mask (yellow/brown/dark spots)
    lower_diseased = np.array([10, 30, 30])
    upper_diseased = np.array([25, 255, 255])
    diseased_mask = cv2.inRange(hsv, lower_diseased, upper_diseased)

    green_pixels = cv2.countNonZero(green_mask)
    diseased_pixels = cv2.countNonZero(diseased_mask)
    total_leaf_pixels = green_pixels + diseased_pixels

    if total_leaf_pixels == 0:
        return 0.0

    severity_pct = (diseased_pixels / total_leaf_pixels) * 100.0
    return round(severity_pct, 2) if severity_pct >= 1.0 else 0.0

# -------------------------------------------------------------
# 4. DECISION SUPPORT SYSTEM (DSS) ENGINE
# -------------------------------------------------------------
def run_dss_engine(disease_name, severity_pct):
    if disease_name == 'Tomato___healthy' or severity_pct == 0.0:
        return {
            "Status Level": "Healthy Crop",
            "Immediate Action": "No chemical application required.",
            "Precautionary Measure": "Maintain routine visual inspection once per week."
        }
    
    if severity_pct < 5.0:
        tier = "Mild Infection (<5%)"
        action = "Apply organic treatment: Neem oil spray (1500 PPM) at 5ml/liter of water."
    elif 5.0 <= severity_pct <= 25.0:
        tier = "Moderate Infection (5%-25%)"
        action = "Apply targeted fungicide: Copper Oxychloride @ 2.5g/liter of water."
    else:
        tier = "Severe Infection (>25%)"
        action = "Prune heavily damaged leaves immediately. Apply systemic fungicide (Mancozeb/Chlorothalonil)."

    return {
        "Status Level": tier,
        "Immediate Action": action,
        "Precautionary Measure": "Avoid overhead watering; irrigate directly at the root zone to prevent leaf moisture build-up."
    }

# -------------------------------------------------------------
# 5. GRADIO PREDICTION FUNCTION
# -------------------------------------------------------------
def analyze_plant_gradio(input_image):
    if input_image is None:
        return "⚠️ Please upload an image.", "", "", ""

    image_pil = Image.fromarray(input_image).convert('RGB')

    # Guardrail Check 1: Foliage presence
    is_plant, ratio = is_valid_plant_leaf(image_pil)
    if not is_plant:
        error_output = f"❌ {INVALID_IMAGE_MSG}\n\n(Reason: Insufficient plant foliage detected in image - {round(ratio, 2)}% green area)."
        return error_output, "N/A", "N/A", "N/A"

    # Guardrail Check 2: PyTorch CNN Inference
    img_tensor = transform(image_pil).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        outputs = model(img_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        conf, predicted_idx = torch.max(probabilities, 1)

    confidence_score = round(conf.item() * 100, 2)
    predicted_class = CLASS_NAMES[predicted_idx.item()]

    # Out-of-Distribution Rejection
    if confidence_score < CONFIDENCE_THRESHOLD:
        error_output = f"❌ {INVALID_IMAGE_MSG}\n\n(Reason: Low classification confidence - {confidence_score}% < {CONFIDENCE_THRESHOLD}% threshold)."
        return error_output, "N/A", "N/A", "N/A"

    # Process Severity & DSS Recommendations
    disease_display = predicted_class.replace("Tomato___", "").replace("_", " ")
    severity_pct = calculate_severity(image_pil) if predicted_class != 'Tomato___healthy' else 0.0
    dss_data = run_dss_engine(predicted_class, severity_pct)

    diagnosis_text = f"✅ Condition Identified: {disease_display}"
    confidence_text = f"{confidence_score}%"
    severity_text = f"{severity_pct}% affected leaf area"
    
    recommendation_text = (
        f"• Status Level: {dss_data['Status Level']}\n"
        f"• Action Plan: {dss_data['Immediate Action']}\n"
        f"• Prevention: {dss_data['Precautionary Measure']}"
    )

    return diagnosis_text, confidence_text, severity_text, recommendation_text

# -------------------------------------------------------------
# 6. GRADIO INTERFACE SETUP
# -------------------------------------------------------------
interface = gr.Interface(
    fn=analyze_plant_gradio,
    inputs=gr.Image(label="Upload Tomato Leaf Image"),
    outputs=[
        gr.Textbox(label="Diagnosis Result"),
        gr.Textbox(label="Model Confidence"),
        gr.Textbox(label="OpenCV Severity Percentage"),
        gr.Textbox(label="Decision Support System (DSS) Advisory", lines=4)
    ],
    title="🍅 Tomato Plant Disease Detection & DSS System",
    description="Upload a tomato leaf photo to diagnose diseases, measure severity percentage, and receive actionable farming recommendations.",
    theme="soft"
)

if __name__ == "__main__":
    interface.launch(server_name="127.0.0.1", server_port=7860, share=True)