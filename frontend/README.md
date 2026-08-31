# 🌱 AgriSmart

### AI-Powered Smart Agriculture Decision Support System

AgriSmart is a smart agriculture platform designed to support farmers with crop monitoring, disease analysis, soil assessment, weather information, and data-driven agricultural recommendations.

The project aims to bring multiple agricultural support features together in a single, user-friendly platform.

---

## 🎯 Project Overview

Farmers often need to make decisions related to crop health, soil condition, weather, irrigation, fertilizers, and pest management.

AgriSmart is being developed as an integrated decision-support platform that combines these areas to provide a more convenient and technology-driven approach to farm management.

The current project focuses on developing the **frontend application and user experience**, with AI and backend services being integrated as development progresses.

---

## ✨ Current Features

### 🏠 Landing Page

* Introduction to the AgriSmart platform
* Navigation to major system modules
* User-oriented interface

### 🔐 Authentication

* User Login
* User Registration
* Authentication-oriented interface

### 📊 Dashboard

* Centralized crop and farm information
* Statistics and monitoring cards
* Quick access to important modules

### 🍃 Disease Detection

* Crop disease detection interface
* Leaf image upload workflow
* Disease analysis interface
* Designed for future AI/CNN model integration

### 🧪 Soil Assessment

* Soil assessment interface
* Soil report workflow
* Soil image assessment workflow
* Designed for future AI and OCR integration

### 🌦️ Weather

* Weather information interface
* Weather-related agricultural information
* Designed for weather API integration

### 📋 Reports

* View agricultural assessment reports
* Previous report management interface

### 🌱 Schemes

* Agricultural scheme information interface
* Designed to help users access relevant farming schemes

### ✅ Tasks

* Farm-related task management
* Task tracking interface

### 👤 Profile

* User profile management
* Personal information interface

### ⚙️ Settings

* Application settings
* User preference management

---

## 🏗️ System Modules

```text
                    🌱 AgriSmart
                         │
             ┌───────────┴───────────┐
             │                       │
        👤 User Management       📊 Dashboard
             │                       │
       ┌─────┴─────┐                 │
       │           │                 │
    Login       Signup               │
                                   │
        ┌──────────┼──────────┬──────┼──────────┐
        │          │          │      │          │
        ▼          ▼          ▼      ▼          ▼
     🍃 Disease  🧪 Soil   🌦️ Weather 📋 Reports 🌱 Schemes
        │          │          │
        ▼          ▼          ▼
      AI/CNN      OCR/AI    Weather API
        │          │          │
        └──────────┴──────────┘
                   │
                   ▼
          🤖 Recommendation Engine
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       🌱 Fertilizer 💧 Irrigation 🐛 Pesticide
                   │
                   ▼
              📊 Dashboard
```

> AI models, OCR, recommendation services, and backend APIs are planned for integration as development progresses.

---

## 🛠️ Technology Stack

### Frontend

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge\&logo=react\&logoColor=61DAFB)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge\&logo=javascript\&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge\&logo=html5\&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge\&logo=css3\&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge\&logo=vite\&logoColor=white)

### Planned / Integrated Technologies

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge\&logo=python\&logoColor=white)

* Machine Learning
* Computer Vision
* CNN-based image classification
* OCR
* REST APIs
* Weather APIs

### Development Tools

![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge\&logo=git\&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge\&logo=github\&logoColor=white)
![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge\&logo=visualstudiocode\&logoColor=white)

---

## 📁 Project Structure

```text
agri-smart/
│
├── src/
│   │
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   │
│   ├── components/
│   │   ├── AppLayout.jsx
│   │   ├── Brand.jsx
│   │   ├── NotificationMenu.jsx
│   │   ├── Page.jsx
│   │   └── StatCard.jsx
│   │
│   ├── lib/
│   │   ├── api.js
│   │   └── storage.js
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Disease.jsx
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Profile.jsx
│   │   ├── Reports.jsx
│   │   ├── Schemes.jsx
│   │   ├── Settings.jsx
│   │   ├── Signup.jsx
│   │   ├── Soil.jsx
│   │   ├── Tasks.jsx
│   │   └── Weather.jsx
│   │
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Git

### 1. Clone the repository

```bash
git clone https://github.com/shahida-ansari/agri-smart.git
```

### 2. Open the project

```bash
cd agri-smart
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file based on `.env.example`.

Example:

```env
VITE_API_URL=your_api_url
VITE_WEATHER_API_KEY=your_api_key
```

> ⚠️ Never upload real API keys, passwords, or other secrets to GitHub.

### 5. Start the development server

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

---

## 🔄 Development Status

| Module                     | Status                   |
| -------------------------- | ------------------------ |
| Landing Page               | ✅ Developed              |
| Login / Signup             | ✅ Developed              |
| Dashboard                  | ✅ Developed              |
| Profile                    | ✅ Developed              |
| Settings                   | ✅ Developed              |
| Reports                    | ✅ Developed              |
| Tasks                      | ✅ Developed              |
| Schemes                    | ✅ Developed              |
| Disease Detection UI       | 🚧 In Development        |
| Soil Assessment UI         | 🚧 In Development        |
| Weather Integration        | 🚧 In Development        |
| AI Disease Detection       | 🔮 Planned / Integration |
| OCR Soil Report Extraction | 🔮 Planned / Integration |
| AI Soil Assessment         | 🔮 Planned / Integration |
| Recommendation Engine      | 🔮 Planned / Integration |

> Development status may change as new modules and backend services are integrated.

---

## 🎯 Project Objectives

1. Develop an AI-based crop disease detection system using leaf images.
2. Develop a soil health assessment module using soil images, field information, and optional OCR-based laboratory soil reports.
3. Integrate weather forecasting to evaluate environmental conditions affecting crop health.
4. Develop personalized fertilizer, irrigation, and pesticide recommendations.
5. Provide a centralized crop health dashboard for monitoring agricultural information and recommendation history.

---

## 🔮 Future Scope

* 🤖 Improve AI disease detection accuracy
* 🌾 Support multiple crops and diseases
* 🧪 Integrate laboratory soil report OCR
* 📷 Improve image-based soil assessment
* 🌦️ Integrate real-time weather services
* 🌱 Develop personalized fertilizer recommendations
* 💧 Add intelligent irrigation recommendations
* 🐛 Improve pesticide recommendations
* 🌐 Add multilingual support
* 📱 Develop a mobile application
* 📡 Integrate IoT-based agricultural sensors
* 📊 Add advanced farm analytics

---

## 📸 Screenshots

Screenshots of the application will be added as the project interface develops.

### 🏠 Landing Page

*Add screenshot here*

### 📊 Dashboard

*Add screenshot here*

### 🍃 Disease Detection

*Add screenshot here*

### 🧪 Soil Assessment

*Add screenshot here*

### 🌦️ Weather

*Add screenshot here*

---

## 👥 Project Information

**Project Name:** TomatoGuard AI <br>
**Domain:** Artificial Intelligence · Machine Learning · Smart Agriculture <br>
**Project Type:** Final-Year Academic Project <br>
**Development:** Ongoing <br>

---

## 📄 License

This project is developed for academic and educational purposes.
