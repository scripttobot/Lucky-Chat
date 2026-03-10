# Lucky Chat

A professional Android messaging app built with React Native (Expo) and Firebase. Features real-time chat, random matching, user search, 24-hour auto-deleting messages, and a complete monetization system with ads and premium subscription.

## Features

### Core
- **Authentication** — Email/password login (Gmail accounts only), registration, password reset, Google Sign-In
- **Random Matching** — Omegle-style instant matching with online users
- **Real-time Chat** — Messenger-style messaging with typing indicators and read receipts
- **Chat Requests** — Search users by username and send chat requests
- **Message Actions** — Long-press to edit (your messages) or delete (any message)
- **24-Hour Messages** — Messages auto-delete after 24 hours (rolling window)
- **Profile System** — 24 free + 32 premium emoji avatars, display name, online status tracking
- **Green Theme** — Clean WhatsApp-inspired design (#2DB553)
- **Bottom Tab Navigation** — Home (Match), Search, Chat, Settings

### Monetization
- **Banner Ads** — Displayed at bottom of chat list screen (hidden for premium users)
- **Interstitial Ads** — Full-screen ad shown every 3rd match before entering chat
- **Rewarded Ads** — Watch a video ad to earn 5 extra daily matches or 30-min profile boost
- **Premium Subscription** — Unlimited matches, no ads, premium avatars, profile boost, and more

### Premium Features
- Unlimited daily matches (free users get 10/day)
- Ad-free experience (no banner, interstitial, or rewarded ads)
- 32 exclusive premium emoji avatars with star badge
- Permanent profile boost (always first in search results)
- Read receipts, typing indicators
- Photo sharing, voice messages (coming soon)
- Chat themes, message reactions (coming soon)

## Tech Stack

- **Frontend**: React Native with Expo SDK 54 + Expo Router
- **Backend**: Firebase (Authentication, Cloud Firestore, Storage)
- **Ads**: Google AdMob via `react-native-google-mobile-ads`
- **Payments**: RevenueCat (planned)
- **State**: React Context + React Query
- **Language**: TypeScript
- **Build**: EAS Build (APK / AAB / iOS)

No separate backend server needed — the app communicates directly with Firebase.

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/               # Bottom tab screens (Home, Search, Chat, Settings)
  auth/                 # Login, Register, Forgot Password
  chat/[id].tsx         # Individual chat screen
  profile.tsx           # User profile viewer
  premium.tsx           # Premium subscription paywall
  notifications.tsx     # Chat request notifications
components/             # Reusable UI components
  ads/BannerAdView.tsx  # Banner ad component (AdMob or placeholder)
  chat/                 # ChatBubble, ChatInput
  common/               # Avatar, Button, Input
contexts/
  AuthContext.tsx        # Firebase Auth + user profile management
  PremiumContext.tsx     # Premium status, daily match limits, boost tracking
hooks/
  useChat.ts            # Chat operations (send, edit, delete, requests)
  useMatch.ts           # Random matching logic
  useEphemeral.ts       # 24-hour message auto-cleanup
lib/
  firebase.ts           # Firebase initialization (config hardcoded)
  ads.ts                # AdMob integration (banner, interstitial, rewarded)
constants/              # Colors, theme, avatar definitions (24 free + 32 premium)
firestore.rules         # Firestore security rules
eas.json                # EAS Build profiles (APK, AAB, iOS)
```

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (comes with Node.js)
- **Expo Go** app on your Android phone ([Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **EAS CLI** for building APK/AAB: `npm install -g eas-cli`

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/scripttobot/Lucky-Chat.git
cd Lucky-Chat

# 2. Install dependencies
npm install

# 3. Start the development server
npm start

# 4. Scan the QR code with Expo Go app on your phone
```

That's it! The app connects directly to Firebase — no environment variables or backend server needed.

## Google AdMob Setup

The app uses Google AdMob for ad monetization. Ad configuration is in **`lib/ads.ts`**.

### Test Ad IDs (Development)

The app ships with Google's official test ad IDs for development:

| Ad Type | Android Test ID | iOS Test ID |
|---|---|---|
| Banner | `ca-app-pub-3940256099942544/6300978111` | `ca-app-pub-3940256099942544/2934735716` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` | `ca-app-pub-3940256099942544/4411468910` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` | `ca-app-pub-3940256099942544/1712485313` |

### Production Ad IDs

To use your own AdMob account:

1. Create an account at [Google AdMob](https://admob.google.com)
2. Create an Android app and get your App ID
3. Create ad units (Banner, Interstitial, Rewarded)
4. Update **`lib/ads.ts`** — replace test IDs with your production IDs:

```typescript
// lib/ads.ts — Lines 3-18
export const AD_CONFIG = {
  BANNER_ID: Platform.select({
    android: 'ca-app-pub-YOUR_ID/BANNER_UNIT_ID',
    ios: 'ca-app-pub-YOUR_ID/BANNER_UNIT_ID',
    default: 'ca-app-pub-YOUR_ID/BANNER_UNIT_ID',
  }) as string,
  INTERSTITIAL_ID: Platform.select({
    android: 'ca-app-pub-YOUR_ID/INTERSTITIAL_UNIT_ID',
    ios: 'ca-app-pub-YOUR_ID/INTERSTITIAL_UNIT_ID',
    default: 'ca-app-pub-YOUR_ID/INTERSTITIAL_UNIT_ID',
  }) as string,
  REWARDED_ID: Platform.select({
    android: 'ca-app-pub-YOUR_ID/REWARDED_UNIT_ID',
    ios: 'ca-app-pub-YOUR_ID/REWARDED_UNIT_ID',
    default: 'ca-app-pub-YOUR_ID/REWARDED_UNIT_ID',
  }) as string,
};
```

5. Update **`app.json`** with your AdMob App ID:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-YOUR_ID~YOUR_APP_ID",
          "iosAppId": "ca-app-pub-YOUR_ID~YOUR_APP_ID"
        }
      ]
    ]
  }
}
```

6. Install the native ads package: `npx expo install react-native-google-mobile-ads`
7. Build with EAS (ads require native build, not Expo Go)

### How Ads Work

- **Banner Ad**: Shows at bottom of Chat List screen. Hidden for Premium users.
- **Interstitial Ad**: Full-screen ad every 3rd random match (before entering chat). Skipped for Premium.
- **Rewarded Ad**: User watches video to earn 5 bonus matches or 30-min profile boost. Available when match limit reached.

> **Note**: In Expo Go and web preview, ads show as "Ad Space" placeholder. Real ads only appear in EAS native builds.

## Premium Subscription

Premium features are managed through `contexts/PremiumContext.tsx`. The paywall screen is at `app/premium.tsx`.

### Free vs Premium

| Feature | Free | Premium |
|---|---|---|
| Daily matches | 10/day | Unlimited |
| Ads | Banner + Interstitial + Rewarded | None |
| Avatars | 24 basic | 24 basic + 32 premium |
| Profile badge | None | Star badge |
| Search boost | 30-min via ad | Always boosted |
| Read receipts | Via ad (24h) | Always |

### RevenueCat Integration (Coming Soon)

The premium subscription is currently a UI stub. To activate real payments:

1. Create a [RevenueCat](https://www.revenuecat.com) account
2. Set up your products (Monthly $2.99, Yearly $19.99)
3. Connect Google Play / App Store
4. Update `app/premium.tsx` to call RevenueCat purchase flow
5. Update `contexts/PremiumContext.tsx` to check entitlements

## Run from Termux (Android)

You can develop and test Lucky Chat entirely from your Android phone using Termux.

### Step 1: Install Termux and Node.js

```bash
# Install from F-Droid (NOT Play Store — Play Store version is outdated)
# https://f-droid.org/en/packages/com.termux/

# Inside Termux:
pkg update && pkg upgrade
pkg install nodejs-lts git
```

### Step 2: Clone and Install

```bash
git clone https://github.com/scripttobot/Lucky-Chat.git
cd Lucky-Chat
npm install
```

### Step 3: Start the App

```bash
npm start
```

### Step 4: Open in Expo Go

**Same phone (Termux + Expo Go on same device):**
1. After `npm start`, you'll see a URL like `exp://192.168.x.x:8081`
2. Copy this URL
3. Open Expo Go app
4. Tap "Enter URL manually"
5. Paste the URL and tap "Connect"

**Different device:**
- Scan the QR code with Expo Go (both devices must be on same WiFi)

### Troubleshooting

**"ENOSPC: System limit for number of file watchers reached" error:**

The `metro.config.js` already excludes test directories to reduce watcher count. If you still get this error:

```bash
# Option 1: Use tunnel mode (works without fixing watchers)
npx expo start --tunnel

# Option 2: If you have root access (Magisk/KernelSU)
echo "fs.inotify.max_user_watches=524288" | sudo sysctl -p -
```

**Metro bundler crashes or hangs:**
```bash
# Clear cache and restart
npx expo start --clear
```

## Build APK (for direct install)

Build a standalone APK file that you can install directly on any Android device.

### Step 1: Install EAS CLI and Login

```bash
npm install -g eas-cli
eas login
# Create a free account at https://expo.dev if you don't have one
```

### Step 2: Build APK

```bash
eas build --platform android --profile preview
```

This will:
- Upload your project to Expo's build servers
- Build an APK file (~5-10 minutes)
- Give you a download link when finished

### Step 3: Install on Phone

- Download the APK from the link EAS provides
- Open it on your Android phone and install
- You may need to allow "Install from unknown sources" in settings

## Build AAB (for Google Play Store)

Build an Android App Bundle for publishing on Google Play Store.

```bash
eas build --platform android --profile production
```

### Publish to Google Play Store

1. Create a [Google Play Console](https://play.google.com/console) developer account ($25 one-time fee)
2. Create a new app in Play Console
3. Upload the AAB file from EAS build
4. Fill in store listing (screenshots, description, etc.)
5. Submit for review

Or use EAS Submit to automate the upload:

```bash
eas submit --platform android
```

## Build for iOS

```bash
# Build for iOS (requires Apple Developer account — $99/year)
eas build --platform ios --profile production
```

### Publish to App Store

1. Create an [Apple Developer](https://developer.apple.com) account
2. Create an App ID and provisioning profile in App Store Connect
3. Build with EAS (it handles signing automatically)
4. Submit:

```bash
eas submit --platform ios
```

## Firebase Setup

The app uses Firebase project `lucky-chat-7c535`. The Firebase config is hardcoded in `lib/firebase.ts`.

### Firestore Security Rules

Deploy the included security rules to your Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/project/lucky-chat-7c535/firestore/rules)
2. Copy the contents of `firestore.rules`
3. Paste into the Rules tab and click "Publish"

### Key Rules

- Users can only read/write their own profile
- `isPremium` and `premiumExpiry` fields are protected (server-side only)
- Messages can be sent by conversation participants only
- Message editing restricted to sender (only `text` and `edited` fields)
- Message deletion allowed by any conversation participant
- Conversations accessible only to their participants

### Google Sign-In Setup

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Google provider
3. Copy the Web Client ID
4. Update `lib/firebase.ts` line 20:
   ```typescript
   export const GOOGLE_WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";
   ```

### Using Your Own Firebase Project

To use your own Firebase project instead:

1. Create a new project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Enable **Cloud Firestore**
4. Get your config from Project Settings > General > Your apps > Firebase SDK snippet
5. Update the `firebaseConfig` object in `lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

6. Deploy the `firestore.rules` to your new project

## App Configuration

- **Bundle ID**: `com.luckychat.app`
- **App Name**: Lucky Chat
- **Orientation**: Portrait only
- **Min SDK**: Expo SDK 54 (React Native 0.81)

## Revenue Estimates

| Ad Type | Revenue (per 1000 views) |
|---|---|
| Banner | $0.10 - $0.50 |
| Interstitial | $1 - $5 |
| Rewarded | $5 - $15 |
| Premium Subscription | $2.99/month or $19.99/year |

## License

This project is for personal/educational use.
