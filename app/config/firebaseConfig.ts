// Firebase configuration with TypeScript support
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  getFirestore, 
  Firestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { Messaging } from "firebase/messaging";

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// Validate environment variables
const validateEnvVar = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCLPbkZawJ6PubRUmswjbDNgsQJSzo-Wq8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "megg-tech.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "megg-tech",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "megg-tech.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "733167941133",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:733167941133:web:e5a1a8edc9aee56b9dc744",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-H6HZSKD90P",
};

// Initialize Firebase only if it hasn't been initialized already
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

// Initialize services with proper typing
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Re-export Firestore functions for convenience
export { collection, getDocs, query, where, orderBy, limit };

// Initialize messaging conditionally (only in browser environment)
let messaging: Messaging | null = null;

export const initializeMessaging = async (): Promise<Messaging | null> => {
  if (typeof window !== "undefined" && !messaging) {
    try {
      const { getMessaging } = await import("firebase/messaging");
      messaging = getMessaging(app);
    } catch (error) {
      // Error handled silently
      return null;
    }
  }
  return messaging;
};

// Get messaging instance (for use in components)
export const getMessagingInstance = (): Messaging | null => messaging;

// Export app instance
export { app };

// Export config for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  
}

