import React, { createContext, useState, useEffect, useContext } from 'react';
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
  signOut: () => Promise<void>;
  signup: (email: string, password: string, role: 'customer' | 'barber', fullName: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<void>; 
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 1. CONFIGURE GOOGLE (FIXED) ---
  useEffect(() => {
    GoogleSignin.configure({
      // We only need basic profile info for login. 
      // Removing 'drive.readonly' prevents the "No ID token" error.
      scopes: ['profile', 'email'], 
      
      // This MUST match the "client_id" with "client_type": 3 in your google-services.json
      webClientId: '523685498732-ekm07ptsdm6hug1h9p34lupl2sosekp4.apps.googleusercontent.com',
      
      // These flags ensure we get the ID token back reliably
      offlineAccess: true, 
      forceCodeForRefreshToken: true,
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchProfile(session.user.id);
          updatePushToken(session.user.id);
      } else {
          setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        updatePushToken(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. GOOGLE SIGN IN LOGIC ---
  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Debugging logs to help us if it fails again
      console.log("UserInfo from Google:", userInfo);

      // Check both idToken (iOS) and idToken (Android sometimes puts it here)
      const token = userInfo.idToken || userInfo.data?.idToken;

      if (token) {
        console.log("Got ID Token, sending to Supabase...");
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: token,
        });
        
        if (error) {
            console.error("Supabase Auth Error:", error);
            throw error;
        }
      } else {
        throw new Error('No ID token present in response!');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled login flow");
      } else {
        console.error("Google Signin Error details:", error);
      }
    }
  };

  const signOut = async () => {
    try {
      setSession(null);
      setUserProfile(null);
      await GoogleSignin.signOut(); 
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const signup = async (email: string, password: string, role: 'customer' | 'barber', fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
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
    <AuthContext.Provider value={{ session, userProfile, loading, isBarber, isAdmin, signOut, signup, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);