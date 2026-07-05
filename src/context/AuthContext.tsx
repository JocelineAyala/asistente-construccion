import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirebaseAuth,
  googleAuthProvider,
  isFirebaseConfigured,
} from '../lib/firebase';

type AuthUser = {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  provider: 'google' | 'local';
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isGoogleAuthAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signInLocally: (email: string) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_USER_KEY = 'buildassist:local-user';

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName || 'Usuario Google',
    email: user.email || '',
    photoURL: user.photoURL || undefined,
    provider: 'google',
  };
}

function readLocalUser(): AuthUser | null {
  const raw = localStorage.getItem(LOCAL_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeLocalUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(LOCAL_USER_KEY);
    return;
  }

  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isGoogleAuthAvailable = isFirebaseConfigured();

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(readLocalUser());
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser = mapFirebaseUser(firebaseUser);
        setUser(mappedUser);
        writeLocalUser(mappedUser);
      } else {
        setUser(readLocalUser());
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured()) {
      throw new Error('Configura Firebase en el archivo .env para usar Google.');
    }

    try {
      await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
    } catch (error) {
      const popupError = error as { code?: string };
      if (popupError.code === 'auth/popup-blocked') {
        await signInWithRedirect(getFirebaseAuth(), googleAuthProvider);
        return;
      }
      throw error;
    }
  };

  const signInLocally = (email: string) => {
    const normalizedEmail = email.trim() || 'usuario.local@prototipo.app';
    const localUser: AuthUser = {
      uid: `local-${normalizedEmail.toLowerCase()}`,
      displayName: normalizedEmail.split('@')[0],
      email: normalizedEmail,
      provider: 'local',
    };
    setUser(localUser);
    writeLocalUser(localUser);
  };

  const signOut = async () => {
    writeLocalUser(null);
    setUser(null);

    if (isFirebaseConfigured()) {
      await firebaseSignOut(getFirebaseAuth());
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isGoogleAuthAvailable,
      signInWithGoogle,
      signInLocally,
      signOut,
    }),
    [user, loading, isGoogleAuthAvailable],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return context;
}
