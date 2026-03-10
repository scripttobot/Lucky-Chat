import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  getDoc,
  limit as fbLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type MatchPhase = 'idle' | 'scanning' | 'matched';

export interface MatchState {
  phase: MatchPhase;
  matchedUserId: string | null;
  matchedUserName: string | null;
  matchedUserPhoto: string | null;
  conversationId: string | null;
}

const IDLE_STATE: MatchState = {
  phase: 'idle',
  matchedUserId: null,
  matchedUserName: null,
  matchedUserPhoto: null,
  conversationId: null,
};

export function useMatch(userId: string, userName: string, userPhoto: string, userAvatarId?: string) {
  const [state, setState] = useState<MatchState>(IDLE_STATE);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const matchingRef = useRef(false);
  const phaseRef = useRef<MatchPhase>('idle');

  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  const cleanupAllTimers = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (userId) {
      getDoc(doc(db, 'users', userId)).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.activeConversationId && data.matchedWith) {
            setState({
              phase: 'matched',
              matchedUserId: data.matchedWith,
              matchedUserName: data.matchedWithName || 'Stranger',
              matchedUserPhoto: data.matchedWithPhoto || '',
              conversationId: data.activeConversationId,
            });
          } else if (data.isScanning) {
            updateDoc(doc(db, 'users', userId), { isScanning: false }).catch(() => {});
            deleteDoc(doc(db, 'scanQueue', userId)).catch(() => {});
          }
        }
      }).catch(() => {});
    }

    return () => {
      isMountedRef.current = false;
      cleanupAllTimers();
      if (userId) {
        updateDoc(doc(db, 'users', userId), { isScanning: false }).catch(() => {});
        deleteDoc(doc(db, 'scanQueue', userId)).catch(() => {});
      }
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (!docSnap.exists() || !isMountedRef.current) return;
      const data = docSnap.data();

      if (data.matchedWith && data.activeConversationId && phaseRef.current === 'scanning') {
        cleanupAllTimers();
        setState({
          phase: 'matched',
          matchedUserId: data.matchedWith,
          matchedUserName: data.matchedWithName || 'Stranger',
          matchedUserPhoto: data.matchedWithPhoto || '',
          conversationId: data.activeConversationId,
        });
      }

      if (!data.matchedWith && !data.activeConversationId && phaseRef.current === 'matched') {
        cleanupAllTimers();
        setState(IDLE_STATE);
      }
    }, () => {});
    return unsubscribe;
  }, [userId, cleanupAllTimers]);

  const clearUserMatchState = useCallback(async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isScanning: false,
        matchedWith: null,
        activeConversationId: null,
        matchedWithName: null,
        matchedWithPhoto: null,
      });
    } catch {}
  }, []);

  const tryFindMatch = useCallback(async () => {
    if (!userId || matchingRef.current || phaseRef.current !== 'scanning') return;
    matchingRef.current = true;

    try {
      const myQueueSnap = await getDoc(doc(db, 'scanQueue', userId));
      if (!myQueueSnap.exists()) {
        matchingRef.current = false;
        return;
      }

      const q = query(collection(db, 'scanQueue'), fbLimit(20));
      const snapshot = await getDocs(q);

      let candidate: any = null;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.uid !== userId) {
          candidate = { id: docSnap.id, ...data };
          break;
        }
      }

      if (!candidate) {
        matchingRef.current = false;
        return;
      }

      const candidateQueueCheck = await getDoc(doc(db, 'scanQueue', candidate.uid));
      if (!candidateQueueCheck.exists()) {
        matchingRef.current = false;
        return;
      }

      const candidateUserSnap = await getDoc(doc(db, 'users', candidate.uid));
      if (!candidateUserSnap.exists() || !candidateUserSnap.data().isScanning) {
        await deleteDoc(doc(db, 'scanQueue', candidate.uid)).catch(() => {});
        matchingRef.current = false;
        return;
      }

      await deleteDoc(doc(db, 'scanQueue', userId));
      await deleteDoc(doc(db, 'scanQueue', candidate.uid));

      const convoRef = await addDoc(collection(db, 'conversations'), {
        participants: [userId, candidate.uid],
        participantNames: {
          [userId]: userName,
          [candidate.uid]: candidate.displayName,
        },
        participantPhotos: {
          [userId]: userPhoto || '',
          [candidate.uid]: candidate.photoURL || '',
        },
        participantAvatarIds: {
          [userId]: userAvatarId || '',
          [candidate.uid]: candidate.avatarId || '',
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: '',
        unreadCount: { [userId]: 0, [candidate.uid]: 0 },
        status: 'accepted',
        requestedBy: userId,
        createdAt: serverTimestamp(),
        isRandomMatch: true,
      });

      await updateDoc(doc(db, 'users', userId), {
        isScanning: false,
        matchedWith: candidate.uid,
        matchedWithName: candidate.displayName,
        matchedWithPhoto: candidate.photoURL || '',
        activeConversationId: convoRef.id,
      });

      await updateDoc(doc(db, 'users', candidate.uid), {
        isScanning: false,
        matchedWith: userId,
        matchedWithName: userName,
        matchedWithPhoto: userPhoto || '',
        activeConversationId: convoRef.id,
      });

      cleanupAllTimers();

      if (isMountedRef.current) {
        setState({
          phase: 'matched',
          matchedUserId: candidate.uid,
          matchedUserName: candidate.displayName,
          matchedUserPhoto: candidate.photoURL || '',
          conversationId: convoRef.id,
        });
      }
    } catch (error) {
      console.log('Match error:', error);
    } finally {
      matchingRef.current = false;
    }
  }, [userId, userName, userPhoto, userAvatarId, cleanupAllTimers]);

  const startScanning = useCallback(async () => {
    if (!userId || !userName) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isScanning: true,
        matchedWith: null,
        activeConversationId: null,
        matchedWithName: null,
        matchedWithPhoto: null,
      });

      await setDoc(doc(db, 'scanQueue', userId), {
        uid: userId,
        displayName: userName,
        photoURL: userPhoto || '',
        avatarId: userAvatarId || '',
        createdAt: serverTimestamp(),
      });

      setState({
        phase: 'scanning',
        matchedUserId: null,
        matchedUserName: null,
        matchedUserPhoto: null,
        conversationId: null,
      });

      scanIntervalRef.current = setInterval(() => {
        if (isMountedRef.current && phaseRef.current === 'scanning') {
          tryFindMatch();
        }
      }, 2000);

      initialTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && phaseRef.current === 'scanning') tryFindMatch();
      }, 600);
    } catch (error) {
      console.log('Start scanning error:', error);
    }
  }, [userId, userName, userPhoto, userAvatarId, tryFindMatch]);

  const stopScanning = useCallback(async () => {
    cleanupAllTimers();
    await clearUserMatchState(userId);
    await deleteDoc(doc(db, 'scanQueue', userId)).catch(() => {});

    if (isMountedRef.current) {
      setState(IDLE_STATE);
    }
  }, [userId, cleanupAllTimers, clearUserMatchState]);

  const deleteConversationData = useCallback(async (convoId: string) => {
    try {
      const msgsQuery = query(collection(db, 'conversations', convoId, 'messages'));
      const msgsSnap = await getDocs(msgsQuery);
      const batch = writeBatch(db);
      msgsSnap.forEach((msgDoc) => batch.delete(msgDoc.ref));
      batch.delete(doc(db, 'conversations', convoId));
      await batch.commit();
    } catch {}
  }, []);

  const skipMatch = useCallback(async () => {
    cleanupAllTimers();
    const convoId = state.conversationId;
    const matchedId = state.matchedUserId;

    setState(IDLE_STATE);

    if (convoId) await deleteConversationData(convoId);
    await clearUserMatchState(userId);
    if (matchedId) await clearUserMatchState(matchedId);

    if (isMountedRef.current) {
      skipTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) startScanning();
      }, 400);
    }
  }, [state.conversationId, state.matchedUserId, userId, cleanupAllTimers, clearUserMatchState, deleteConversationData, startScanning]);

  const acceptMatch = useCallback(async (): Promise<string | null> => {
    cleanupAllTimers();
    const convoId = state.conversationId;

    await clearUserMatchState(userId);
    if (state.matchedUserId) {
      await clearUserMatchState(state.matchedUserId);
    }

    if (isMountedRef.current) {
      setState(IDLE_STATE);
    }

    return convoId;
  }, [state.conversationId, state.matchedUserId, userId, cleanupAllTimers, clearUserMatchState]);

  return {
    ...state,
    startScanning,
    stopScanning,
    skipMatch,
    acceptMatch,
  };
}
