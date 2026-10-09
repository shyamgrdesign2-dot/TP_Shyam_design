import { useCallback, useEffect, useState } from 'react';
import {
  generateNeoSoapNotes,
  getNeoSoapNotes,
} from '../../../../api/services/ApiNeoSapien';
import {
  buildSoapNotesRequest,
  getStoredSoapNotes,
  normalizeSoapSections,
  resolveSoapNotesFromResponse,
} from '../utils/soapNotesUtils';

function hasSoapContent(soapNotes) {
  if (!soapNotes || typeof soapNotes !== 'object') return false;
  return Boolean(
    soapNotes.subjective
    || soapNotes.objective
    || soapNotes.assessment
    || soapNotes.plan
  );
}

export function useCaptureSoapNotes({
  capture,
  consultation,
  encounter,
  enabled = false,
}) {
  const encounterIndex = capture?.encounterIndex ?? 0;
  const consultationId = consultation?.id || capture?.consultationId;
  const [soapSections, setSoapSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const applySoapNotes = useCallback((soapNotes) => {
    const sections = normalizeSoapSections(soapNotes);
    if (!sections.length || !hasSoapContent(soapNotes)) {
      setError('SOAP notes could not be generated.');
      setSoapSections([]);
      return false;
    }
    setSoapSections(sections);
    setError(null);
    return true;
  }, []);

  const fetchSoapNotes = useCallback(async () => {
    const stored = getStoredSoapNotes(encounter, consultation, encounterIndex);
    if (stored && applySoapNotes(stored)) {
      return;
    }

    if (consultationId) {
      try {
        const storedResponse = await getNeoSoapNotes(consultationId);
        const storedSoap = resolveSoapNotesFromResponse(
          storedResponse,
          encounter,
          encounterIndex
        );
        if (storedSoap && applySoapNotes(storedSoap)) {
          return;
        }
      } catch (storedErr) {
        const status = storedErr?.response?.status;
        if (status && status !== 404) {
          throw storedErr;
        }
      }
    }

    const payload = buildSoapNotesRequest(consultation, encounter, encounterIndex);
    if (!payload.transcription?.trim() && !payload.conversation?.length) {
      setError('No transcript available for SOAP generation.');
      setSoapSections([]);
      return;
    }

    const response = await generateNeoSoapNotes(payload, { consultationId });
    const soapNotes = resolveSoapNotesFromResponse(response, encounter, encounterIndex);
    if (!applySoapNotes(soapNotes)) {
      setError('SOAP notes could not be generated.');
    }
  }, [
    applySoapNotes,
    consultation,
    consultationId,
    encounter,
    encounterIndex,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const stored = getStoredSoapNotes(encounter, consultation, encounterIndex);
    if (stored) {
      setSoapSections(normalizeSoapSections(stored));
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchSoapNotes()
      .catch((err) => {
        setError(err?.message || 'Failed to load SOAP notes');
        setSoapSections([]);
      })
      .finally(() => setLoading(false));
  }, [
    enabled,
    capture?.id,
    consultation,
    encounter,
    encounterIndex,
    fetchSoapNotes,
  ]);

  return {
    soapSections,
    loading,
    error,
    retry: fetchSoapNotes,
  };
}
