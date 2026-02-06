import { supabase } from '@/lib/supabase';
import * as entities from './entities';

// Auth helper methods that mimic the base44.auth API
const auth = {
  // Get current user
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Not authenticated');

    // Also fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's ok for new users
      console.warn('Could not fetch user profile:', profileError);
    }

    return {
      id: user.id,
      email: user.email,
      ...profile,
    };
  },

  // Sign out
  async logout(redirectUrl = null) {
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  // Redirect to login page
  redirectToLogin(returnUrl = null) {
    const loginUrl = '/login';
    if (returnUrl) {
      window.location.href = `${loginUrl}?returnUrl=${encodeURIComponent(returnUrl)}`;
    } else {
      window.location.href = loginUrl;
    }
  },

  // Update user profile
  async updateMe(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Convert camelCase to snake_case for database
    const snakeCaseUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      snakeCaseUpdates[snakeKey] = value;
    }

    const { data, error } = await supabase
      .from('users')
      .update(snakeCaseUpdates)
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Sign in with email/password
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Sign up with email/password
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },
};

// Integrations placeholder - implement server-side functions via Supabase Edge Functions
const integrations = {
  Core: {
    async SendEmail(params) {
      // This should be implemented as a Supabase Edge Function
      // For now, log a warning
      console.warn('SendEmail integration needs to be implemented as a Supabase Edge Function');
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
  },
};

// Export a client object that mimics the base44 client structure
export const client = {
  auth,
  entities,
  integrations,
};

// For backward compatibility, also export as default
export default client;
