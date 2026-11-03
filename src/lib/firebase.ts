import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
  }
} catch (error) {
  console.warn('Firebase client initialization skipped or restricted in current host:', error);
}

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();
