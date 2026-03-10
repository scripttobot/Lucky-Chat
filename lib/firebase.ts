import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyB-L-JCpzgfJtVQfS3K3m8pMVoUuYlPmLU",
  authDomain: "lucky-chat-7c535.firebaseapp.com",
  projectId: "lucky-chat-7c535",
  storageBucket: "lucky-chat-7c535.firebasestorage.app",
  messagingSenderId: "1072285501437",
  appId: "1:1072285501437:android:f9860bdbba988fa9d2fb94",
};

export const GOOGLE_WEB_CLIENT_ID = "1072285501437-REPLACE_WITH_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    const rnAuth = require('@firebase/auth/dist/rn/index.js');
    auth = initializeAuth(app, {
      persistence: rnAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
