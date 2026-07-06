import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ComingSoonModal } from "./ComingSoonModal";

type ComingSoonContextValue = {
  showComingSoon: (feature?: string) => void;
};

const ComingSoonContext = createContext<ComingSoonContextValue | null>(null);

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [feature, setFeature] = useState<string | null>(null);

  const showComingSoon = useCallback((label = "This feature") => {
    setFeature(label);
  }, []);

  return (
    <ComingSoonContext.Provider value={{ showComingSoon }}>
      {children}
      {feature ? <ComingSoonModal feature={feature} onClose={() => setFeature(null)} /> : null}
    </ComingSoonContext.Provider>
  );
}

export function useComingSoon() {
  const context = useContext(ComingSoonContext);
  if (!context) {
    throw new Error("useComingSoon must be used within ComingSoonProvider");
  }
  return context;
}
