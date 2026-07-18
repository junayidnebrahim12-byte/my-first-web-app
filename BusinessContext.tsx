import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BusinessSettings } from '../types';

interface BusinessContextType {
  settings: BusinessSettings | null;
  loading: boolean;
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as BusinessSettings);
      } else {
        // Default settings if none exist
        const defaultSettings: BusinessSettings = {
          name: 'My Coffee Shop',
          managerName: 'John Doe',
          accountNumber: '1000123456789',
          phone: '+251 911 234 567',
          managerPin: '1234'
        };
        setSettings(defaultSettings);
        setDoc(doc(db, 'settings', 'general'), defaultSettings);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    if (settings) {
      await setDoc(doc(db, 'settings', 'general'), { ...settings, ...newSettings }, { merge: true });
    }
  };

  return (
    <BusinessContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
