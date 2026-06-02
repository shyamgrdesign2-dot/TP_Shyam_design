/**
 * Referral reference data — specialties and the doctors that belong to each.
 *
 * In production the doctor list comes from the backend (filtered by the
 * selected specialty). Here it's a static mock shaped exactly like an API
 * response (`{ id, name, qualification, hospital }`) so a real fetch can drop
 * in later without changing the consumers.
 */

export const REFERRAL_SPECIALTIES = [
  { id: "cardiology", label: "Cardiology" },
  { id: "dermatology", label: "Dermatology" },
  { id: "orthopedics", label: "Orthopedics" },
  { id: "neurology", label: "Neurology" },
  { id: "ophthalmology", label: "Ophthalmology" },
  { id: "ent", label: "ENT" },
  { id: "gastroenterology", label: "Gastroenterology" },
  { id: "pulmonology", label: "Pulmonology" },
  { id: "endocrinology", label: "Endocrinology" },
  { id: "psychiatry", label: "Psychiatry" },
];

export const REFERRAL_DOCTORS = {
  cardiology: [
    { id: "card-1", name: "Dr. Anil Mehta", qualification: "MD, DM (Cardiology)", hospital: "Apollo Heart Institute" },
    { id: "card-2", name: "Dr. Priya Nair", qualification: "MD, DNB (Cardiology)", hospital: "Fortis Cardiac Care" },
    { id: "card-3", name: "Dr. Rakesh Iyer", qualification: "MBBS, MD", hospital: "City Heart Centre" },
  ],
  dermatology: [
    { id: "derm-1", name: "Dr. Sneha Kapoor", qualification: "MD (Dermatology)", hospital: "SkinWell Clinic" },
    { id: "derm-2", name: "Dr. Imran Sheikh", qualification: "MBBS, DDVL", hospital: "Derma Plus" },
  ],
  orthopedics: [
    { id: "ortho-1", name: "Dr. Vikram Rao", qualification: "MS (Ortho)", hospital: "OrthoOne Hospital" },
    { id: "ortho-2", name: "Dr. Meera Joshi", qualification: "MS, DNB (Ortho)", hospital: "Bone & Joint Centre" },
    { id: "ortho-3", name: "Dr. Sanjay Gupta", qualification: "MBBS, D.Ortho", hospital: "City Care" },
  ],
  neurology: [
    { id: "neuro-1", name: "Dr. Kavita Reddy", qualification: "MD, DM (Neurology)", hospital: "NeuroLife Institute" },
    { id: "neuro-2", name: "Dr. Arjun Menon", qualification: "DM (Neurology)", hospital: "Brain & Spine Centre" },
  ],
  ophthalmology: [
    { id: "ophth-1", name: "Dr. Rajeshwar Singh", qualification: "MS (Ophthalmology)", hospital: "Rajeshwar Eye Care" },
    { id: "ophth-2", name: "Dr. Latha Krishnan", qualification: "DNB (Ophthalmology)", hospital: "Vision Plus" },
  ],
  ent: [
    { id: "ent-1", name: "Dr. Nikhil Bose", qualification: "MS (ENT)", hospital: "ENT Speciality Clinic" },
    { id: "ent-2", name: "Dr. Fatima Khan", qualification: "DLO, DNB", hospital: "Hearing & Balance Centre" },
  ],
  gastroenterology: [
    { id: "gastro-1", name: "Dr. Suresh Pillai", qualification: "MD, DM (Gastro)", hospital: "GI Care Hospital" },
    { id: "gastro-2", name: "Dr. Anjali Verma", qualification: "DM (Gastroenterology)", hospital: "Digestive Health" },
  ],
  pulmonology: [
    { id: "pulmo-1", name: "Dr. Harish Kumar", qualification: "MD (Pulmonology)", hospital: "Chest & Lung Centre" },
    { id: "pulmo-2", name: "Dr. Deepa Shah", qualification: "MD, DNB", hospital: "Respira Care" },
  ],
  endocrinology: [
    { id: "endo-1", name: "Dr. Manoj Tiwari", qualification: "MD, DM (Endo)", hospital: "Endocrine & Diabetes Centre" },
    { id: "endo-2", name: "Dr. Ritu Agarwal", qualification: "DM (Endocrinology)", hospital: "Hormone Health" },
  ],
  psychiatry: [
    { id: "psy-1", name: "Dr. Aditya Sen", qualification: "MD (Psychiatry)", hospital: "Mind Wellness Centre" },
    { id: "psy-2", name: "Dr. Nisha Pillai", qualification: "DPM, DNB", hospital: "Serene Minds Clinic" },
  ],
};

export function getSpecialtyLabel(specialtyId) {
  return REFERRAL_SPECIALTIES.find((s) => s.id === specialtyId)?.label ?? "";
}

/**
 * Flat doctor directory — every doctor carries its specialty. This is the
 * single source the referral combobox searches; specialty is shown as a tag
 * on each option (there's no separate specialty field).
 */
export const ALL_DOCTORS = REFERRAL_SPECIALTIES.flatMap((s) =>
  (REFERRAL_DOCTORS[s.id] ?? []).map((d) => ({
    ...d,
    specialtyId: s.id,
    specialtyLabel: s.label,
  }))
);

export function getDoctorByIdFlat(doctorId) {
  return ALL_DOCTORS.find((d) => d.id === doctorId) ?? null;
}

/** Search doctors by name or specialty. Empty query returns all. */
export function searchDoctors(query) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return ALL_DOCTORS;
  return ALL_DOCTORS.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.specialtyLabel.toLowerCase().includes(q)
  );
}

/** Canonical empty referral value. Specialty is derived from the doctor. */
export const EMPTY_REFERRAL = {
  doctorId: "",
  date: "",
  notes: "",
};

/** Today's date as yyyy-mm-dd (local), for pre-filling the referral date. */
export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** A fresh referral with the date pre-filled to today. */
export function defaultReferral() {
  return { ...EMPTY_REFERRAL, date: todayISO() };
}

/**
 * True when the referral is real enough to print. A referral is a referral TO a
 * doctor, so a doctor must be selected — a lone (default) date or stray note
 * doesn't surface in the Rx.
 */
export function hasReferral(value) {
  if (!value) return false;
  return Boolean(value.doctorId);
}

/** Format a yyyy-mm-dd string as e.g. "12 Jun '26". Returns "" if unset. */
export function formatReferralDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
}

/**
 * Resolve an id-based referral value into display labels for print/preview.
 * Returns null when there is nothing to show.
 */
export function resolveReferral(value) {
  if (!hasReferral(value)) return null;
  const doctor = getDoctorByIdFlat(value.doctorId);
  return {
    specialty: doctor?.specialtyLabel ?? "",
    doctor: doctor?.name ?? "",
    doctorMeta: doctor ? [doctor.qualification, doctor.hospital].filter(Boolean).join(" · ") : "",
    date: formatReferralDate(value.date),
    notes: (value.notes ?? "").trim(),
  };
}
