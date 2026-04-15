import { createContext, useContext, ReactNode } from "react";

interface SubscriptionContextType {
  tier: string;
  isActive: boolean;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: "pro",
  isActive: true,
  loading: false,
});

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => (
  <SubscriptionContext.Provider value={{ tier: "pro", isActive: true, loading: false }}>
    {children}
  </SubscriptionContext.Provider>
);

export const useSubscriptionContext = () => useContext(SubscriptionContext);
