import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const RxPadSyncContext = createContext({
  lastCopyRequest: null,
  lastSignal: null,
  requestCopyToRxPad: () => {},
  publishSignal: () => {},
  patientAllergies: [],
  setPatientAllergies: () => {},
});

export function RxPadSyncProvider({ children }) {
  const [lastCopyRequest, setLastCopyRequest] = useState(null);
  const [lastSignal, setLastSignal] = useState(null);
  const [copySequence, setCopySequence] = useState(0);
  const [signalSequence, setSignalSequence] = useState(0);
  const [patientAllergies, setPatientAllergies] = useState([]);

  const requestCopyToRxPad = useCallback((payload) => {
    setCopySequence((prev) => {
      const next = prev + 1;
      setLastCopyRequest({ id: next, payload });
      return next;
    });
  }, []);

  const publishSignal = useCallback((signal) => {
    setSignalSequence((prev) => {
      const next = prev + 1;
      setLastSignal({ id: next, ...signal });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      lastCopyRequest,
      lastSignal,
      requestCopyToRxPad,
      publishSignal,
      patientAllergies,
      setPatientAllergies,
    }),
    [
      lastCopyRequest,
      lastSignal,
      requestCopyToRxPad,
      publishSignal,
      patientAllergies,
    ],
  );

  return (
    <RxPadSyncContext.Provider value={value}>
      {children}
    </RxPadSyncContext.Provider>
  );
}

export function useRxPadSync() {
  return useContext(RxPadSyncContext);
}
