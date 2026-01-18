import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';

type AuthContextType = {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isBarber: boolean;
  signOut: () => Promise<void>;
  signup: (email: string, password: string, role: 'customer' | 'barber', fullName: string) => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Listen for auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        // Ensure profile is cleared when session is null
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      setUserProfile(data as UserProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- THE FIX IS HERE ---
  const signOut = async () => {
    try {
      // 1. Force the App to "Logout" visually INSTANTLY
      setSession(null);
      setUserProfile(null);
      
      // 2. Then tell Supabase to clean up in the background
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const signup = async (email: string, password: string, role: 'customer' | 'barber', fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("Signup error:", err);
      return { success: false, error: err.message };
    }
  };

  const isBarber = userProfile?.role === 'barber';
  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, isBarber, isAdmin, signOut, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);