import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllDentalMasters } from "../redux/dentalMastersSlice";
import {
  DIAGNOSES,
  TOOTH_DIAGNOSES,
  ALL_ZONES,
  ORAL_POSITION_GROUPS,
  buildOralPositionGroupsFromApi,
} from "../components/dental/examination/types";

/**
 * useDentalMasters Hook
 * A convenience wrapper around Redux to provide dental metadata.
 * Automatically handles fetching if data is missing.
 */
export function useDentalMasters() {
  const dispatch = useDispatch();
  const masters = useSelector((state) => state.dentalMasters);

  useEffect(() => {
    const TTL_MS = 24 * 60 * 60 * 1000;
    const isStale = !masters.fetchedAt || Date.now() - masters.fetchedAt > TTL_MS;
    if (!masters.loading && !masters.error && (masters.surfaces.length === 0 || isStale)) {
      dispatch(fetchAllDentalMasters());
    }
  }, [dispatch, masters.loading, masters.surfaces.length, masters.fetchedAt, masters.error]);

  return {
    ...masters,
    activeDiagnoses: masters.diagnoses,
    activeSurfaceFindings: masters.surfaceFindings.length > 0 ? masters.surfaceFindings : DIAGNOSES,
    activeToothDiagnoses: masters.diagnoses.length > 0 ? masters.diagnoses : TOOTH_DIAGNOSES,
    activeProcedures: masters.procedures,
    procedureItems: masters.procedureItems?.length
      ? masters.procedureItems
      : masters.procedures.map((label) => ({ code: label, label })),
    activeSurfaces: masters.surfaces.length > 0 ? masters.surfaces : ALL_ZONES,
    activeOralDiagnoses: masters.oralDiagnoses || [],
    activeOralSurfaceFindings: masters.oralSurfaceFindings?.length > 0 ? masters.oralSurfaceFindings : (masters.oralDiagnoses?.length > 0 ? masters.oralDiagnoses : []),
    activeOralProcedures: masters.oralProcedures || [],
    oralPositionGroups: masters.oralAreaItems?.length > 0
      ? buildOralPositionGroupsFromApi(masters.oralAreaItems)
      : ORAL_POSITION_GROUPS,
    visualTypeMap: masters.visualTypeMap,
  };
}
