# TomatoGuard AI – Backend Architecture & Developer Guide

This document provides a comprehensive overview of the TomatoGuard AI backend. It breaks down the FastAPI architecture, folder structure, and explicitly maps out how every major feature flows through the code.

---

## 1. FastAPI Architecture Pattern

The backend follows a strict **Layered (MVC-like) Architecture** to ensure maintainability and separation of concerns:

1. **`main.py` (Entry Point)**: Starts the server, sets up CORS, and includes all routers.
2. **`app/api/` (Routers/Controllers)**: Receives HTTP requests, calls services, and returns responses. No heavy business logic lives here.
3. **`app/schemas/` (Pydantic)**: Defines the exact JSON structure for inputs (validation) and outputs (serialization).
4. **`app/services/` (Business Logic)**: The "Brain". Handles ML inference, OCR, weather API calls, and agricultural rule computations.
5. **`app/models/` (SQLAlchemy)**: Defines the database tables mapped to PostgreSQL.
6. **`app/core/` (Configuration)**: Handles DB connections, JWT security, and environment variables.

---

## 2. Complete Folder Structure

Below is the literal tree structure of the `backend/app` directory:

```text
backend/app/
├── main.py
├── api/
│   ├── admin_auth.py
│   ├── admin_diseases.py
│   ├── admin_farmers.py
│   ├── auth.py
│   ├── dashboard.py
│   ├── disease.py
│   ├── history.py
│   ├── recommendations.py
│   ├── soil.py
│   └── weather.py
├── core/
│   ├── cloudinary_client.py
│   ├── config.py
│   ├── db.py
│   └── security.py
├── models/
│   ├── admin.py
│   ├── disease.py
│   ├── disease_scan.py
│   ├── farm.py
│   ├── soil_analysis.py
│   ├── soil_questionnaire.py
│   ├── soil_report.py
│   ├── user.py
│   └── weather_record.py
├── schemas/
│   ├── admin.py
│   ├── auth.py
│   ├── disease.py
│   ├── history.py
│   ├── recommendations.py
│   ├── soil.py
│   └── weather.py
└── services/
    ├── disease_model.py
    ├── leaf_analysis.py
    ├── ocr.py
    ├── soil_analysis.py
    └── weather_client.py
```

---

## 3. Feature-by-Feature Flow Breakdown

Here is a detailed explanation of every major feature, showing exactly which files are connected and how data flows through them.

### Feature 1: Authentication & User Management
**Purpose:** Handle farmer registration, login, JWT token generation, and profile retrieval.

**Flow:**
1. **Request:** Frontend sends `POST /auth/login` with email and password.
2. **Endpoint (`api/auth.py`)**: Receives the request.
3. **Validation (`schemas/auth.py`)**: Ensures the payload matches the `UserCreate` or login schema.
4. **Security (`core/security.py`)**: Hashes the password via bcrypt and checks it against the database. If successful, generates a JWT (JSON Web Token).
5. **Database (`models/user.py` & `models/farm.py`)**: Queries the PostgreSQL `users` and `farms` tables.
6. **Response**: Returns the `{ access_token, token_type }` JSON back to the frontend.

---

### Feature 2: Leaf Disease Detection (ML Integration)
**Purpose:** Allow farmers to upload an image of a tomato leaf, verify it's a leaf, run it through a PyTorch ML model, and save the result.

**Flow:**
1. **Request:** Frontend sends `POST /disease/analyze` (multipart form data with image).
2. **Endpoint (`api/disease.py`)**: Authenticates the user and receives the file.
3. **Validation (`services/leaf_analysis.py`)**: Uses OpenCV to analyze the green pixel density of the image. If it's not a leaf, it rejects the request early.
4. **Cloud Storage (`core/cloudinary_client.py`)**: Uploads the image to Cloudinary and gets a secure URL.
5. **Machine Learning (`services/disease_model.py`)**: Feeds the image tensor into the trained PyTorch model (`tomato_model_valid.pth`) to predict the disease class and confidence score.
6. **Database (`models/disease.py` & `models/disease_scan.py`)**: Looks up the predicted disease in the reference table to get the severity and treatment steps, then saves a new `DiseaseScan` row for the user.
7. **Response (`schemas/disease.py`)**: Formats the scan data and treatment recommendation for the frontend modal.

---

### Feature 3: Soil Analysis (OCR & Rule Engine)
**Purpose:** Read physical soil test reports via OCR, or allow manual questionnaire entry, to generate fertilizer and irrigation advice.

**Flow:**
1. **Request (Upload):** `POST /soil/report` -> `api/soil.py`.
2. **OCR Service (`services/ocr.py`)**: Extracts text from the uploaded report image. 
3. **Database (`models/soil_report.py`)**: Saves the raw extracted text temporarily.
4. **Request (Confirm):** `POST /soil/report/confirm` -> User confirms the parsed numbers.
5. **Rule Engine (`services/soil_analysis.py`)**: Evaluates the N, P, K, and pH levels against agricultural thresholds to generate specific fertilizer advice (e.g., "Add Urea if Nitrogen is low").
6. **Database (`models/soil_analysis.py`)**: Saves the finalized analysis.

---

### Feature 4: Weather Integration
**Purpose:** Fetch and store current and 5-day forecast weather data based on the farmer's GPS coordinates.

**Flow:**
1. **Request:** `GET /weather/current` or `/weather/forecast` -> `api/weather.py`.
2. **Database Lookup (`models/farm.py`)**: Retrieves the logged-in user's latitude and longitude.
3. **External API (`services/weather_client.py`)**: Makes an HTTP request to the free **Open-Meteo API**. Converts raw WMO weather codes (like `61`) into readable strings (like `"Slight Rain"`).
4. **Caching (`models/weather_record.py`)**: Only the `current` weather is saved to the database to track historical conditions. The 5-day forecast is returned directly without saving.
5. **Response (`schemas/weather.py`)**: Packages the data into a clean JSON array for the frontend cards.

---

### Feature 5: Smart Recommendations
**Purpose:** Combine the latest Disease, Soil, and Weather data into one holistic health status and action plan.

**Flow:**
1. **Request:** `GET /recommendations/latest` -> `api/recommendations.py`.
2. **Data Aggregation**: The endpoint queries the database for the *single most recent* row from `disease_scans`, `soil_analyses`, and `weather_records` for that specific user.
3. **Deterministic Logic (`api/recommendations.py`)**: Evaluates the combined data. For example: 
   * *If* the last disease was Severe *and* Soil Nitrogen is low -> Status is **Critical**.
   * *If* no issues found -> Status is **Good**.
4. **Response (`schemas/recommendations.py`)**: Packages the unified advice and a `data_used` block (for transparency) back to the frontend.

---

### Feature 6: Unified Dashboard
**Purpose:** Provide a quick overview of the farm upon login.

**Flow:**
1. **Request:** `GET /dashboard/summary` -> `api/dashboard.py`.
2. **Execution**: Acts as a lightweight aggregator. It queries the DB for the latest scan, soil, and weather, and securely imports the `_compute_health_status` logic from the Recommendations module.
3. **Response**: Returns a flattened JSON dictionary containing the preview widgets and health status.

---

### Feature 7: Admin Panel
**Purpose:** A secure, separate domain for administrators to manage users and view platform metrics.

**Flow:**
1. **Request:** `GET /admin/farmers` -> `api/admin_farmers.py`.
2. **Security (`core/security.py`)**: Checks for an *Admin* JWT (a normal Farmer JWT will be rejected here).
3. **Database (`models/admin.py`)**: Validates the admin user.
4. **Data Fetching**: Queries the `users` table to list all registered farmers, their activity, and allows toggling their active status via `PATCH /admin/farmers/{id}/status`.
