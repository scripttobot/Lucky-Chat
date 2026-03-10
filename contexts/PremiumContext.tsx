import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const FREE_DAILY_MATCH_LIMIT = 10;
const REWARD_AD_MATCH_BONUS = 5;

interface PremiumContextType {
  isPremium: boolean;
  dailyMatchesUsed: number;
  dailyMatchLimit: number;
  matchesRemaining: number;
  canMatch: boolean;
  useMatch: () => Promise<boolean>;
  addBonusMatches: (count: number) => void;
  boostProfile: (durationMinutes: number) => Promise<void>;
  isBoosted: boolean;
  boostEndTime: Date | null;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const [dailyMatchesUsed, setDailyMatchesUsed] = useState(0);
  const [bonusMatches, setBonusMatches] = useState(0);
  const [lastResetDate, setLastResetDate] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [boostEndTime, setBoostEndTime] = useState<Date | null>(null);

  const isPremium = !!(userProfile as any)?.isPremium;

  useEffect(() => {
    if (!user?.uid) return;
    const loadMatchData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const today = new Date().toISOString().split('T')[0];
          if (data.lastMatchReset === today) {
            setDailyMatchesUsed(data.dailyMatchCount || 0);
          } else {
            setDailyMatchesUsed(0);
            await updateDoc(doc(db, 'users', user.uid), {
              dailyMatchCount: 0,
              lastMatchReset: today,
            });
          }
          setLastResetDate(data.lastMatchReset || today);
          setBonusMatches(data.bonusMatches || 0);
          if (data.boostedUntil) {
            const boostEnd = data.boostedUntil.toDate ? data.boostedUntil.toDate() : new Date(data.boostedUntil);
            if (boostEnd > new Date()) {
              setBoostEndTime(boostEnd);
            }
          }
        }
      } catch {}
      setInitialized(true);
    };
    loadMatchData();
  }, [user?.uid]);

  useEffect(() => {
    if (!boostEndTime) return;
    const remaining = boostEndTime.getTime() - Date.now();
    if (remaining <= 0) {
      setBoostEndTime(null);
      return;
    }
    const timer = setTimeout(() => setBoostEndTime(null), remaining);
    return () => clearTimeout(timer);
  }, [boostEndTime]);

  const dailyMatchLimit = isPremium ? 9999 : FREE_DAILY_MATCH_LIMIT;
  const matchesRemaining = Math.max(0, dailyMatchLimit - dailyMatchesUsed + bonusMatches);
  const canMatch = isPremium || matchesRemaining > 0;
  const isBoosted = isPremium || (boostEndTime !== null && boostEndTime > new Date());

  const useMatchCredit = useCallback(async (): Promise<boolean> => {
    if (isPremium) return true;
    if (matchesRemaining <= 0) return false;

    const newCount = dailyMatchesUsed + 1;
    setDailyMatchesUsed(newCount);

    if (bonusMatches > 0 && newCount > FREE_DAILY_MATCH_LIMIT) {
      setBonusMatches((prev) => {
        const newVal = Math.max(0, prev - 1);
        if (user?.uid) {
          updateDoc(doc(db, 'users', user.uid), { bonusMatches: newVal }).catch(() => {});
        }
        return newVal;
      });
    }

    if (user?.uid) {
      try {
        const today = new Date().toISOString().split('T')[0];
        await updateDoc(doc(db, 'users', user.uid), {
          dailyMatchCount: newCount,
          lastMatchReset: today,
        });
      } catch {}
    }
    return true;
  }, [isPremium, matchesRemaining, dailyMatchesUsed, bonusMatches, user?.uid]);

  const addBonusMatches = useCallback((count: number) => {
    setBonusMatches((prev) => {
      const newVal = prev + count;
      if (user?.uid) {
        updateDoc(doc(db, 'users', user.uid), { bonusMatches: newVal }).catch(() => {});
      }
      return newVal;
    });
  }, [user?.uid]);

  const boostProfile = useCallback(async (durationMinutes: number) => {
    if (!user?.uid) return;
    const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);
    setBoostEndTime(endTime);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        boostedUntil: endTime,
      });
    } catch {}
  }, [user?.uid]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        dailyMatchesUsed,
        dailyMatchLimit,
        matchesRemaining,
        canMatch,
        useMatch: useMatchCredit,
        addBonusMatches,
        boostProfile,
        isBoosted,
        boostEndTime,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}

export { FREE_DAILY_MATCH_LIMIT, REWARD_AD_MATCH_BONUS };
