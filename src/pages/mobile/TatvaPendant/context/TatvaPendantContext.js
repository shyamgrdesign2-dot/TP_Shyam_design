import React, { createContext, useContext, useEffect } from 'react';
import NeoConsultationProvider, {
  useNeoConsultationContext,
} from '../../../../components/neo/NeoConsultationProvider';
import { useTodayConsultations } from '../hooks/useTodayConsultations';

const TatvaPendantContext = createContext(null);

function RefetchOnConsultationReady({ refetch, children }) {
  const neo = useNeoConsultationContext();

  useEffect(() => {
    if (!neo?.consultationResult) return;

    refetch().finally(() => {
      neo?.clearTodayCapturedExtra?.();
    });
  }, [neo?.consultationResult, neo?.clearTodayCapturedExtra, refetch]);

  return children;
}

export function TatvaPendantProvider({ children }) {
  const value = useTodayConsultations();

  return (
    <NeoConsultationProvider forceEnabled>
      <RefetchOnConsultationReady refetch={value.refetch}>
        <TatvaPendantContext.Provider value={value}>
          {children}
        </TatvaPendantContext.Provider>
      </RefetchOnConsultationReady>
    </NeoConsultationProvider>
  );
}

export function useTatvaPendantData() {
  const context = useContext(TatvaPendantContext);
  if (!context) {
    throw new Error('useTatvaPendantData must be used within TatvaPendantProvider');
  }
  return context;
}
