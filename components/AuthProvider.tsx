'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, query, where, getDocs, collection, deleteDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  userData: any;
  loading: boolean;
  isSuperAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, data: { phone: string, instruments: string[], vocalRange: string, churchId?: string, roles?: { worship: string[], multimedia: string[], secretariat: string[] } }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const signingUpRef = React.useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const superAdmin = tokenResult.claims.super_admin === true || user.email === 'pedrohenriqueribei@gmail.com';
          setIsSuperAdmin(superAdmin);

          let userDoc;
          let retries = 0;
          const maxRetries = 12; // Wait up to 6 seconds total
          
          while (retries < maxRetries) {
            try {
              userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists() || !signingUpRef.current) {
                break;
              }
            } catch (e) {
              console.error('Auth User Data Error on getDoc retry:', e);
            }
            retries++;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          let currentData = userDoc && userDoc.exists() ? userDoc.data() : null;
          
          if (!currentData) {
            let existingPreCreatedUser = null;
            let existingPreCreatedDocId = null;
            if (user.email) {
              try {
                const q = query(collection(db, 'users'), where('email', '==', user.email));
                const snap = await getDocs(q);
                for (const d of snap.docs) {
                  if (d.id !== user.uid) {
                    existingPreCreatedUser = d.data();
                    existingPreCreatedDocId = d.id;
                    break;
                  }
                }
              } catch (err) {
                console.error('Error searching for pre-created user by email:', err);
              }
            }

            if (existingPreCreatedUser) {
              const mergedUserData = {
                ...existingPreCreatedUser,
                uid: user.uid,
                updatedAt: serverTimestamp()
              };
              try {
                await setDoc(doc(db, 'users', user.uid), mergedUserData);
                await deleteDoc(doc(db, 'users', existingPreCreatedDocId));
                console.log(`Merged and cleaned up pre-created user document ${existingPreCreatedDocId} for auth user ${user.uid}`);
              } catch (e) {
                console.error('Auth User Data Error on merging user profiles:', e);
              }
              currentData = mergedUserData;
              setUserData(currentData);
            } else {
              const newUserData = {
                uid: user.uid,
                name: user.displayName || 'Novo Integrante',
                email: user.email,
                phone: '',
                instruments: [],
                vocalRange: '',
                churchId: '',
                status: 'active',
                roles: user.email === 'pedrohenriqueribei@gmail.com' ? { worship: ['leader'], multimedia: [], secretariat: [] } : { worship: [], multimedia: [], secretariat: [] },
                createdAt: serverTimestamp()
              };
              try {
                await setDoc(doc(db, 'users', user.uid), newUserData);
              } catch (e) {
                console.error('Auth User Data Error on setDoc:', e);
                throw e;
              }
              setUserData({ ...newUserData, createdAt: new Date().toISOString() });
            }
          } else {
            let updates: any = {};
            let needsUpdate = false;

            if (!currentData.uid) {
              updates.uid = user.uid;
              needsUpdate = true;
            }
            if (!currentData.email) {
              updates.email = user.email;
              needsUpdate = true;
            }
            if (!currentData.name) {
              updates.name = user.displayName || 'Novo Integrante';
              needsUpdate = true;
            }
            if (!currentData.status) {
              updates.status = 'active';
              needsUpdate = true;
            }
            if (!currentData.roles) {
              updates.roles = user.email === 'pedrohenriqueribei@gmail.com' ? { worship: ['leader'], multimedia: [], secretariat: [] } : { worship: [], multimedia: [], secretariat: [] };
              needsUpdate = true;
            }

            if (needsUpdate) {
              try {
                await updateDoc(doc(db, 'users', user.uid), updates);
              } catch (e) {
                console.error('Auth User Data Error on updateDoc:', e);
                throw e;
              }
              currentData = { ...currentData, ...updates };
            }
            setUserData(currentData);
          }
        } catch (error) {
          console.error('Auth User Data Error (general):', error);
          setUserData(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setIsSuperAdmin(false);
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

  const signUpWithEmail = async (email: string, pass: string, name: string, data: { phone: string, instruments: string[], vocalRange: string, churchId?: string, roles?: { worship: string[], multimedia: string[], secretariat: string[] } }) => {
    signingUpRef.current = true;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      const isAdminEmail = email === 'pedrohenriqueribei@gmail.com';
      const defaultRoles = isAdminEmail ? { worship: ['leader'], multimedia: [], secretariat: [] } : { worship: [], multimedia: [], secretariat: [] };
      const newUserData = {
        uid: user.uid,
        name: name,
        email: email,
        phone: data.phone,
        instruments: data.instruments,
        vocalRange: data.vocalRange,
        churchId: data.churchId || '',
        roles: data.roles || defaultRoles,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid
      };
      await setDoc(doc(db, 'users', user.uid), newUserData);

      // Save user to the respective church department subcollections if churchId is supplied
      if (data.churchId && data.roles) {
        const depts = ['worship', 'multimedia', 'secretariat'] as const;
        for (const dept of depts) {
          const deptRoles = data.roles[dept] || [];
          if (deptRoles.length > 0) {
            const memberRef = doc(db, 'churches', data.churchId, 'departments', dept, 'members', user.uid);
            await setDoc(memberRef, {
              userId: user.uid,
              roles: deptRoles,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
              joinedAt: serverTimestamp()
            });
          }
        }
      }
    } finally {
      signingUpRef.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, isSuperAdmin, signInWithGoogle, signInWithEmail, signUpWithEmail }}>
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
