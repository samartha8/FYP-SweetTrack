# SweetTrack 🩸🏃‍♂️
> **Your AI-Powered Companion for Diabetes Detection & Comprehensive Wellness.**

[![React Native](https://img.shields.io/badge/React_Native-v0.76-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-v52-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

---

## 🌟 Overview

**SweetTrack** is a cutting-edge mobile health application designed to empower users in managing their health, specifically focusing on **Diabetes Risk Assessment**, nutrition monitoring, and holistic wellness. By combining advanced **Machine Learning models** for risk prediction with **Generative AI** for personalized assistance, SweetTrack offers an interactive, premium experience.

The app uses **Expo (SDK 52)** and **React Native** for a fluid mobile experience on Android and iOS, styled with dynamic mesh gradients, elegant micro-animations, and a highly responsive design.

---

## ✨ Key Frontend Features

### 🧠 **Metabolic Risk Profiling & Prediction**
*   **Health Setup Questionnaire**: A smooth multi-step onboarding setup wizard (`app/health-setup.tsx`) that collects essential metrics (BMI, family history, smoking habits, activity levels, diet, etc.).
*   **Diabetes Risk Calculator**: Sends metrics to the backend ML service and renders a high-fidelity visual risk score indicator (`app/prediction.tsx`) with detailed metabolic feedback.

### 🛡️ **Metabolic Synergy Engine**
*   **Real-Time Risk Neutralization**: Calculates a daily synergy neutralization percentage (`app/progress-impact.tsx`) assessing the balance between physical activity (Google Fit steps) and dietary logs (sugar/calories).
*   **Compound Risk Warnings**: Dynamically triggers warnings and synergy penalties if high glycemic loads are logged during periods of prolonged physical inactivity.
*   **Synergy Report PDF Export**: Generates and exports clinical-grade mitigation reports via local sharing or system PDF printing (`expo-print`).

### 🍽️ **Dual-Mode AI Meal Logger**
*   **Image Scan Mode**: Take a photo or upload an image of a meal. AI vision parses the dish and yields a full nutritional breakdown.
*   **Natural Language Mode**: Describe your meal in text format (e.g., *"I had a small bowl of chicken curry and white rice"*), and AI parses it into structured nutrients.
*   **Portion Control**: Modify quantities and scale portion sizes (Small / Standard / Big) with real-time recalculation of calories, carbs, protein, fat, fiber, sugar, and sodium (`app/meal-login.tsx`).
*   **Clinical Safety Guards**: Recommends healthy food swaps, alerts users to metabolic hazards based on their risk profile, and warns of restricted ingredients.

### 💬 **"Ask SweetTrack" Chatbot**
*   **AI Health Assistant**: Persistent chat interface (`app/(tabs)/chatbot.tsx`) powered by Groq & OpenAI to address diet queries, meal options, and fitness suggestions.

### ⌚ **Wellness Tracker**
*   **Activity Logs**: Record daily steps, sleep duration, active minutes, and water intake (`app/(tabs)/wellness.tsx`).
*   **Google Fit Integration**: Automatically sync wellness parameters with Google Fit API callback handling (`app/google-fit/callback.tsx`).

### 🎮 **Gamification & Rewards Engine**
*   **Achievements**: Accumulate points, levels, and maintain streaks for consistent logging (`app/(tabs)/rewards.tsx`).
*   **Badge System**: Unlock 6 specialized badges (First Steps, Week Warrior, Health Hero, Hydration Master, Step Champion, Wellness Guru) automatically tracked based on health achievements.
*   **Marketplace**: Redeem accumulated points for local vouchers (Bhat-Bhateni Rs. 500 Voucher and QFX Cinemas Movie Ticket).

### 🥗 **Clinical Diet & Nutrition Advisory**
*   **Targeted Diet Plans**: Built-in guides (`app/diet-suggestions.tsx`) for *Diabetic-Friendly*, *Weight Loss*, *Heart-Healthy*, *Balanced*, *High-Protein*, and *Vegetarian* lifestyles.
*   **Calorie & Macro Ratio Guides**: Displays daily calorie targets, target conditions, and macronutrient ratios (proteins, carbs, fats).
*   **Dietary Guidance**: Displays detailed action-based recommendations and lists of foods to avoid based on the chosen plan.

### 📈 **Analytics & User Tools**
*   **Progress Charts**: View visual metrics charts tracking weight and overall logging compliance (`app/progress.tsx` and `app/progress-impact.tsx`).
*   **Localization**: Real-time language selector (supporting English and Nepali) via `components/LanguageSelector.tsx`.
*   **Settings Engine**: Light/Dark theme configuration, profile editing (`app/edit-profile.tsx`), and historical records viewing (`app/health-records.tsx` & `app/health-history.tsx`).

---

## 🏗️ Technology Stack

### **Frontend Architecture**
*   **Framework**: React Native v0.76 with Expo SDK 52 (Managed Workflow / Development Client)
*   **Routing**: Expo Router v4 (Strict file-based routing)
*   **Animations**: React Native Reanimated v3 (for fluid transitions and scanning animations)
*   **State Management**: React Context API & TanStack Query (React Query v5)
*   **APIs & Networking**: Axios and custom `secureFetch` client (handling JWT auto-refresh and ngrok proxy headers)
*   **Storage**: React Native Async Storage & Expo Secure Store

### **Backend API**
*   **Runtime**: Node.js & Express.js
*   **Database**: MongoDB (Mongoose ODM)
*   **Security & Auth**: Passport JWT & Google OAuth
*   **ML Engine**: Python Scikit-learn models based on CDC BRFSS datasets

---

## 🚀 Getting Started

Follow these steps to set up the development environment.

### Prerequisites
*   **Node.js** (v18 or higher)
*   **npm** or **yarn**
*   **Android Studio** (for Android Emulator) or **Xcode** (for iOS Simulator)
*   **Expo Go** app or pre-built Dev Client.

### 1. Clone the Repository
```bash
git clone https://github.com/samartha8/FYPSweetTrack.git
cd FYPSweetTrack
```

### 2. Setup Backend Server
Open a terminal and navigate to the backend folder:
```bash
cd backend
npm install
# Create a .env file with your PORT, MONGO_URI, JWT_SECRET, and AI API keys
npm start
```
*The server will start running on port 5000 (or as configured) and connect to MongoDB.*

### 3. Setup Frontend App
In a **new** terminal window at the project root:
```bash
# Install frontend packages
npm install

# Run on Android Emulator (auto-starts emulator, builds and installs development client)
npx expo run:android

# Run on iOS Simulator
npx expo run:ios

# Alternatively, start Metro Bundler for Expo Go / Web
npx expo start
```

---

## 📂 Project Structure

```
FYPSweetTrack/
├── app/                           # Expo Router Screens & Navigation
│   ├── (tabs)/                    # Main Tab Navigation
│   │   ├── _layout.tsx            # Tab navigator configuration
│   │   ├── home.tsx               # Main user dashboard
│   │   ├── chatbot.tsx            # "Ask SweetTrack" AI health assistant
│   │   ├── wellness.tsx           # Sleep, steps, hydration logging dashboard
│   │   ├── rewards.tsx            # Achievements, streaks, and vouchers marketplace
│   │   └── profile.tsx            # User metrics, earned badges, and settings link
│   ├── auth/                      # Authentication redirect handlers
│   │   └── callback.tsx           # Google OAuth callback redirection
│   ├── google-fit/                # Fitness sync callback handlers
│   │   └── callback.tsx           # Google Fit OAuth callback redirection
│   ├── _layout.tsx                # Main app layout, root providers, & translation wrappers
│   ├── index.tsx                  # App entry router (handles session-state redirection)
│   ├── onboarding.tsx             # Interactive introduction onboarding slides
│   ├── login.tsx                  # Email/Password & Google login panel
│   ├── signup.tsx                 # Account registration screen
│   ├── health-setup.tsx           # Multi-step metabolic risk profiling form
│   ├── prediction.tsx             # Calculated diabetes risk score & details screen
│   ├── meal-login.tsx             # Dual-mode AI Meal Logger interface
│   ├── meal-log.tsx               # Alias route redirecting to meal-login
│   ├── view-all-meals.tsx         # Comprehensive meal logging history list
│   ├── diet-suggestions.tsx       # Diet Plans recommendations & foods-to-avoid
│   ├── progress.tsx               # Wellness charts and weight tracking analytics
│   ├── progress-impact.tsx        # Deeper analytics highlighting wellness progress
│   ├── daily-recap.tsx            # Quick daily metrics overview card
│   ├── daily-report.tsx           # Detailed daily health analysis reporting
│   ├── edit-profile.tsx           # Change profile details and physical metrics
│   ├── settings.tsx               # Themes, languages, and app utilities config
│   ├── health-records.tsx         # User's metabolic logs & past history logs
│   ├── health-history.tsx         # Historical records tracker
│   ├── privacy-policy.tsx         # Local data policies and compliance screen
│   └── model.tsx                  # Template helper modal view
├── components/                    # Shared React Native interface widgets
│   ├── ui/                        # Low-level layout components (Collapsible, IconSymbol)
│   ├── LanguageSelector.tsx       # Language localization selector component
│   └── MeshGradientBackground.tsx  # Premium background asset
├── contexts/                      # State & context providers
│   ├── AuthContext.tsx            # Session status & credentials context
│   ├── HealthContext.tsx          # Diabetes status, risk score, & rewards updater
│   ├── MealTrackingContext.tsx     # Current food logs and diet plan preferences
│   └── SettingsContext.tsx        # Color theme and translation utilities
├── hooks/                         # Common application hooks
├── lib/                           # Fetch helpers & custom clients (secureFetch)
├── utils/                         # Global utilities (responsive scale configuration)
└── assets/                        # Fonts, icons, logo vectors
```

---

## 🛠️ Troubleshooting

*   **Emulator Stuck / Black Screen**:
    *   Close the emulator window.
    *   In **Android Studio**, open **Device Manager**, click the 3 dots next to your virtual device, and select **Cold Boot Now**.
*   **Metro Bundler Syncing issue**:
    *   If Metro starts but the app doesn't launch, press `a` in your terminal to force open it in Android or `i` for iOS.
    *   Ensure the backend URL inside your frontend configurations (`constants/Api.ts`) is correctly updated if using physical devices (e.g., local IP or ngrok tunnel).

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any features or bug fixes.

---