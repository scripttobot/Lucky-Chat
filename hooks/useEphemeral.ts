import { useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  orderBy,
  limit,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useMessageCleanup(userId: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupOldMessages = useCallback(async () => {
    if (!userId) return;

    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
      );

      const snapshot = await getDocs(q);
      const cutoff = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

      for (const convoDoc of snapshot.docs) {
        try {
          const messagesQuery = query(
            collection(db, 'conversations', convoDoc.id, 'messages'),
            where('createdAt', '<', cutoff)
          );
          const oldMessages = await getDocs(messagesQuery);
          if (oldMessages.empty) continue;

          const docs = oldMessages.docs;
          for (let i = 0; i < docs.length; i += 400) {
            const chunk = docs.slice(i, i + 400);
            const batch = writeBatch(db);
            chunk.forEach((msgDoc) => {
              batch.delete(msgDoc.ref);
            });
            await batch.commit();
          }

          const latestQuery = query(
            collection(db, 'conversations', convoDoc.id, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const latestSnap = await getDocs(latestQuery);
          if (latestSnap.empty) {
            await updateDoc(doc(db, 'conversations', convoDoc.id), {
              lastMessage: '',
              lastMessageTime: null,
              lastMessageSenderId: '',
            });
          } else {
            const latestMsg = latestSnap.docs[0].data();
            await updateDoc(doc(db, 'conversations', convoDoc.id), {
              lastMessage: latestMsg.text || '',
              lastMessageTime: latestMsg.createdAt,
              lastMessageSenderId: latestMsg.senderId || '',
            });
          }
        } catch (e) {
          console.warn('Message cleanup error:', e);
        }
      }
    } catch (e) {
      console.warn('Cleanup query error:', e);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const timeout = setTimeout(() => {
      cleanupOldMessages();
    }, 10000);

    intervalRef.current = setInterval(cleanupOldMessages, 5 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, cleanupOldMessages]);

  return { cleanupOldMessages };
}
