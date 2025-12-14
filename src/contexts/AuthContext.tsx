import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserStatus } from '@/types/user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role?: string, hotelName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const createBasicProfile = (user: User): Profile => {
    return {
      id: user.id,
      user_id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      role: (user.user_metadata?.role || 'user') as 'admin' | 'user',
      hotel_name: user.user_metadata?.hotel_name,
      status: 'active' as UserStatus
    };
  };

  const fetchOrCreateProfile = async (user: User): Promise<Profile> => {
    try {
      console.log('Fetching profile for user:', user.id);

      // 1. Try to get from localStorage first (fastest & works offline)
      const cachedProfileStr = localStorage.getItem(`profile_${user.id}`);
      let cachedProfile: Profile | null = null;

      if (cachedProfileStr) {
        try {
          cachedProfile = JSON.parse(cachedProfileStr);
          // If we have a cached profile, we can return it immediately if we're offline
          // or we can use it as a fallback if the network request fails
          if (!navigator.onLine && cachedProfile) {
            console.log('Using cached profile (offline):', cachedProfile);
            return cachedProfile;
          }
        } catch (e) {
          console.error('Error parsing cached profile:', e);
        }
      }

      // 2. Try to fetch existing profile from Supabase with a timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      let existingProfile = null;
      let fetchError = null;

      try {
        const result: any = await Promise.race([
          profilePromise,
          timeoutPromise
        ]);
        existingProfile = result.data;
        fetchError = result.error;
      } catch (e) {
        console.warn('Network request failed or timed out:', e);
        // If network fails and we have cache, RETURN CACHE
        if (cachedProfile) {
          console.log('Network failed, using cached profile:', cachedProfile);
          return cachedProfile;
        }
      }

      if (!fetchError && existingProfile) {
        console.log('Found existing profile:', existingProfile);
        const profile: Profile = {
          id: existingProfile.id,
          user_id: existingProfile.user_id,
          name: existingProfile.name || 'User',
          role: existingProfile.role as 'admin' | 'user',
          hotel_name: existingProfile.hotel_name || undefined,
          status: existingProfile.status as UserStatus
        };
        // Update cache
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(profile));
        return profile;
      }

      // 3. If no profile exists in DB, try to create one
      // (Only if we are online/connected, otherwise we might just return basic profile)
      console.log('No profile found, attempting to create...');
      try {
        const profileData = {
          user_id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: (user.user_metadata?.role || 'user') as 'admin' | 'user',
          hotel_name: user.user_metadata?.hotel_name || null,
          status: 'active' as UserStatus
        };

        const createPromise = supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();

        const createTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile creation timeout')), 3000)
        );

        const { data, error } = await Promise.race([
          createPromise,
          createTimeoutPromise
        ]) as any;

        if (!error && data) {
          console.log('Profile created successfully:', data);
          const newProfile: Profile = {
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            role: data.role as 'admin' | 'user',
            hotel_name: data.hotel_name,
            status: data.status as UserStatus
          };
          localStorage.setItem(`profile_${user.id}`, JSON.stringify(newProfile));
          return newProfile;
        }
      } catch (createError) {
        console.log('Profile creation failed, using basic profile:', createError);
      }

      // 4. Fallback: If everything failed (no cache, no DB, no creation), use basic metadata
      console.log('Returning basic profile from metadata');
      const basicProfile = createBasicProfile(user);
      // Even cache this basic profile so next time we load faster
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(basicProfile));
      return basicProfile;

    } catch (error) {
      console.error('Error in fetchOrCreateProfile:', error);
      // Last resort
      return createBasicProfile(user);
    }
  };

  useEffect(() => {
    console.log('AuthProvider initializing...');

    let mounted = true;


    // Ensure loading never gets stuck for more than 10 seconds
    const failsafeTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Failsafe timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000);

    const handleAuthStateChange = async (event: string, newSession: Session | null) => {
      console.log('Auth state changed:', event, !!newSession?.user);

      if (!mounted) return;

      try {
        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          console.log('User found, fetching/creating profile...');

          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            if (!mounted) return;

            try {
              const userProfile = await fetchOrCreateProfile(newSession.user);

              if (mounted) {
                setProfile(userProfile);
                console.log('Profile set:', userProfile?.status);
              }
            } catch (profileError) {
              console.error('Profile handling error:', profileError);
              if (mounted) {
                // Set a basic profile if all else fails
                setProfile(createBasicProfile(newSession.user));
              }
            } finally {
              if (mounted) {
                setLoading(false);
                clearTimeout(failsafeTimeout);
              }
            }
          }, 100);
        } else {
          if (mounted) {
            setProfile(null);
            setLoading(false);
            clearTimeout(failsafeTimeout);
          }
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        if (mounted) {
          setProfile(null);
          setLoading(false);
          clearTimeout(failsafeTimeout);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initialize auth state with timeout
    const initAuth = async () => {
      try {
        console.log('Getting initial session...');

        // Add timeout to getSession call
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );

        const { data: { session: initialSession } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        console.log('Initial session:', !!initialSession?.user);

        if (mounted) {
          await handleAuthStateChange('INITIAL', initialSession);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          clearTimeout(failsafeTimeout);
        }
      }
    };

    // Add timeout for initialization
    const initializationTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Initialization timeout, proceeding without session');
        setLoading(false);
        clearTimeout(failsafeTimeout);
      }
    }, 8000);

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(initializationTimeout);
      clearTimeout(failsafeTimeout);
    };
  }, []);

  const signUp = async (email: string, password: string, name: string, role: string = 'user', hotelName?: string) => {
    console.log('Sign up attempt for:', email, 'with role:', role);

    const userData: any = { name, role };
    if (hotelName && role === 'admin') userData.hotel_name = hotelName;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: userData
      }
    });

    // If signup was successful and we have a user, create the profile immediately
    // This ensures the user appears in the Users list right away
    if (!error && data?.user) {
      console.log('Auth user created, now creating profile record...');
      try {
        const profileData = {
          user_id: data.user.id,
          name: name,
          role: role as 'admin' | 'user',
          hotel_name: role === 'admin' ? hotelName : null,
          status: 'active' as UserStatus
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (profileError) {
          // If profile already exists (unique constraint), that's okay
          if (!profileError.message?.includes('duplicate') && !profileError.message?.includes('unique')) {
            console.error('Failed to create profile:', profileError);
          } else {
            console.log('Profile already exists for this user');
          }
        } else {
          console.log('Profile created successfully for new user');
        }
      } catch (profileCreateError) {
        console.error('Error creating profile:', profileCreateError);
        // Don't fail the signup because of profile creation failure
      }
    }

    console.log('Sign up result:', error ? 'Error' : 'Success');
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('Sign in attempt for:', email);

    // Clear any cached permissions before login to ensure fresh permissions
    // This helps when admin has changed permissions for this user
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('hotel_pos_permissions_')) {
        localStorage.removeItem(key);
      }
    });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    console.log('Sign in result:', error ? 'Error' : 'Success');
    return { error };
  };

  const signOut = async () => {
    console.log('Signing out...');

    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const contextValue = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  console.log('AuthProvider render - loading:', loading, 'user:', !!user, 'profile:', !!profile, 'profile status:', profile?.status);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
