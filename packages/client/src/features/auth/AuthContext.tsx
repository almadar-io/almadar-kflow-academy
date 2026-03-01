import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useAppDispatch } from '../../app/hooks';
import { auth } from '../../config/firebase';
import { authService } from './authService';
import { setUser, setLoading, setError, signOut as signOutAction, clearError } from './authSlice';
import { loadConceptGraphs } from '../concepts';
import { AuthContextType } from './types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoadingState] = useState(true);
  const [onAuthSuccess, setOnAuthSuccess] = useState<(() => void) | undefined>(undefined);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserState(user);
      setLoadingState(false);
      dispatch(setUser(user));
      dispatch(loadConceptGraphs());
      
      // Call the auth success callback if it exists
      if (user && onAuthSuccess) {
        onAuthSuccess();
      }
    });

    return () => unsubscribe();
  }, [dispatch, onAuthSuccess]);

  const signInWithGoogle = async () => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await authService.signInWithGoogle();
    } catch (error: any) {
      // Reset loading state when user cancels or error occurs
      dispatch(setLoading(false));
      // Only show error if it's not a user cancellation
      const isUserCancellation = error.code === 'auth/popup-closed-by-user' || 
                                  error.code === 'auth/cancelled-popup-request' ||
                                  error.code === 'auth/popup-blocked';
      if (!isUserCancellation) {
        dispatch(setError(error.message));
      } else {
        // Clear any previous errors when user cancels
        dispatch(clearError());
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await authService.signInWithEmail(email, password);
    } catch (error: any) {
      dispatch(setError(error.message));
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await authService.signUpWithEmail(email, password, displayName);
    } catch (error: any) {
      dispatch(setError(error.message));
    }
  };

  const sendSignInLinkToEmail = async (email: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      // Configure action code settings - the link will open in the same window
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      };
      await authService.sendSignInLinkToEmail(email, actionCodeSettings);
    } catch (error: any) {
      dispatch(setError(error.message));
    }
  };

  const signInWithEmailLink = async (email: string, emailLink: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await authService.signInWithEmailLink(email, emailLink);
    } catch (error: any) {
      dispatch(setError(error.message));
    }
  };

  const isSignInWithEmailLink = (emailLink: string): boolean => {
    return authService.isSignInWithEmailLink(emailLink);
  };

  const signOut = async () => {
    try {
      dispatch(setLoading(true));
      await authService.signOut();
      dispatch(signOutAction());
    } catch (error: any) {
      dispatch(setError(error.message));
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    signInWithEmail,
    signUpWithEmail,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    isSignInWithEmailLink,
    onAuthSuccess,
    setOnAuthSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
