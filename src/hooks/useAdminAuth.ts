'use client';

import { useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    browserLocalPersistence,
    setPersistence,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AdminAuthState {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
    error: string | null;
}

export function useAdminAuth() {
    const [state, setState] = useState<AdminAuthState>({
        user: null,
        isAdmin: false,
        loading: true,
        error: null,
    });

    // Set persistence to LOCAL (survives browser restarts) on mount
    useEffect(() => {
        setPersistence(auth, browserLocalPersistence).catch(() => {});
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setState({ user: null, isAdmin: false, loading: false, error: null });
                return;
            }

            try {
                // Check if the user has an admin doc
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                const isAdmin = adminDoc.exists();

                setState({
                    user,
                    isAdmin,
                    loading: false,
                    error: isAdmin ? null : 'You do not have admin access.',
                });
            } catch (err: any) {
                setState({
                    user,
                    isAdmin: false,
                    loading: false,
                    error: 'Failed to verify admin status.',
                });
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: err.code === 'auth/invalid-credential'
                    ? 'Invalid email or password.'
                    : err.message,
            }));
        }
    };

    const register = async (email: string, password: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle the rest (admin check, etc.)
        } catch (err: any) {
            let message = err.message;
            if (err.code === 'auth/email-already-in-use') message = 'This email is already registered.';
            else if (err.code === 'auth/weak-password') message = 'Password must be at least 6 characters.';
            else if (err.code === 'auth/invalid-email') message = 'Invalid email address.';

            setState(prev => ({
                ...prev,
                loading: false,
                error: message,
            }));
        }
    };

    const logout = async () => {
        await signOut(auth);
        setState({ user: null, isAdmin: false, loading: false, error: null });
    };

    return { ...state, login, register, logout };
}
