import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState } from
"react";
import {
  BILLING_CATALOG_STORAGE_KEY,
  buildInitialBillingItems } from
"./billing-catalog";

const BillingCatalogContext = createContext(null);

function readStoredItems() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BILLING_CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function BillingCatalogProvider({ children }) {
  const [items, setItems] = useState(() => buildInitialBillingItems());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredItems();
    if (stored) setItems(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        BILLING_CATALOG_STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch {

      /* ignore quota */}
  }, [items, hydrated]);

  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      setItems,
      addItem
    }),
    [items, addItem]
  );

  return (
    <BillingCatalogContext.Provider value={value}>
      {children}
    </BillingCatalogContext.Provider>);

}

export function useBillingCatalog() {
  const ctx = useContext(BillingCatalogContext);
  if (!ctx) {
    throw new Error(
      "useBillingCatalog must be used within BillingCatalogProvider"
    );
  }
  return ctx;
}