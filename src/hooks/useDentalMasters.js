import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllDentalMasters } from "../redux/dentalMastersSlice";
import {
  DIAGNOSES,
  TOOTH_DIAGNOSES,
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
    // Automatically fetch masters if they haven't been loaded yet
    if (!masters.loading && masters.surfaces.length === 0 && !masters.error) {
      dispatch(fetchAllDentalMasters());
    }
  }, [dispatch, masters.loading, masters.surfaces.length, masters.error]);

  return {
    ...masters,
    activeDiagnoses: masters.diagnoses,
    activeSurfaceFindings: masters.surfaceFindings.length > 0 ? masters.surfaceFindings : DIAGNOSES,
    activeToothDiagnoses: masters.diagnoses.length > 0 ? masters.diagnoses : TOOTH_DIAGNOSES,
    activeProcedures: masters.procedures,
    activeSurfaces: masters.surfaces,
    oralPositionGroups: masters.oralAreaItems?.length > 0
      ? buildOralPositionGroupsFromApi(masters.oralAreaItems)
      : ORAL_POSITION_GROUPS,
  };
}
