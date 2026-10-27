import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

const provider = new GoogleAuthProvider();
YOUTUBE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account consent',
  access_type: 'offline',
});

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Checks if user just completed a full-page redirect authentication
 */
export const checkRedirectResult = async (): Promise<{
  user: User;
  accessToken: string;
  channel?: any;
  requiresApiEnablement?: boolean;
  activationUrl?: string;
  projectId?: string;
} | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) return null;

    cachedAccessToken = credential.accessToken;

    const res = await fetch('/api/auth/token-exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cachedAccessToken}`,
      },
      body: JSON.stringify({
        accessToken: cachedAccessToken,
        email: result.user.email,
        name: result.user.displayName,
        picture: result.user.photoURL,
        uid: result.user.uid,
      }),
    });

    const data = await res.json();
    return {
      user: result.user,
      accessToken: cachedAccessToken,
      channel: data.channel,
      requiresApiEnablement: Boolean(data.requiresApiEnablement),
      activationUrl: data.activationUrl,
      projectId: data.projectId,
    };
  } catch (err: any) {
    if (err?.code !== 'auth/popup-closed-by-user') {
      console.warn('Redirect result check error:', err);
    }
    return null;
  }
};

/**
 * Initiates Google OAuth sign-in with popup or redirect
 * Handles user cancellations and popup blockers gracefully
 */
export const googleSignIn = async (
  mode: 'popup' | 'redirect' = 'popup'
): Promise<{
  user?: User;
  accessToken?: string;
  channel?: any;
  cancelled?: boolean;
  redirecting?: boolean;
  requiresApiEnablement?: boolean;
  activationUrl?: string;
  projectId?: string;
}> => {
  try {
    isSigningIn = true;

    if (mode === 'redirect') {
      await signInWithRedirect(auth, provider);
      return { redirecting: true };
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error('Failed to retrieve access token from Google OAuth consent flow.');
      }

      cachedAccessToken = credential.accessToken;

      // Send access token to backend to retrieve and store real YouTube channel
      const res = await fetch('/api/auth/token-exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cachedAccessToken}`,
        },
        body: JSON.stringify({
          accessToken: cachedAccessToken,
          email: result.user.email,
          name: result.user.displayName,
          picture: result.user.photoURL,
          uid: result.user.uid,
        }),
      });

      const data = await res.json();

      if (data.requiresApiEnablement) {
        return {
          user: result.user,
          accessToken: cachedAccessToken,
          channel: null,
          requiresApiEnablement: true,
          activationUrl: data.activationUrl,
          projectId: data.projectId,
        };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to exchange credentials with backend');
      }

      return {
        user: result.user,
        accessToken: cachedAccessToken,
        channel: data.channel,
      };
    } catch (popupError: any) {
      const isCancelled =
        popupError?.code === 'auth/popup-closed-by-user' ||
        popupError?.code === 'auth/cancelled-popup-request' ||
        popupError?.message?.includes('popup-closed-by-user') ||
        popupError?.message?.includes('cancelled-popup-request') ||
        String(popupError).includes('popup-closed-by-user');

      if (isCancelled) {
        return { cancelled: true };
      }

      // If popup is blocked by the browser, auto-fallback to redirect
      if (popupError?.code === 'auth/popup-blocked') {
        console.info('Popup blocked by browser. Switching to full-page redirect flow...');
        await signInWithRedirect(auth, provider);
        return { redirecting: true };
      }

      throw popupError;
    }
  } catch (error: any) {
    const isCancelled =
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request') ||
      String(error).includes('popup-closed-by-user');

    if (isCancelled) {
      return { cancelled: true };
    }
    console.warn('Google Sign-In caught issue:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  await fetch('/api/auth/disconnect', { method: 'POST' });
};
