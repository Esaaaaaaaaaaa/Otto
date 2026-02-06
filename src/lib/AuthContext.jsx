import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/api/entities';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check initial auth state
    checkAuthState();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await fetchUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth session error:', error);
        setAuthError({
          type: 'auth_error',
          message: error.message
        });
        setIsLoadingAuth(false);
        return;
      }

      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const fetchUserProfile = async (authUser) => {
    try {
      // Get user profile from users table
      const users = await User.filter({ auth_id: authUser.id });
      const userProfile = users[0];

      const fullUser = {
        id: authUser.id,
        email: authUser.email,
        ...userProfile,
      };

      setUser(fullUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Still set as authenticated even if profile fetch fails
      setUser({
        id: authUser.id,
        email: authUser.email,
      });
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    await supabase.auth.signOut();

    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = (returnUrl = null) => {
    const loginUrl = '/login';
    if (returnUrl) {
      window.location.href = `${loginUrl}?returnUrl=${encodeURIComponent(returnUrl)}`;
    } else {
      window.location.href = loginUrl;
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
      signIn,
      signUp,
      checkAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
