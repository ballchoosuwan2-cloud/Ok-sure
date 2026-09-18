import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

// Initialize Firebase App safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Flag to track ongoing sign in flow
let isSigningIn = false;

// In-memory token cache (MUST NOT be persisted in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

// Auth state listeners
type AuthListener = (user: User | null, token: string | null) => void;
const listeners: Set<AuthListener> = new Set();

const notifyListeners = (user: User | null, token: string | null) => {
  listeners.forEach((listener) => {
    try {
      listener(user, token);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
};

export const subscribeToGoogleAuth = (callback: AuthListener) => {
  listeners.add(callback);
  callback(cachedGoogleUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
};

export const initGoogleAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedGoogleUser = user;
    if (user && cachedAccessToken) {
      notifyListeners(user, cachedAccessToken);
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
      }
      notifyListeners(user, cachedAccessToken);
      if (onFailure) onFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่พบ Access Token จากการยืนยันตัวตนด้วย Google');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifyListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCachedGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifyListeners(null, null);
};
