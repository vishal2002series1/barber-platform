import React, { createContext, useState, useEffect, useContext } from 'react';
import { Linking, Alert } from 'react-native'; 
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'; 

type AuthContextType = {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isBarber: boolean;
  resetPasswordMode: boolean;
  setResetPasswordMode: (val: boolean) => void;
  signOut: () => Promise<void>;
  signup: (email: string, password: string, role: 'customer' | 'barber', fullName: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<void>; 
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      scopes: ['profile', 'email'], 
      webClientId: '523685498732-ekm07ptsdm6hug1h9p34lupl2sosekp4.apps.googleusercontent.com',
      offlineAccess: true, 
      forceCodeForRefreshToken: true,
    });
  }, []);

  useEffect(() => {
    // A. Supabase Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetPasswordMode(true);
      }
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        updatePushToken(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    // B. Handle Deep Links (Bulletproof & Error-Aware)
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        
        // 1. CHECK FOR EXPIRY/ERRORS FIRST
        const errorMatch = url.match(/[?&#]error_description=([^&]+)/);
        if (errorMatch) {
            // Convert "Email+link+is+invalid" to normal text
            const decodedError = decodeURIComponent(errorMatch[1].replace(/\+/g, ' '));
            Alert.alert("Link Expired", `${decodedError}.\n\nPlease request a new link.`);
            return; // Stop here, don't try to log in
        }

        // 2. PKCE Flow (Strict regex: must be exactly ?code= or &code=)
        const codeMatch = url.match(/[?&]code=([^&]+)/);
        if (codeMatch) {
            setResetPasswordMode(true);
            const { error } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
            if (error) Alert.alert("Link Error", error.message);
            return;
        }

        // 3. Implicit Flow (Older - uses #access_token=...)
        const accessMatch = url.match(/[?&#]access_token=([^&]+)/);
        const refreshMatch = url.match(/[?&#]refresh_token=([^&]+)/);

        if (accessMatch && refreshMatch) {
            setResetPasswordMode(true); 
            const { error } = await supabase.auth.setSession({
                access_token: accessMatch[1],
                refresh_token: refreshMatch[1],
            });
            if (error) Alert.alert("Link Error", error.message);
        } 
      }
    };

    

    // Listeners
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });

    return () => {
        subscription.unsubscribe();
        sub.remove();
    };
  }, []);

  const updatePushToken = async (userId: string) => {
    try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
            await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
        }
    } catch (error) {
        console.log("Error updating push token:", error);
    }
  };

  const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) throw error;
        setUserProfile(data as UserProfile);
      } catch (error) {
        // Silent fail for reset password flow
      } finally {
        setLoading(false);
      }
  };

  const signInWithGoogle = async () => {
      try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const token = userInfo.idToken || userInfo.data?.idToken;
        if (token) await supabase.auth.signInWithIdToken({ provider: 'google', token });
      } catch (error) { console.log(error); }
  };

  const signOut = async () => {
    try {
      setSession(null);
      setUserProfile(null);
      setResetPasswordMode(false);
      await GoogleSignin.signOut(); 
      await supabase.auth.signOut();
    } catch (error) { console.error(error); }
  };

  const signup = async (email: string, password: string, role: 'customer' | 'barber', fullName: string) => {
      try {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { role: role, full_name: fullName } }
        });
        if (error) throw error;
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
  };

  const isBarber = userProfile?.role === 'barber';
  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, isBarber, isAdmin, resetPasswordMode, setResetPasswordMode, signOut, signup, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);