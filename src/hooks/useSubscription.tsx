import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  error: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
}

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    loading: true,
    error: null,
    isTrial: false,
    trialEndsAt: null,
  });

  // Prevent UX-breaking full-page loaders on background refresh (e.g. window focus)
  const lastUserIdRef = useRef<string | null>(null);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const currentUserId = sessionData.session?.user?.id ?? null;
      const isNewUserSession = currentUserId !== lastUserIdRef.current;
      lastUserIdRef.current = currentUserId;

      // Only show the global "loading" state on initial load / user switch.
      // On background refresh (interval/focus), keep loading=false so pages don't unmount.
      setStatus((prev) => ({
        ...prev,
        loading: isNewUserSession ? true : prev.loading,
        error: null,
      }));

      if (!sessionData.session) {
        setStatus({
          subscribed: false,
          productId: null,
          subscriptionEnd: null,
          loading: false,
          error: null,
          isTrial: false,
          trialEndsAt: null,
        });
        return;
      }

      // First check if user is super admin or has an active trial
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_ends_at, invited_via, is_super_admin')
        .eq('id', sessionData.session.user.id)
        .single();

      // Super Admin gets full Pro access
      if (profile?.is_super_admin) {
        setStatus({
          subscribed: true,
          productId: 'prod_TkoJ98sfzflYyR', // Pro Monthly product ID
          subscriptionEnd: null,
          loading: false,
          error: null,
          isTrial: false,
          trialEndsAt: null,
        });
        return;
      }

      // Check for active trial (invited users get Pro access)
      if (profile?.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const now = new Date();
        
        if (trialEnd > now) {
          // User has active trial - give Pro access
          setStatus({
            subscribed: true,
            productId: 'prod_TkoJ98sfzflYyR', // Pro Monthly product ID for trial users
            subscriptionEnd: null,
            loading: false,
            error: null,
            isTrial: true,
            trialEndsAt: profile.trial_ends_at,
          });
          return;
        }
      }

      // First: check internal subscriptions table directly (more reliable than edge function)
      const { data: internalSub } = await supabase
        .from('subscriptions')
        .select('plan_name, status, current_period_end')
        .eq('user_id', sessionData.session.user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (internalSub) {
        const endOk = !internalSub.current_period_end || 
          new Date(internalSub.current_period_end) > new Date();
        
        if (endOk) {
          console.log('[useSubscription] Found active subscription in DB:', internalSub.plan_name);
          setStatus({
            subscribed: true,
            productId: `db_${internalSub.plan_name}`,
            subscriptionEnd: internalSub.current_period_end,
            loading: false,
            error: null,
            isTrial: internalSub.status === 'trialing',
            trialEndsAt: null,
          });
          return;
        }
      }

      // Fallback: check Stripe subscription via edge function
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        // Even if edge function fails, if we have a subscription in DB, use that
        if (internalSub) {
          setStatus({
            subscribed: true,
            productId: `db_${internalSub.plan_name}`,
            subscriptionEnd: internalSub.current_period_end,
            loading: false,
            error: null,
            isTrial: false,
            trialEndsAt: null,
          });
          return;
        }
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return;
      }

      setStatus({
        subscribed: data?.subscribed ?? false,
        productId: data?.product_id ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        loading: false,
        error: null,
        isTrial: false,
        trialEndsAt: null,
      });
    } catch (err) {
      console.error('Subscription check failed:', err);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('Customer portal error:', error);
        return { error: error.message };
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Customer portal failed:', errorMessage);
      return { error: errorMessage };
    }
  };

  useEffect(() => {
    checkSubscription();

    // Re-check subscription every 60 seconds
    const interval = setInterval(checkSubscription, 60000);

    // Re-check when window regains focus (e.g., after payment)
    const handleFocus = () => {
      checkSubscription();
    };
    window.addEventListener('focus', handleFocus);

    // Listen for auth state changes and refresh subscription when user logs in
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('[useSubscription] User signed in, refreshing subscription status');
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => {
          checkSubscription();
        }, 0);
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      authSubscription.unsubscribe();
    };
  }, [checkSubscription]);

  return {
    ...status,
    refresh: checkSubscription,
    openCustomerPortal,
  };
};
