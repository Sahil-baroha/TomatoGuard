"""
Disease inference service.

Loads a PyTorch EfficientNet-B0 model trained on the PlantVillage dataset
to classify 10 tomato leaf conditions.

Single source of truth for class mapping:
  raw model class  ->  clean display name  ->  diseases.disease_name lookup key
  All three use the SAME string (RAW_TO_DISPLAY values).
"""

from __future__ import annotations
import os
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Model weights filename (used as model_version identifier in DB rows) ───────
MODEL_FILENAME = "tomato_model_valid.pth"

# ── Confidence threshold (from app_gradio.py — validated by teammate) ─────────
CONFIDENCE_THRESHOLD = 70.0

# ── Raw class -> clean display name (single source of truth) ──────────────────
# Index order matches the checkpoint's classifier output exactly, as extracted
# from app_gradio.py CLASS_NAMES (empirically validated by teammate against
# real sample images). The raw strings come from the training pipeline;
# display names are exactly what is stored in diseases.disease_name after
# the Step 1B migration, so this same string is used for both UI and DB lookup.
RAW_TO_DISPLAY: dict[str, str] = {
    "Tomato___Bacterial_spot":                    "Bacterial Spot",
    "Tomato___Early_blight":                      "Early Blight",
    "Tomato___Late_blight":                       "Late Blight",
    "Tomato___Leaf_Mold":                         "Leaf Mold",
    "Tomato___Septoria_leaf_spot":                "Septoria Leaf Spot",
    "Tomato___Spider_mites Two-spotted_spider_mite": "Spider Mites (Two-Spotted)",
    "Tomato___Target_Spot":                       "Target Spot",
    "Tomato___Yellow_Leaf_Curl_Virus":            "Yellow Leaf Curl Virus",
    "Tomato___mosaic_virus":                      "Mosaic Virus",
    "Tomato___healthy":                           "Healthy",
}

# Ordered list of raw class strings — position == model output index
RAW_CLASSES: list[str] = list(RAW_TO_DISPLAY.keys())


class DiseaseModel:
    """
    Singleton wrapper around the EfficientNetB0 disease classifier.

    Usage:
        label, confidence = disease_model.predict(image_bytes)
        # label is the clean display name (e.g. "Bacterial Spot"), which is
        # also the exact string stored in diseases.disease_name.
    """

    def __init__(self):
        self._loaded = False
        self._model = None
        self._transform = None

        try:
            import torch
            import torch.nn as nn
            from torchvision.models import efficientnet_b0
            from torchvision import transforms

            self.device = torch.device("cpu")

            # Standard ImageNet preprocessing for EfficientNet
            self._transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                     std=[0.229, 0.224, 0.225]),
            ])

            # Resolve absolute path: backend/app/services -> ../../../docs/
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.abspath(
                os.path.join(current_dir, f"../../../docs/{MODEL_FILENAME}")
            )

            if os.path.exists(model_path):
                self._model = efficientnet_b0(weights=None)
                in_features = self._model.classifier[1].in_features
                self._model.classifier[1] = nn.Linear(in_features, len(RAW_CLASSES))

                state_dict = torch.load(model_path, map_location=self.device)
                self._model.load_state_dict(state_dict)
                self._model.to(self.device)
                self._model.eval()

                self._loaded = True
                logger.info("Loaded disease model: %s", model_path)
            else:
                logger.warning("Disease model not found at %s", model_path)

        except ImportError:
            logger.error("PyTorch/Torchvision not installed — model unavailable.")
        except Exception as exc:
            logger.error("Failed to load disease model: %s", exc)

    @property
    def loaded(self) -> bool:
        return self._loaded

    def predict(self, image_bytes: bytes) -> tuple[str, Optional[float]]:
        """
        Run inference on raw image bytes.

        Returns:
            (clean_display_name: str, confidence_pct: float 0-100 | None)
            clean_display_name is the exact diseases.disease_name value.
        """
        if not self._loaded or self._model is None:
            return ("Model not loaded", None)

        try:
            import torch
            import torch.nn.functional as F
            from PIL import Image

            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            tensor = self._transform(img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                outputs = self._model(tensor)
                probs = F.softmax(outputs, dim=1)[0]
                confidence, idx = torch.max(probs, 0)

            raw_class = RAW_CLASSES[idx.item()]
            display_name = RAW_TO_DISPLAY[raw_class]
            confidence_pct = round(confidence.item() * 100.0, 2)

            return display_name, confidence_pct

        except Exception as exc:
            logger.error("Inference error: %s", exc)
            return (f"Inference error: {exc}", None)


# Module-level singleton — loaded once at startup, shared across all requests.
disease_model = DiseaseModel()
