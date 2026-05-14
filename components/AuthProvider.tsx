'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  userData: any;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, data: { phone: string, instruments: string[], vocalRange: string, churchId?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          let currentData = userDoc.exists() ? userDoc.data() : null;
          
          const isAdminEmail = user.email === 'pedrohenriqueribei@gmail.com';
          
          if (!currentData) {
            const newUserData = {
              uid: user.uid,
              name: user.displayName || 'Novo Integrante',
              email: user.email,
              phone: '',
              instruments: [],
              vocalRange: '',
              churchId: '',
              role: isAdminEmail ? 'líder' : 'instrumentista',
              status: 'active',
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', user.uid), newUserData);
            setUserData({ ...newUserData, createdAt: new Date().toISOString() });
          } else {
            // Force role migration if using old or unknown role names
            let updated = false;
            if (isAdminEmail && currentData.role !== 'líder') {
              currentData.role = 'líder';
              updated = true;
            } else if (!isAdminEmail && !['líder', 'instrumentista'].includes(currentData.role)) {
              currentData.role = 'instrumentista';
              updated = true;
            }
            
            if (updated) {
              await updateDoc(doc(db, 'users', user.uid), { role: currentData.role });
            }
            setUserData(currentData);
          }
        } catch (error) {
          console.error('Auth User Data Error:', error);
          // Don't throw here to avoid blocking loading state indefinitely
          // We can still try to set something or leave it as null
          setUserData(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, data: { phone: string, instruments: string[], vocalRange: string, churchId?: string }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    const isAdminEmail = email === 'pedrohenriqueribei@gmail.com';
    const newUserData = {
      uid: user.uid,
      name: name,
      email: email,
      phone: data.phone,
      instruments: data.instruments,
      vocalRange: data.vocalRange,
      churchId: data.churchId || '',
      role: isAdminEmail ? 'líder' : 'instrumentista',
      status: 'active',
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', user.uid), newUserData);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signInWithEmail, signUpWithEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
