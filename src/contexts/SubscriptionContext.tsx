import { createContext, useContext, ReactNode } from "react";

interface SubscriptionContextType {
  tier: string;
  isActive: boolean;
  loading: boolean;
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  openCustomerPortal: () => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: "pro",
  isActive: true,
  loading: false,
  subscribed: true,
  productId: null,
  subscriptionEnd: null,
  isTrial: false,
  trialEndsAt: null,
  openCustomerPortal: async () => ({}),
  refresh: async () => {},
});

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => (
  <SubscriptionContext.Provider value={{
    tier: "pro",
    isActive: true,
    loading: false,
    subscribed: true,
    productId: null,
    subscriptionEnd: null,
    isTrial: false,
    trialEndsAt: null,
    openCustomerPortal: async () => ({}),
    refresh: async () => {},
  }}>
    {children}
  </SubscriptionContext.Provider>
);

export const useSubscriptionContext = () => useContext(SubscriptionContext);
