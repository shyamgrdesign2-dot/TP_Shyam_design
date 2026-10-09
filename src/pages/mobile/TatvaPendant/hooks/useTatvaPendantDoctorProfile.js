import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearDoctorProfile, getProfile } from '../../../../redux/doctorsSlice';
import { getClinicName } from '../../../../utils/utils';
import { getDecodedToken } from '../../../../utils/localStorage';
import { formatDoctorName, getInitials } from '../utils/tpDisplayUtils';

function getTokenUserIds() {
  const decoded = getDecodedToken();
  const result = decoded?.result || {};
  return {
    doctorUniqueId: result.doctor_unique_id ?? null,
    userId: result.user_id ?? null,
  };
}

function getProfileUserIds(profile) {
  if (!profile) return { doctorUniqueId: null, userId: null };
  return {
    doctorUniqueId: profile.doctor_unique_id ?? null,
    userId: profile.user_id ?? profile.um_id ?? null,
  };
}

function isSameDoctor(tokenIds, profileIds) {
  if (
    tokenIds.doctorUniqueId
    && profileIds.doctorUniqueId
    && String(tokenIds.doctorUniqueId) === String(profileIds.doctorUniqueId)
  ) {
    return true;
  }
  if (
    tokenIds.userId
    && profileIds.userId
    && String(tokenIds.userId) === String(profileIds.userId)
  ) {
    return true;
  }
  return false;
}

export function useTatvaPendantDoctorProfile() {
  const dispatch = useDispatch();
  const { profile, loading } = useSelector((state) => state.doctors);
  const { doctorUniqueId: tokenDoctorId, userId: tokenUserId } = getTokenUserIds();

  useEffect(() => {
    const profileIds = getProfileUserIds(profile);
    const userChanged = (tokenDoctorId || tokenUserId)
      && (profileIds.doctorUniqueId || profileIds.userId)
      && !isSameDoctor({ doctorUniqueId: tokenDoctorId, userId: tokenUserId }, profileIds);

    if (userChanged) {
      dispatch(clearDoctorProfile());
      dispatch(getProfile());
      return;
    }

    if (!profile && !loading) {
      dispatch(getProfile());
    }
  }, [dispatch, profile, loading, tokenDoctorId, tokenUserId]);

  const doctorName = useMemo(() => formatDoctorName(profile?.um_name), [profile?.um_name]);
  const subtitle = useMemo(() => {
    const clinic = getClinicName(profile?.hospital_data);
    return [profile?.dp_name, clinic].filter(Boolean).join(' · ');
  }, [profile?.dp_name, profile?.hospital_data]);
  const initials = useMemo(() => getInitials(profile?.um_name), [profile?.um_name]);

  return { profile, loading, doctorName, subtitle, initials };
}
