
import { useState, useEffect, useCallback } from "react"

const VELORA_KEY = "dr-agent-velora-mode"

export function useVeloraMode() {
  const [isVeloraMode, setIsVeloraModeState] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(VELORA_KEY)
    if (stored === "true") setIsVeloraModeState(true)
  }, [])

  useEffect(() => {
    function onStorage(e) {
      if (e.key === VELORA_KEY) setIsVeloraModeState(e.newValue === "true")
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setIsVeloraMode = useCallback((val) => {
    setIsVeloraModeState(val)
    localStorage.setItem(VELORA_KEY, String(val))
    window.dispatchEvent(new CustomEvent("velora-mode-change", { detail: val }))
  }, [])

  useEffect(() => {
    function onCustom(e) {
      setIsVeloraModeState((e ).detail)
    }
    window.addEventListener("velora-mode-change", onCustom)
    return () => window.removeEventListener("velora-mode-change", onCustom)
  }, [])

  return { isVeloraMode, setIsVeloraMode }
}
