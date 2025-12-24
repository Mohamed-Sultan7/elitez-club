
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { ensureMyProfileExists, getMyProfile, upsertMyProfile } from '@/db/profiles';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { logActivity } from '@/db/activity';

interface User {
  email: string;
  name: string;
  bio: string;
  profilePic: string;
  membershipType: 'TOP G' | 'Free Trial' | 'TOP G - Monthly' | 'TOP G - Annually' | 'WAR ROOM' | 'THE REAL WORLD';
  uid: string;
  disabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isMembershipExpired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Omit<User, 'uid' | 'email'> & { renewIntervalDays: number, subscriptionDate: string, bio: string, profilePic: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (email: string, password: string, userData: Omit<User, 'uid' | 'email'> & { renewIntervalDays: number, subscriptionDate: string, bio: string, profilePic: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMembershipExpired, setIsMembershipExpired] = useState(false);
  const { toast } = useToast();

  // Listen for auth state changes
  useEffect(() => {
    let mounted = true;

    const processSession = async (currentSession: Session | null) => {
      try {
        console.log('[Auth] Processing session:', currentSession?.user?.id);
        if (mounted) setSession(currentSession);
        
        const currentUser = currentSession?.user || null;
        
        if (currentUser) {
          try {
            console.log('[Auth] Fetching profile for:', currentUser.id);
            // Ensure profile exists first
            await ensureMyProfileExists();
            
            // Then fetch it
            const profile = await getMyProfile();
            console.log('[Auth] Profile loaded:', profile ? 'success' : 'null');
            
            if (profile?.disabled) {
              console.warn('[Auth] Account disabled');
              if (mounted) {
                await supabase.auth.signOut();
                setUser(null);
                toast({
                  title: "Account Disabled",
                  description: "Your account has been disabled. Please contact administration.",
                  variant: "destructive",
                });
              }
            } else {
              if (mounted) {
                let isExpired = false;
                if (profile?.subscriptionDate && profile?.renewIntervalDays) {
                  const startDate = new Date(profile.subscriptionDate);
                  const endDate = new Date(startDate);
                  endDate.setDate(startDate.getDate() + (profile.renewIntervalDays || 0));
                  const today = new Date();
                  isExpired = today > endDate;
                }
                setIsMembershipExpired(isExpired);
                
                setUser({
                  email: currentUser.email || '',
                  name: profile?.name || 'Elitez Club User',
                  bio: profile?.bio || '',
                  profilePic: profile?.avatarUrl || '',
                  membershipType: (profile?.membershipType as User['membershipType']) || 'TOP G',
                  uid: currentUser.id,
                  disabled: !!profile?.disabled
                });
              }
            }
          } catch (err) {
            console.error("[Auth] Error fetching user data:", err);
            // Fallback user if profile fetch fails but auth is valid
            if (mounted) {
              setUser({
                email: currentUser.email || '',
                name: '',
                bio: '',
                profilePic: '',
                membershipType: 'TOP G',
                uid: currentUser.id,
                disabled: false
              });
            }
          }
        } else {
          console.log('[Auth] No user in session');
          if (mounted) setUser(null);
        }
      } catch (err) {
        console.error('[Auth] Process session error:', err);
      } finally {
        if (mounted) {
          console.log('[Auth] Setting loading to false');
          setLoading(false);
        }
      }
    };

    // 1. Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial getSession result:', session?.user?.id);
      processSession(session);
    }).catch(err => {
      console.error('[Auth] Initial getSession error:', err);
      if (mounted) setLoading(false);
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange:', event, session?.user?.id);
      processSession(session);
    });

    // 3. Safety timeout to ensure app doesn't stick on loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Safety timeout reached - forcing loading=false');
        setLoading((prev) => {
          if (prev) return false;
          return prev;
        });
      }
    }, 6000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [toast]);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        throw new Error(authError.message || 'Invalid login credentials');
      }

      const uid = data.session?.user?.id;
      if (uid) {
        const profile = await getMyProfile();
        if (profile?.disabled === true) {
          await supabase.auth.signOut();
          throw new Error('Your account has been disabled. Please contact administration.');
        }
      }
      
      if (uid) {
        logActivity('LOGIN');
      }
      
      toast({
        title: "Welcome Back",
        description: "Logged in successfully",
        variant: "default",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login Failed');
      toast({
        title: "Login Failed",
        description: "Invalid login credentials",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Log logout activity before signing out
      if (user) {
        logActivity('LOGOUT');
      }

      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('topGUser');
      toast({
        title: "Logged Out",
        description: "Logged out successfully",
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        title: "Error",
        description: "An error occurred while logging out",
        variant: "destructive",
      });
    }
  };

  const signUp = async (email: string, password: string, userData: Omit<User, 'uid' | 'email'> & { renewIntervalDays: number, subscriptionDate: string, bio: string, profilePic: string }): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data: currentSessionData } = await supabase.auth.getSession();
      const oldAccessToken = currentSessionData?.session?.access_token;
      const oldRefreshToken = currentSessionData?.session?.refresh_token;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name: userData.name,
            bio: userData.bio,
            avatar_url: userData.profilePic,
            membership_type: userData.membershipType,
            subscription_date: userData.subscriptionDate,
            renew_interval_days: userData.renewIntervalDays
          }
        }
      });
      if (signUpError) {
        throw new Error(signUpError.message || 'Failed to create user');
      }

      const uid = signUpData.user?.id;
      if (!uid) {
        throw new Error('User ID not available after sign up');
      }

      // If email confirmation is required, Supabase will not return a session.
      // In that case, we can't write to the profiles table yet (RLS).
      // We rely on user_metadata to restore profile info later.
      if (!signUpData.session) {
        // Just return success, page will redirect to check-email
        return;
      }

      try {
        await ensureMyProfileExists();
        await upsertMyProfile({
          name: userData.name,
          email: email,
          bio: userData.bio,
          avatarUrl: userData.profilePic || '',
          membershipType: userData.membershipType,
          subscriptionDate: userData.subscriptionDate,
          renewIntervalDays: userData.renewIntervalDays,
          disabled: false,
        });
      } catch (profileError) {
        // If profile creation fails (e.g. RLS issue or "Not authenticated"), 
        // we still consider signup successful because the user was created.
        console.warn('Profile creation failed during signup (non-fatal):', profileError);
      }

      if (oldAccessToken && oldRefreshToken) {
        try {
          await supabase.auth.setSession({ access_token: oldAccessToken, refresh_token: oldRefreshToken });
        } catch (e) {
          console.warn('Could not restore previous session after sign up:', e);
        }
      }

      toast({
        title: "User Created",
        description: "User created successfully",
        variant: "default",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      toast({
        title: "Failed to create user",
        description: err instanceof Error ? err.message : "An error occurred while creating the user",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) {
        throw new Error(resetError.message || 'Failed to send password reset email');
      }
      toast({
        title: "Password Reset",
        description: "If the email exists, a reset link was sent.",
        variant: "default",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      toast({
        title: "Reset Failed",
        description: err instanceof Error ? err.message : "An error occurred while sending the reset email",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = (email: string, password: string) => signIn(email, password);
  const logout = () => signOut();
  const createUser = (email: string, password: string, userData: Omit<User, 'uid' | 'email'> & { renewIntervalDays: number, subscriptionDate: string, bio: string, profilePic: string }) =>
    signUp(email, password, userData);

  return (
    <AuthContext.Provider value={{ user, session, loading, error, isMembershipExpired, signIn, signUp, signOut, resetPassword, login, logout, createUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
