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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // ... inside AuthProvider ...

  const signup = async (email: string, password: string, role: 'customer' | 'barber', fullName: string) => {
    try {
      // We only need to call this. The Database Trigger handles Profiles and Shops!
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

      // Note: By default, Supabase requires email verification. 
      // If you haven't disabled it, the user can't login until they click the email link.
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