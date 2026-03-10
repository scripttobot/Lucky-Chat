import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  getDoc,
  increment,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  read: boolean;
  edited?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  participantAvatarIds?: Record<string, string>;
  lastMessage: string;
  lastMessageTime: any;
  lastMessageSenderId: string;
  unreadCount: Record<string, number>;
  status: 'pending' | 'accepted';
  requestedBy: string;
  createdAt: any;
}

function getTimestampMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toMillis) return ts.toMillis();
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  return 0;
}

export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'accepted') {
          convos.push({ id: docSnap.id, ...data } as Conversation);
        }
      });
      convos.sort((a, b) => getTimestampMs(b.lastMessageTime) - getTimestampMs(a.lastMessageTime));
      setConversations(convos);
      setLoading(false);
    }, (error) => {
      console.log('Conversations listener:', error?.code || error);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { conversations, loading };
}

export function useChatRequests(userId: string) {
  const [requests, setRequests] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'pending' && data.requestedBy !== userId) {
          reqs.push({ id: docSnap.id, ...data } as Conversation);
        }
      });
      reqs.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.log('Requests listener:', error?.code || error);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { requests, loading };
}

export function usePendingSentRequests(userId: string) {
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'pending' && data.requestedBy === userId) {
          const otherId = data.participants?.find((p: string) => p !== userId);
          if (otherId) ids.add(otherId);
        }
      });
      setSentTo(ids);
    }, () => {});

    return unsubscribe;
  }, [userId]);

  return sentTo;
}

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.log('Messages listener:', error?.code || error);
      setLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  return { messages, loading };
}

export function useChatActions() {
  const sendMessage = useCallback(async (
    conversationId: string,
    text: string,
    senderId: string,
    senderName: string,
  ) => {
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      text,
      senderId,
      senderName,
      createdAt: serverTimestamp(),
      read: false,
    });

    const convoDoc = await getDoc(doc(db, 'conversations', conversationId));
    if (convoDoc.exists()) {
      const data = convoDoc.data();
      const otherId = data.participants?.find((p: string) => p !== senderId) || '';

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: senderId,
        [`unreadCount.${otherId}`]: increment(1),
      });
    }
  }, []);

  const sendChatRequest = useCallback(async (
    fromUserId: string,
    fromUserName: string,
    fromUserPhoto: string,
    toUserId: string,
    toUserName: string,
    toUserPhoto: string,
    fromUserAvatarId?: string,
    toUserAvatarId?: string,
  ) => {
    const existingQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', fromUserId),
    );
    const existing = await getDocs(existingQuery);
    for (const docSnap of existing.docs) {
      const data = docSnap.data();
      if (data.participants.includes(toUserId)) {
        return docSnap.id;
      }
    }

    const convoRef = await addDoc(collection(db, 'conversations'), {
      participants: [fromUserId, toUserId],
      participantNames: {
        [fromUserId]: fromUserName,
        [toUserId]: toUserName,
      },
      participantPhotos: {
        [fromUserId]: fromUserPhoto || '',
        [toUserId]: toUserPhoto || '',
      },
      participantAvatarIds: {
        [fromUserId]: fromUserAvatarId || '',
        [toUserId]: toUserAvatarId || '',
      },
      lastMessage: 'Hi!',
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: fromUserId,
      unreadCount: {
        [fromUserId]: 0,
        [toUserId]: 1,
      },
      status: 'pending',
      requestedBy: fromUserId,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'conversations', convoRef.id, 'messages'), {
      text: 'Hi!',
      senderId: fromUserId,
      senderName: fromUserName,
      createdAt: serverTimestamp(),
      read: false,
    });

    return convoRef.id;
  }, []);

  const acceptRequest = useCallback(async (conversationId: string) => {
    await updateDoc(doc(db, 'conversations', conversationId), {
      status: 'accepted',
    });
  }, []);

  const declineRequest = useCallback(async (conversationId: string) => {
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages')
    );
    const messagesSnap = await getDocs(messagesQuery);
    const batch = writeBatch(db);
    messagesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    batch.delete(doc(db, 'conversations', conversationId));
    await batch.commit();
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages')
    );
    const messagesSnap = await getDocs(messagesQuery);
    const batch = writeBatch(db);
    messagesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    batch.delete(doc(db, 'conversations', conversationId));
    await batch.commit();
  }, []);

  const markAsRead = useCallback(async (conversationId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        [`unreadCount.${userId}`]: 0,
      });
    } catch {}
  }, []);

  const editMessage = useCallback(async (
    conversationId: string,
    messageId: string,
    newText: string,
  ) => {
    await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
      text: newText,
      edited: true,
    });
    const latestQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(1),
    );
    const latestSnap = await getDocs(latestQuery);
    if (!latestSnap.empty && latestSnap.docs[0].id === messageId) {
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: newText,
      });
    }
  }, []);

  const deleteMessage = useCallback(async (
    conversationId: string,
    messageId: string,
  ) => {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const batch = writeBatch(db);
    batch.delete(msgRef);

    const latestQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(2),
    );
    const latestSnap = await getDocs(latestQuery);
    const remainingDocs = latestSnap.docs.filter((d) => d.id !== messageId);

    if (remainingDocs.length > 0) {
      const newest = remainingDocs[0].data();
      batch.update(doc(db, 'conversations', conversationId), {
        lastMessage: newest.text || '',
        lastMessageTime: newest.createdAt,
        lastMessageSenderId: newest.senderId || '',
      });
    } else {
      batch.update(doc(db, 'conversations', conversationId), {
        lastMessage: '',
        lastMessageTime: null,
        lastMessageSenderId: '',
      });
    }

    await batch.commit();
  }, []);

  return {
    sendMessage,
    sendChatRequest,
    acceptRequest,
    declineRequest,
    deleteConversation,
    markAsRead,
    editMessage,
    deleteMessage,
  };
}
