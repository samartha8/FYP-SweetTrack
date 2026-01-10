# SweetTrack 🩸🏃‍♂️
> **Your AI-Powered Companion for Diabetes Detection & Comprehensive Wellness.**

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

---

## 🌟 Overview

**SweetTrack** is a cutting-edge mobile health application designed to empower users in managing their health, specifically focusing on **Diabetes Risk Assessment** and prevention. By combining **Machine Learning models** for risk prediction with **Generative AI** for personalized assistance, SweetTrack offers a holistic approach to wellness.

From tracking daily activity via **Google Fit** to analyzing your meals with **AI-powered image recognition**, SweetTrack makes healthy living engaging, effortless, and smart.

---

## ✨ Key Features

### 🧠 **AI-Driven Health Insights**
*   **Diabetes Risk Score**: Calculate your potential risk using advanced ML algorithms based on your health metrics (BMI, family history, etc.).
*   **"Ask SweetTrack" Chatbot**: Your persistent 24/7 health assistant powered by **Groq & OpenAI** to answer questions about diet, symptoms, and workouts.

### 🍽️ **Smart Nutrition & Meal Logging**
*   **Snap & Track**: Simply take a photo of your food. Our AI identifies the dish and provides a nutritional breakdown (calories, carbs, proteins).
*   **Diet Suggestions**: Get personalized meal recommendations tailored to your health goals.

### ⌚ **Seamless Activity Integration**
*   **Google Fit Sync**: Automatically syncs your **Steps**, **Calories Burned**, and **Active Minutes**.
*   **Wellness Goals**: Set and track daily targets for **Water Intake**, **Sleep**, and **Movement**.

### 🎮 **Gamification & Rewards**
*   **Earn Points**: Get rewarded for hitting daily goals, logging meals, and maintaining streaks.
*   **Badges**: Unlock specialized badges for consistent healthy habits to stay motivated.

---

## 🏗️ Technology Stack

### **Mobile App (Frontend)**
*   **Framework**: React Native with Expo (Managed Workflow)
*   **Language**: TypeScript / JavaScript
*   **Routing**: Expo Router (File-based routing)
*   **Styling**: Lucide Icons, Expo Linear Gradient
*   **State Management**: React Context API & TanStack Query
*   **Storage**: Async Storage (Local persistence)

### **Backend API**
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB (Mongoose ODM)
*   **Authentication**: JWT & Passport (Google OAuth)
*   **AI Services**: Groq SDK, OpenAI API (for Chatbot & Vision)
*   **ML Integration**: Python Scikit-learn models (spawned via child processes)

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
*   **Node.js** (v18+)
*   **npm** or **yarn**
*   **Expo Go** app on your physical device or Android Emulator / iOS Simulator.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/FYPSweetTrack.git
cd FYPSweetTrack
```

### 2. Setup Backend
```bash
cd backend
npm install
# Create a .env file with your mongoURI, API keys (Groq, OpenAI), etc.
npm run dev
```

### 3. Setup Frontend
```bash
# Open a new terminal
cd ..
npm install
npx expo start
```

### 4. Run the App
*   Scan the QR code with **Expo Go** (Android/iOS).
*   Press `a` to run on Android Emulator.

---

## 📂 Project Structure

```
FYPSweetTrack/
├── app/
│   ├── (tabs)/               # Main tab navigation
│   ├── ui/                   # Shared UI components
│   ├── _layout.tsx           # Root layout
│   ├── health-setup.tsx      # Initial health data collection
│   ├── login.tsx             # Authentication screen
│   ├── onboarding.tsx        # Intro slides
│   └── ...                   # Other screens (diet, progress, etc.)
├── backend/
│   ├── ml_models/            # Python scripts for prediction
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # Database schemas
│   │   └── routes/           # API route definitions
│   └── server.js             # Entry point
├── components/               # React Native components
├── contexts/                 # State management (User, Meals, etc.)
├── assets/                   # Images and fonts
└── App.js / index.ts         # Entry configuration
```

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any features or bug fixes.

---

<p align="center">
  Made with ❤️ by the SweetTrack Team
</p>