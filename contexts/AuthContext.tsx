import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  dateOfBirth: string;
  isOnline: boolean;
  lastSeen: any;
  createdAt: any;
  avatarId?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, dateOfBirth: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (uid: string, retries = 3): Promise<UserProfile | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setUserProfile(data);
          return data;
        }
        return null;
      } catch (error: any) {
        console.log(`Profile fetch attempt ${attempt + 1}/${retries}:`, error?.code || 'unknown');
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    return null;
  }, []);

  const setOnlineStatus = useCallback(async (uid: string, online: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isOnline: online,
        lastSeen: serverTimestamp(),
      });
    } catch {}
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile) {
          setOnlineStatus(firebaseUser.uid, true);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserProfile, setOnlineStatus]);

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(result.user.uid);
    setOnlineStatus(result.user.uid, true);
  };

  const signUp = async (email: string, password: string, fullName: string, dateOfBirth: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName });

    const profile: UserProfile = {
      uid: result.user.uid,
      displayName: fullName,
      email,
      photoURL: '',
      bio: '',
      dateOfBirth,
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', result.user.uid), profile);
    setUserProfile(profile);
  };

  const handleSignInWithGoogle = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const existingProfile = await fetchUserProfile(result.user.uid);
    if (!existingProfile) {
      const profile: UserProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName || 'Lucky User',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
        bio: '',
        dateOfBirth: '',
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', result.user.uid), profile);
      setUserProfile(profile);
    } else {
      setOnlineStatus(result.user.uid, true);
    }
  };

  const logout = async () => {
    if (user) {
      await setOnlineStatus(user.uid, false);
    }
    await signOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No user logged in');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updateData: any = { ...data };
    await updateDoc(doc(db, 'users', user.uid), updateData);
    if (data.displayName) {
      await updateProfile(user, { displayName: data.displayName });
    }
    const nameChanged = data.displayName && data.displayName !== userProfile?.displayName;
    const avatarChanged = data.avatarId !== undefined && data.avatarId !== (userProfile?.avatarId || '');
    if (nameChanged || avatarChanged) {
      try {
        const convsQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid)
        );
        const convsSnap = await getDocs(convsQuery);
        if (!convsSnap.empty) {
          const docs = convsSnap.docs;
          for (let i = 0; i < docs.length; i += 400) {
            const chunk = docs.slice(i, i + 400);
            const batch = writeBatch(db);
            chunk.forEach((convDoc) => {
              const updates: any = {};
              if (nameChanged) {
                updates[`participantNames.${user.uid}`] = data.displayName;
              }
              if (avatarChanged) {
                updates[`participantAvatarIds.${user.uid}`] = data.avatarId || '';
              }
              batch.update(convDoc.ref, updates);
            });
            await batch.commit();
          }
        }
      } catch (e) {
        console.warn('Failed to propagate profile updates to conversations:', e);
      }
    }
    await fetchUserProfile(user.uid);
  };

  const deleteAccount = async () => {
    if (!user) return;

    const convosQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
    const convosSnap = await getDocs(convosQuery);
    for (const convoDoc of convosSnap.docs) {
      const msgsQuery = query(collection(db, 'conversations', convoDoc.id, 'messages'));
      const msgsSnap = await getDocs(msgsQuery);
      const batch = writeBatch(db);
      msgsSnap.forEach((msgDoc) => batch.delete(msgDoc.ref));
      batch.delete(convoDoc.ref);
      await batch.commit();
    }

    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signInWithGoogle: handleSignInWithGoogle,
        logout,
        resetPassword,
        changePassword,
        updateUserProfile,
        deleteAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
