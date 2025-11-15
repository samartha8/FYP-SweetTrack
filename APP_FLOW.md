# SweetTrack Application Flow

## Overview
SweetTrack is a React Native health tracking application built with Expo Router. The app follows a sequential onboarding and authentication flow before allowing users to access the main application features.

---

## Application Flow Diagram

```
App Launch
    ↓
app/index.tsx (Entry Point)
    ↓
    Checks User State
    ↓
    ┌─────────────────────────────────────┐
    │                                     │
    │  Has User Onboarded?                │
    │  ┌───────────────────────────────┐  │
    │  │ NO → /onboarding              │  │
    │  │ YES → Continue                │  │
    │  └───────────────────────────────┘  │
    │                                     │
    │  Is User Logged In?                 │
    │  ┌───────────────────────────────┐  │
    │  │ NO → /login                    │  │
    │  │ YES → Continue                 │  │
    │  └───────────────────────────────┘  │
    │                                     │
    │  Has Health Setup Completed?        │
    │  ┌───────────────────────────────┐  │
    │  │ NO → /health-setup            │  │
    │  │ YES → /(tabs)/home            │  │
    │  └───────────────────────────────┘  │
    └─────────────────────────────────────┘
```

---

## Detailed Flow Breakdown

### 1. **App Initialization** (`app/_layout.tsx`)
   - **Providers Setup:**
     - `QueryClientProvider` (React Query for data fetching)
     - `GestureHandlerRootView` (Gesture handling)
     - `UserProvider` (Global user state management)
   - **Splash Screen:** Prevents auto-hide until app is ready
   - **Navigation Stack:** Configures all screens with headers hidden

### 2. **Entry Point** (`app/index.tsx`)
   - **Purpose:** Routing logic based on user state
   - **Checks (in order):**
     1. `isLoading` - Waits for data to load from AsyncStorage
     2. `hasOnboarded` - If false → redirects to `/onboarding`
     3. `user` - If null → redirects to `/login`
     4. `hasHealthSetup` - If false → redirects to `/health-setup`
     5. All checks pass → redirects to `/(tabs)/home`
   - **UI:** Shows loading spinner while checking

### 3. **Onboarding Flow** (`app/onboarding.tsx`)
   - **Purpose:** Introduce app features to first-time users
   - **Features:**
     - 5 slides showcasing app capabilities:
       1. Upload & Track Health Data
       2. Predict & Prevent Diseases
       3. Chatbot & Wellness Rewards
       4. Smart Meals & Achievements
       5. Auto Tracking & Progress
     - Horizontal scrollable slides with pagination dots
     - Skip button (available until last slide)
     - Next/Get Started button
   - **Actions:**
     - On "Get Started" or "Skip": Calls `completeOnboarding()` → saves to AsyncStorage → redirects to `/login`

### 4. **Authentication Flow**

   #### **Login Screen** (`app/login.tsx`)
   - **Fields:**
     - Email
     - Password
   - **Actions:**
     - Login button → calls `login(email, password)`
     - On success:
       - If `hasHealthSetup` is false → redirects to `/health-setup`
       - If `hasHealthSetup` is true → redirects to `/(tabs)/home`
     - "Create New Account" → navigates to `/signup`

   #### **Signup Screen** (`app/signup.tsx`)
   - **Fields:**
     - Full Name
     - Email
     - Password
     - Confirm Password
   - **Validation:**
     - All fields required
     - Password must match confirm password
   - **Actions:**
     - Signup button → calls `signup(name, email, password)`
     - On success → creates user in AsyncStorage → redirects to `/health-setup`
     - "Already have an account? Login" → navigates back to `/login`

### 5. **Health Setup Flow** (`app/health-setup.tsx`)
   - **Purpose:** Collect comprehensive health information for risk assessment
   - **Multi-Step Form:**
     
     **Step 1: Personal Information**
     - Age (required)
     - Gender: Male/Female/Other (required)
     - Height in cm (required)
     - Weight in kg (required)
     - Auto-calculates BMI
     
     **Step 2: Lifestyle Factors**
     - Physical Activity: 0, 1-2, 3-4, 5-6, 7 days/week (required)
     - Smoking Habit: Never/Former/Current (required)
     - Alcohol Consumption: Never/Occasional/Regular (required)
     
     **Step 3: Medical History**
     - Family History of Diabetes: No/Yes - Parent/Yes - Sibling/Yes - Both (required)
     - Previous Diagnosis: None/Pre-diabetes/Type 2 Diabetes/Type 1 Diabetes (required)
     - Current Medications (optional)
     
     **Step 4: Optional Metrics**
     - Fasting Glucose (mg/dL) - optional
     - Blood Pressure (Systolic/Diastolic) - optional
   
   - **Features:**
     - Progress bar showing completion percentage
     - Step validation before proceeding
     - Back button to navigate between steps
     - "Complete Setup" button on final step
   
   - **Actions:**
     - On completion → calls `updateUser()` with all health data → calls `completeHealthSetup()` → saves to AsyncStorage → redirects to `/(tabs)/home`

### 6. **Main Application** (`app/(tabs)/_layout.tsx`)
   - **Tab Navigation:** Bottom tab bar with 5 tabs:
     1. **Home** (`app/(tabs)/home.tsx`)
     2. **Wellness** (`app/(tabs)/wellness.tsx`) - *Not yet implemented*
     3. **Ask Chori** (`app/(tabs)/chatbot.tsx`) - *Not yet implemented*
     4. **Rewards** (`app/(tabs)/rewards.tsx`) - *Not yet implemented*
     5. **Profile** (`app/(tabs)/profile.tsx`) - *Not yet implemented*

### 7. **Home Screen** (`app/(tabs)/home.tsx`)
   - **Features:**
     - **Header:**
       - Personalized greeting with user name
       - Day streak counter
     
     - **Health Risk Score Card:**
       - Displays risk percentage and level (Low/Medium/High)
       - Color-coded based on risk level
       - Health status message
     
     - **Today's Progress:**
       - 4 metric cards with progress bars:
         - Steps (goal: 10,000)
         - Water (goal: 8 glasses)
         - Sleep (goal: 8 hours)
         - Calories (goal: 2,000 kcal)
       - Each card shows current value, goal, and progress percentage
     
     - **Quick Actions:**
       - 4 feature cards:
         - Diet Suggestion → `/diet-suggestions`
         - Meal Log → `/meal-log`
         - Progress → `/progress`
         - View All → `/view-all-meals`
   
   - **Data Source:** All data comes from `UserContext` (AsyncStorage)

---

## State Management

### **UserContext** (`contexts/UserContext.ts`)
   - **Global State:**
     - `user`: User profile information
     - `hasOnboarded`: Boolean flag for onboarding completion
     - `hasHealthSetup`: Boolean flag for health setup completion
     - `isLoading`: Loading state during initialization
     - `healthMetrics`: Daily health metrics (steps, water, sleep, calories)
     - `dailyGoals`: User's daily goals
     - `rewardsPoints`: Accumulated reward points
     - `streak`: Current day streak
   
   - **Persistence:**
     - All data stored in AsyncStorage
     - Loads on app initialization
     - Updates persist immediately to AsyncStorage
   
   - **Key Functions:**
     - `completeOnboarding()`: Marks onboarding as complete
     - `completeHealthSetup()`: Marks health setup as complete
     - `login()`: Authenticates user (currently checks AsyncStorage)
     - `signup()`: Creates new user account
     - `updateUser()`: Updates user profile information
     - `updateHealthMetrics()`: Updates daily health metrics
     - `updateDailyGoals()`: Updates daily goals

---

## Navigation Structure

```
Stack Navigator (app/_layout.tsx)
├── index.tsx (Entry/Routing Logic)
├── onboarding.tsx
├── login.tsx
├── signup.tsx
├── health-setup.tsx
└── (tabs)/
    └── Tab Navigator
        ├── home.tsx
        ├── wellness.tsx (Not implemented)
        ├── chatbot.tsx (Not implemented)
        ├── rewards.tsx (Not implemented)
        └── profile.tsx (Not implemented)
```

---

## Data Flow

1. **App Launch:**
   - `UserContext` loads data from AsyncStorage
   - `index.tsx` checks user state
   - Routes to appropriate screen

2. **Onboarding:**
   - User views slides → completes onboarding → saves flag → routes to login

3. **Authentication:**
   - User logs in or signs up → saves user data → routes to health setup (if new) or home (if returning)

4. **Health Setup:**
   - User fills multi-step form → saves health data → marks setup complete → routes to home

5. **Main App:**
   - User accesses home screen and other tabs
   - All data read from UserContext (AsyncStorage)

---

## Key Technologies

- **Framework:** React Native with Expo
- **Routing:** Expo Router (file-based routing)
- **State Management:** React Context API with custom hook
- **Storage:** AsyncStorage (local persistence)
- **UI Libraries:**
  - `expo-linear-gradient` for gradients
  - `lucide-react-native` for icons
  - `react-native-safe-area-context` for safe area handling
- **Data Fetching:** TanStack React Query (configured but not heavily used yet)

---

## Current Implementation Status

✅ **Completed:**
- Onboarding flow
- Authentication (login/signup)
- Health setup multi-step form
- Home screen with progress tracking
- User context and state management
- Navigation structure

🚧 **Not Yet Implemented:**
- Wellness tab screen
- Chatbot tab screen
- Rewards tab screen
- Profile tab screen
- Diet suggestions feature
- Meal log feature
- Progress tracking feature
- View all meals feature
- Backend API integration (currently using AsyncStorage only)

---

## User Journey Summary

1. **First Launch:** Onboarding → Login → Signup → Health Setup → Home
2. **Returning User (Logged Out):** Login → Home (if health setup done) OR Health Setup (if not done)
3. **Returning User (Logged In):** Direct to Home
4. **New User:** Onboarding → Signup → Health Setup → Home

