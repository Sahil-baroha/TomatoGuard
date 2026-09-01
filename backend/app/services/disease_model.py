"""
Disease inference service.

Spec: DiseaseModel class, predict(image_bytes) -> (label, confidence).
Loaded once at import time.

⚠️  MODEL FILE NOT YET PROVIDED
The real EfficientNetB0 .h5 / .tflite file has not been added to the repo.
When you have the file:
  1. Place it at backend/app/services/disease_model.h5  (or .tflite)
  2. Uncomment the real load/predict block below and delete the stub.
  3. Tell the agent which format (keras .h5 or TFLite) so it can wire
     the correct inference API.

Until then, predict() returns label="No model loaded" and confidence=None
so that the upload→Cloudinary→DB pipeline can be exercised end-to-end.
"""

from __future__ import annotations
import io
from typing import Optional

# ── Stub implementation (replace with real model when file is provided) ───────

class DiseaseModel:
    """
    Singleton wrapper around the EfficientNetB0 disease classifier.

    Usage:
        label, confidence = disease_model.predict(image_bytes)
    """

    def __init__(self):
        # Real implementation:
        #   import tensorflow as tf
        #   model_path = os.path.join(os.path.dirname(__file__), "disease_model.h5")
        #   self._model = tf.keras.models.load_model(model_path)
        #   self._labels = [...]  # ordered list of class names matching model output
        #
        # TFLite alternative (lower memory):
        #   import tflite_runtime.interpreter as tflite
        #   interpreter = tflite.Interpreter(model_path=...)
        #   interpreter.allocate_tensors()
        #   self._interpreter = interpreter
        self._loaded = False  # set to True once a real model is in place

    def predict(self, image_bytes: bytes) -> tuple[str, Optional[float]]:
        """
        Run inference on raw image bytes.

        Returns:
            (predicted_label: str, confidence: float 0-100 or None)
        """
        if not self._loaded:
            # Honest stub — returns a sentinel so the DB row is clearly
            # a placeholder, not a fabricated disease label.
            return ("No model loaded", None)

        # ── Real inference (uncomment when model file is available) ──────────
        # import numpy as np
        # from PIL import Image
        # img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))
        # arr = np.array(img, dtype=np.float32) / 255.0
        # arr = np.expand_dims(arr, axis=0)
        # preds = self._model.predict(arr, verbose=0)[0]
        # idx = int(np.argmax(preds))
        # confidence = float(preds[idx]) * 100.0
        # return self._labels[idx], round(confidence, 2)


# Module-level singleton — loaded once at import, shared across all requests.
disease_model = DiseaseModel()
