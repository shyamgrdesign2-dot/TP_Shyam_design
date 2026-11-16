/**
 * Case File — sample bundle for the UI draft.
 *
 * SOURCE. The clinical content follows the 99-page digitized IPD file the team
 * shared for this exercise, so the screen can be cross-checked against that
 * document. Page numbers are the page numbers of that digitized PDF.
 *
 * DE-IDENTIFIED. Patient name, record numbers, national ID, address, phone,
 * relatives, staff names and the hospital name are removed or replaced.
 * Do not add any of them back to this file.
 *
 * "As written" keeps the original language and spelling of the page, including
 * the reader's mistakes on hard handwriting. That is on purpose: it is what a
 * reviewer has to check.
 *
 * Shape follows sheet "04 Data Output Schema" of the MAHE RFP: encounters
 * (ENC), documents (DOC), findings for DX / MED / ALG / LAB / VIT / PROC / RPT,
 * each with a citation (provenance), a confidence (QC) and exceptions (ERR).
 */

export const DOMAINS = [
  { code: "DX", label: "Diagnoses", fhir: "Condition", risk: "critical", historySection: "Medical Condition" },
  { code: "ALG", label: "Allergies", fhir: "AllergyIntolerance", risk: "critical", historySection: "Allergies" },
  { code: "MED", label: "Medications", fhir: "MedicationStatement", risk: "critical", historySection: null },
  { code: "PROC", label: "Procedures", fhir: "Procedure", risk: "high", historySection: "Surgical History" },
  { code: "LAB", label: "Lab results", fhir: "Observation", risk: "critical", historySection: null },
  { code: "VIT", label: "Vitals", fhir: "Observation", risk: "high", historySection: null },
  { code: "RPT", label: "Reports and notes", fhir: "DiagnosticReport", risk: "high", historySection: null },
];

export const DOCUMENT_CATEGORIES = [
  { id: "summaries", label: "Summaries", hint: "Face sheet, discharge summary, referral" },
  { id: "doctorNotes", label: "Doctor notes", hint: "Progress notes, anaesthesia and recovery records" },
  { id: "labs", label: "Lab reports", hint: "Haematology, chemistry, hormones, blood bank" },
  { id: "imaging", label: "Imaging", hint: "X-ray report, ECG, scope and operative images" },
  { id: "medication", label: "Medication charts", hint: "Allergy list, drug chart, reconciliation" },
  { id: "nursingForms", label: "Nursing and forms", hint: "Consents, checklists, education, fluid charts" },
];

const HOSPITAL = "Private hospital";

const encounters = [
  {
    id: "E1",
    type: "IPD",
    label: "IPD admission",
    facility: HOSPITAL,
    department: "Digestive Surgery",
    dateLabel: "26 Feb to 4 Mar 2026",
    shortDate: "26 Feb-4 Mar'26",
    startLabel: "26 Feb 2026",
    endLabel: "4 Mar 2026",
    // How the patient came in and how the stay ended. Null when the file does
    // not say: the summary then says only "Admitted", it never guesses.
    //   entry    emergency | referral | fromOpd | transfer | planned | direct
    //   outcome  discharged | lama | transferred | died
    entry: "referral",
    outcome: "discharged",
    speciality: "Surgery",
    sortKey: "2026-02-26",
    number: "Registration no. removed",
    clinician: "Digestive surgeon",
    pages: 93,
  },
  {
    id: "E0",
    type: "OPD",
    label: "Pre-admission work-up",
    facility: HOSPITAL,
    department: "Outpatient",
    dateLabel: "25 Feb 2026",
    shortDate: "25 Feb'26",
    startLabel: "25 Feb 2026",
    // visitKind  first | followUp | workup
    visitKind: "workup",
    speciality: "Work-up",
    sortKey: "2026-02-25",
    number: "Registration no. removed",
    clinician: "Digestive surgeon",
    pages: 6,
  },
];

// Order = page order. A document's position here is its citation number.
const documents = [
  { id: "D1", category: "summaries", title: "Admission and discharge face sheet", encounterId: "E1", from: 1, to: 1, script: "mixed" },
  { id: "D2", category: "summaries", title: "Discharge summary", encounterId: "E1", from: 2, to: 5, script: "mixed" },
  { id: "D3", category: "summaries", title: "Admission referral and discharge permit", encounterId: "E1", from: 6, to: 6, script: "mixed" },
  { id: "D4", category: "doctorNotes", title: "Integrated progress notes", encounterId: "E1", from: 7, to: 8, script: "handwritten" },
  { id: "D5", category: "nursingForms", title: "Patient and family education record", encounterId: "E1", from: 9, to: 17, script: "handwritten" },
  { id: "D6", category: "nursingForms", title: "Consent forms: surgery, anaesthesia, transfusion", encounterId: "E1", from: 18, to: 30, script: "mixed" },
  { id: "D7", category: "nursingForms", title: "Surgical site marking and safety checklist", encounterId: "E1", from: 31, to: 33, script: "mixed" },
  { id: "D8", category: "imaging", title: "Fluoroscopy images and cystoscopy report", encounterId: "E1", from: 34, to: 34, script: "image" },
  { id: "D9", category: "imaging", title: "Operative photos and recovery room record", encounterId: "E1", from: 35, to: 35, script: "mixed" },
  { id: "D10", category: "doctorNotes", title: "Pre-anaesthesia and anaesthesia record", encounterId: "E1", from: 36, to: 39, script: "handwritten" },
  { id: "D11", category: "medication", title: "Drug allergy list and medication chart", encounterId: "E1", from: 40, to: 44, script: "handwritten" },
  { id: "D12", category: "medication", title: "Medication reconciliation form", encounterId: "E1", from: 45, to: 45, script: "handwritten" },
  { id: "D13", category: "nursingForms", title: "Fluid balance and infusion charts", encounterId: "E1", from: 46, to: 63, script: "handwritten" },
  { id: "D14", category: "labs", title: "Blood bank: cross-match and request", encounterId: "E1", from: 64, to: 66, script: "mixed" },
  { id: "D15", category: "labs", title: "Laboratory reports", encounterId: "E1", from: 67, to: 69, script: "typed" },
  { id: "D16", category: "labs", title: "Pre-admission laboratory report", encounterId: "E0", from: 70, to: 73, script: "typed" },
  { id: "D17", category: "imaging", title: "Chest X-ray report and ECG", encounterId: "E0", from: 74, to: 75, script: "typed" },
  { id: "D18", category: "nursingForms", title: "Nursing activity notes", encounterId: "E1", from: 76, to: 98, script: "handwritten" },
  { id: "D19", category: "nursingForms", title: "Patient activity agenda", encounterId: "E1", from: 99, to: 99, script: "handwritten" },
];

/* ------------------------------------------------------------------ pages */
// Only pages that findings cite are drawn. Text is as it appears in the
// digitized file, minus identifiers.

const head = (sub) => ({ t: "head", title: "RUMAH SAKIT (name removed)", sub: sub || "City removed" });
const label = (ids) => ({ t: "label", name: "Patient label (identity removed)", ids });
const LAB_COLS = ["Test / Jenis Pemeriksaan", "Hasil", "Satuan", "Nilai Rujukan"];

const pages = {
  1: {
    docId: "D1",
    blocks: [
      head(),
      { t: "title", text: "RINGKASAN MASUK & KELUAR" },
      label("No. RM removed  |  No. Registrasi removed"),
      { t: "kv", rid: "p1-admit", k: "Tgl. Masuk", v: "26-Feb-2026   Waktu Masuk : 09:23" },
      { t: "kv", rid: "p1-discharge", k: "Tgl. Keluar", v: "09/03/2026   Lama Rawat : 6", hand: true },
      { t: "kv", k: "Ruang / Kelas", v: "Kamar 303, Bed 303-2 / Kelas I" },
      { t: "kv", k: "Spesialisasi", v: "Digestive Surgery" },
      { t: "kv", rid: "p1-dx-main", k: "Diagnosa Utama", v: "Tumor kista hati metastasis liver cancer     D21.4", hand: true, smudge: true },
      { t: "foot", text: "Print Date/Time: 26-Feb-2026 09:26" },
    ],
  },
  2: {
    docId: "D2",
    blocks: [
      { t: "sub", text: "Ringkasan Masuk & Keluar (lanjutan)" },
      { t: "kv", rid: "p2-dx-sec", k: "Diagnosa Sekunder", v: "Penyakit hati buli. Hipalbuminemia. Pleurotaid effusions     E00.0 8706", hand: true, smudge: true },
      { t: "kv", rid: "p2-dx-comp", k: "Komplikasi", v: "Hypercalcemia     D69", hand: true, smudge: true },
      head(),
      { t: "title", text: "RINGKASAN PULANG / DISCHARGED SUMMARY" },
      label("Tanggal Masuk 26 / 02 / 2026  |  Tanggal Keluar 4 / 03 / 2026"),
      { t: "kv", rid: "p2-dates", k: "Date of discharged", v: "4 / 03 / 2026", hand: true },
      { t: "kv", rid: "p2-working", k: "Diagnosa Masuk / Working Diagnosis", v: "Massa intraabdomen dan pelvis susp lipoma dd liposarkoma", hand: true },
      { t: "kv", rid: "p2-complaint", k: "Keluhan Utama / Main Complaint", v: "BAK tersendat-sendat", hand: true },
      { t: "kv", rid: "p2-history", k: "Riwayat Penyakit Sekarang / History of Illness", v: "BAK tersendat-sendat, frekuensi sering. BAB sulit. Dari hasil MRI diketahui ada benjolan menekan ke saluran kemih", hand: true },
      { t: "kv", rid: "p2-past", k: "Riwayat Penyakit Dahulu / Past History", v: "Rheumatoid arthritis, hiperkoagulasi, r/n. histerektomi", hand: true },
    ],
  },
  3: {
    docId: "D2",
    blocks: [
      { t: "kv", rid: "p3-allergy", k: "Alergi / Allergy", v: "-", hand: true },
      { t: "kv", rid: "p3-exam", k: "Pemeriksaan Fisik Penting / Physical Examination", v: "BP 142/97  HR 96  RR 12  SpO2 98  T 36,6  Abdomen : NT + suprapubik", hand: true },
      { t: "kv", rid: "p3-findings", k: "Penemuan Klinis Penting / Clinical findings", v: "Hb 11,4  Leukosit 12800  Trombosit 400.000  Albumin 3,2", hand: true },
      { t: "kv", rid: "p3-dx-main", k: "Diagnosis Utama / Main Diagnosis", v: "Tumor jaringan lunak intraabdomen/iklum c/o/1 peletakan K2 buli", hand: true },
      {
        t: "table",
        cols: ["Diagnosis Sekunder / Secondary Diagnosis", "ICD-10"],
        hand: true,
        rows: [
          { rid: "p3-dx-2", cells: ["1  Hipoalbumin", ""] },
          { rid: "p3-dx-3", cells: ["2  Rheumatoid arthritis", ""] },
          { rid: "p3-dx-4", cells: ["3  Hiperkoagulasi", ""] },
        ],
      },
      {
        t: "table",
        cols: ["Operasi / Tindakan / Procedure", "Tgl. / Date"],
        hand: true,
        rows: [
          { rid: "p3-proc-1", cells: ["1  5/02/26 evaluar + inoper uk-n/lt", "27/02/26"] },
          { rid: "p3-proc-2", cells: ["2  (Operasi ekar) tumor + resek (n/lt)", ""] },
        ],
      },
      { t: "kv", rid: "p3-inhosp", k: "Terapi selama di rumah sakit / Medication during hospitalization", v: "Efisol, Xanax, Aminolylte perifer, Adona forte, Acetam, Cefazolin, Maxicef, Maxigesic, Fentanyl, Farkson, Vomizole, Kelessse, Narfoz, Octaserum, Micovax, Antiten, Arcolase, Ropivell, Doxycyclin, glisenn, Lasix, Codapont", hand: true },
      { t: "kv", rid: "p3-discharge", k: "Kondisi saat Pulang / Discharged Condition", v: "Keadaan Umum : Stabil  Kesadaran : CM  GCS : 15  Tensi 102/74  Nadi 72  Respirasi 18  Suhu 36,6  SpO2 98", hand: true },
      { t: "kv", rid: "p3-devices", k: "Peralatan medis yang masih dipakai", v: "[ ] Infus  [ ] O2  [ ] Kateter  [ ] NGT  [ ] CVC  [ ] Drain" },
      { t: "kv", rid: "p3-reason", k: "Alasan Pulang / Discharged Reasons", v: "[x] Dapat berobat jalan / Out patient service" },
    ],
  },
  4: {
    docId: "D2",
    blocks: [
      { t: "title", text: "RINGKASAN PULANG / DISCHARGED SUMMARY (lanjutan / continued)" },
      label("No. RM removed"),
      { t: "sub", text: "Terapi Pulang / Medication on discharged" },
      {
        t: "table",
        cols: ["Nama Obat / Medicine", "Dosis / Dose", "Frekuensi / Freq", "Route", "Jml / Qty"],
        hand: true,
        rows: [
          { rid: "p4-med-1", cells: ["Alganax", "0,5 mg", "1x1", "PO", "40"] },
          { rid: "p4-med-2", cells: ["Nexium", "40 mg", "1x1", "PO", "7"] },
          { rid: "p4-med-3", cells: ["Dexyclav", "500 mg", "3x1", "PO", "19"] },
          { rid: "p4-med-4", cells: ["Acetram", "", "3x1", "PO", "29"] },
          { rid: "p4-med-5", cells: ["Cliad", "", "1x1", "PO", "30"] },
          { rid: "p4-med-6", cells: ["VOMeta FT", "", "K/P", "PO", "10"] },
          { rid: "p4-med-7", cells: ["Codipront", "", "K/P, max 3 x 1", "PO", "30"] },
          { rid: "p4-med-8", cells: ["Fartison", "20 mg", "1 x 2 tab", "PO", "10"] },
          { rid: "p4-med-9", cells: ["Brix-a", "5 mg", "1x1", "-", ""] },
        ],
      },
      { t: "kv", rid: "p4-handed", k: "Disertakan saat pulang / Submitted matters", v: "[x] Foto Rontgen : 1 lbr     [x] Hasil Laboratorium : 5 lbr" },
    ],
  },
  5: {
    docId: "D2",
    blocks: [
      { t: "sub", text: "Kontrol selanjutnya / Out patient follow up" },
      {
        t: "table",
        cols: ["Tanggal / Date", "Jam / Time", "Dokter / Physician"],
        hand: true,
        rows: [
          { rid: "p5-fu-1", cells: ["Rabu, 11/03-2026", "Jam 16", "Digestive surgeon"] },
          { rid: "p5-fu-2", cells: ["Rabu, 11/03-2026", "Jam 09", "Urologist"] },
        ],
      },
      { t: "kv", rid: "p5-advice", k: "Instruksi dan Edukasi / Suggestion at home", v: "Minum obat teratur. Kontrol sesuai jadwal. Jaga balutan agar tetap bersih dan kering.", hand: true },
      { t: "kv", k: "Transportasi pulang", v: "[x] Kendaraan pribadi (Private car)" },
      { t: "sig", text: "4/03/26   Jam 11.20" },
    ],
  },
  6: {
    docId: "D3",
    blocks: [
      head(),
      { t: "title", text: "SURAT PENGANTAR RAWAT / TINDAKAN" },
      { t: "kv", rid: "p6-referral", k: "Diagnosa kerja", v: "susp giant tumor di pelvis", hand: true },
      { t: "kv", rid: "p6-plan", k: "Jenis tindakan", v: "laparotomi eksisi tumor", hand: true },
      { t: "sig", text: "10/02/26" },
      { t: "title", text: "SURAT IZIN PULANG" },
      { t: "kv", rid: "p6-permit", k: "Print Date/Time", v: "04-Mar-2026 10:57" },
    ],
  },
  7: {
    docId: "D4",
    blocks: [{ t: "damage", rid: "p7-notes", text: "Handwritten progress notes. Most lines could not be read reliably." }],
  },
  8: {
    docId: "D4",
    blocks: [
      { t: "title", text: "CATATAN PERKEMBANGAN PASIEN TERINTEGRASI" },
      { t: "kv", rid: "p8-note", k: "18.00", v: "boleh klisma gliserin. besok pagi brixa boleh mulai lagi. boleh pulang jika sudah BAB. besok boleh diet BBLC.", hand: true },
    ],
  },
  16: {
    docId: "D5",
    blocks: [
      { t: "title", text: "EDUKASI PASIEN DAN KELUARGA" },
      { t: "kv", rid: "p16-steroid", k: "Catatan", v: "pasien lama memakai triamsinolon", hand: true },
      { t: "kv", rid: "p16-ab", k: "Antibiotik", v: "Cefazolin 2gr pre op", hand: true },
    ],
  },
  18: {
    docId: "D6",
    blocks: [
      head(),
      { t: "title", text: "PERSETUJUAN / PENOLAKAN TINDAKAN KEDOKTERAN" },
      label("No. RM removed"),
      { t: "kv", rid: "p18-dx", k: "1  Diagnosis (WD/DD)", v: "Tumor pelvis susp liposarcom", hand: true },
      { t: "kv", k: "2  Dasar Diagnosis", v: "clinic, lab, imaging", hand: true },
      { t: "kv", rid: "p18-proc", k: "3  Tindakan Kedokteran", v: "laparotomy eksisi tumor", hand: true },
      { t: "kv", k: "5  Tata Cara", v: "bius umum", hand: true },
      { t: "kv", rid: "p18-prognosis", k: "9  Prognosis", v: "dubia", hand: true },
    ],
  },
  25: {
    docId: "D6",
    blocks: [
      { t: "title", text: "PERSETUJUAN TINDAKAN KEDOKTERAN" },
      { t: "kv", rid: "p25-consent", k: "Tindakan", v: "Sistoskopi evaluasi + Insersi UK kanan k.p DJ stent kanan", hand: true },
    ],
  },
  28: {
    docId: "D6",
    blocks: [
      { t: "title", text: "PERSETUJUAN TINDAKAN KEDOKTERAN" },
      { t: "kv", rid: "p28-consent", k: "Tindakan", v: "laparotomi e.c Giant mass abdopelvis joint op, (urology, digestive, obgyn)", hand: true },
    ],
  },
  32: {
    docId: "D7",
    blocks: [
      { t: "title", text: "CHECKLIST KEAMANAN TINDAKAN BEDAH / INVASIF" },
      { t: "kv", rid: "p32-body", k: "Sign in", v: "BB: 58 kg.  TB: 161", hand: true },
      { t: "kv", rid: "p32-blood", k: "Catatan", v: "Keep PRC 2 bag, FFP 2 bag.     PRC : 1 Bag", hand: true, smudge: true },
    ],
  },
  33: {
    docId: "D7",
    blocks: [
      { t: "title", text: "CHECKLIST KEAMANAN TINDAKAN BEDAH / INVASIF (lanjutan)" },
      { t: "kv", rid: "p33-ab", k: "Time out", v: "AB, Cefazolin 2 gr 0540", hand: true },
      { t: "kv", rid: "p33-specimen", k: "Sign out", v: "[x] Memberi identitas jaringan PA     [x] Tidak ada jaringan" },
    ],
  },
  34: {
    docId: "D8",
    blocks: [
      label("Cios_Fusion  |  27-02-2026  8:47 AM"),
      { t: "img", rid: "p34-fluoro", kind: "angio", caption: "Fluoroscopy still, 27-02-2026 (2 images on the page)" },
      head(),
      { t: "kv", rid: "p34-cysto", k: "Hasil Pemeriksaan", v: "Cystoscopy Evaluasi pasang UK" },
      { t: "img", rid: "p34-scope", kind: "scope", caption: "Endoscopic images" },
      { t: "sig", text: "27-Feb-2026   Urologist" },
    ],
  },
  35: {
    docId: "D9",
    blocks: [
      { t: "img", rid: "p35-photos", kind: "photo", caption: "Operative photographs (4 on the page)" },
      { t: "title", text: "CATATAN RUANG PEMULIHAN (RR)" },
      { t: "kv", rid: "p35-rr", k: "Masuk kamar pulih Jam 10.15, Tanda Vital", v: "Tekanan darah 135/81 mmHg   Nadi 63 x/m   Temperatur 35.7 C   SpO2 100%   Skor nyeri 2", hand: true },
      { t: "kv", k: "Catatan khusus", v: "Pasien diberikan selimut hangat. 11.00 pasien mengeluh nyeri di lambung.", hand: true },
    ],
  },
  36: {
    docId: "D10",
    blocks: [
      { t: "title", text: "PENGKAJIAN PRA ANESTESI / SEDASI" },
      { t: "kv", rid: "p36-asa", k: "STATUS FISIK", v: "ASA 1 (2) 3 4 5 E     Penyulit Pre Anestesi : Rheumatoid arthritis" },
      { t: "kv", rid: "p36-brixa", k: "Obat yang sedang dikonsumsi", v: "stop brixia sejak 23/02/26", hand: true },
      { t: "kv", rid: "p36-ra", k: "Catatan", v: "Rutin suntik utk RA. (autoimun)", hand: true },
      { t: "kv", rid: "p36-social", k: "Kebiasaan", v: "Alkohol : [x] Tidak" },
    ],
  },
  37: {
    docId: "D10",
    blocks: [
      { t: "title", text: "CATATAN ANESTESI / SEDASI" },
      { t: "kv", rid: "p37-plan", k: "Perencanaan", v: "GA. Epidural", hand: true },
      { t: "kv", rid: "p37-steroid", k: "Catatan", v: "Fartisson dibawa ke kamar operasi", hand: true, smudge: true },
    ],
  },
  38: {
    docId: "D10",
    blocks: [
      { t: "kv", rid: "p38-ga", k: "Intravena", v: "Midazolam 1 mg, fentanyl 100 mcg, Propofol 100 mg, Rocuronium 50 mg.   ETT No. 7.9", hand: true },
      { t: "kv", rid: "p38-epidural", k: "Regional", v: "Jenis : Epidural. Lokasi : L3-L4. Ropivacaine 5 ml, NaCl 10 ml. Hasil : [x] Total Blok", hand: true },
    ],
  },
  39: {
    docId: "D10",
    blocks: [
      { t: "kv", rid: "p39-hydrocortisone", k: "08.10", v: "Hidrocortison 100 mg IV", hand: true },
      { t: "kv", rid: "p39-ketorolac", k: "09.40", v: "Ketorolac 60 mg IV", hand: true },
      { t: "kv", rid: "p39-times", k: "Waktu", v: "08.02 s/d 08.20 : tindakan urologi.  08.33 s/d 09.50 : tindakan bedah digestif.", hand: true },
      { t: "kv", rid: "p39-duration", k: "Lama", v: "Lama Sedasi/Anestesi : 2 jam 30 menit.  Lama Pembedahan : 2 jam 10 menit" },
    ],
  },
  42: {
    docId: "D11",
    blocks: [
      { t: "title", text: "DAFTAR ALERGI OBAT" },
      { t: "kv", rid: "p42-allergy", k: "Daftar alergi obat", v: "Tidak ada.", hand: true },
      { t: "kv", rid: "p42-brixa", k: "1.", v: "Brixa  Senin  1x5mg   Stop tgl 23/02", hand: true },
      { t: "title", text: "CATATAN OBSERVASI DAN DAFTAR PEMBERIAN OBAT" },
      { t: "damage", rid: "p42-chart", text: "Drug administration chart. Rows are listed under Documents; not every time-tick was read." },
    ],
  },
  43: {
    docId: "D11",
    blocks: [
      { t: "title", text: "CATATAN OBSERVASI DAN DAFTAR PEMBERIAN OBAT (lanjutan)" },
      { t: "kv", rid: "p43-home-6", k: "6.", v: "Panadol  1x1", hand: true },
      { t: "kv", rid: "p43-ab", k: "9.", v: "Cefotaxim  Preop drip 2gr", hand: true },
    ],
  },
  45: {
    docId: "D12",
    blocks: [
      { t: "title", text: "FORMULIR REKONSILIASI OBAT - PASIEN BARU" },
      { t: "sub", text: "(Obat yang dikonsumsi di rumah)" },
      { t: "kv", rid: "p45-allergy", k: "ALERGI OBAT", v: "Tidak ada", hand: true },
      {
        t: "table",
        cols: ["Nama Obat", "Aturan Pakai", "Lama Penggunaan"],
        hand: true,
        rows: [
          { rid: "p45-home-1", cells: ["Brixa 5mg", "1x1", ""] },
          { rid: "p45-home-2", cells: ["Omega 3", "1-2 kapsul / hari", ""] },
          { rid: "p45-home-3", cells: ["Flaxseed oil Softgel", "1-2 kapsul / hari", ""] },
          { rid: "p45-home-4", cells: ["Vit D3 K2 5000 IU", "1x1", ""] },
          { rid: "p45-home-5", cells: ["Magnesium", "1x2 tabs", ""] },
          { rid: "p45-home-6", cells: ["Pancreol OSTEO", "1x1 k/p", ""], smudge: true },
          { rid: "p45-home-7", cells: ["Trilac injeksi", "Tiap 2 minggu", "terakhir 23/02/2026"] },
        ],
      },
    ],
  },
  64: {
    docId: "D14",
    blocks: [
      { t: "title", text: "CATATAN UJI SILANG SERASI / PEMBERIAN DARAH" },
      {
        t: "table",
        cols: ["Tgl", "Jenis", "Volume", "Gol.", "Hasil", "Diberikan"],
        rows: [{ rid: "p64-crossmatch", cells: ["26-02", "PRC (leukoreduced)", "258 mL", "A+", "Compatible", ""] }],
      },
      { t: "foot", text: "Kolom pemberian / transfusi kosong" },
    ],
  },
  67: {
    docId: "D15",
    blocks: [
      head("Laboratorium"),
      label("Tgl. Selesai 03-03-2026 15:24"),
      { t: "sub", text: "HEMATOLOGI" },
      {
        t: "table",
        cols: LAB_COLS,
        rows: [
          { rid: "p67-hb", cells: ["Hemoglobin", "L 10.3", "g/dL", "11.7 - 15.5"] },
          { rid: "p67-hct", cells: ["Hematokrit", "L 32", "%", "35 - 47"] },
          { rid: "p67-wbc", cells: ["Leukosit", "7.9", "10^3/uL", "4.5 - 11.0"] },
          { rid: "p67-plt", cells: ["Trombosit", "372", "10^3/uL", "150 - 400"] },
        ],
      },
      { t: "sub", text: "KIMIA KLINIK" },
      { t: "table", cols: LAB_COLS, rows: [{ rid: "p67-alb", cells: ["Albumin", "3.7", "g/dL", "3.5 - 5.2"] }] },
      { t: "foot", text: "Waktu pengambilan spesimen : 03-03-2026 14:11" },
    ],
  },
  68: {
    docId: "D15",
    blocks: [
      head("Laboratorium"),
      label("Waktu pengambilan spesimen 28-02-2026 08:12"),
      { t: "sub", text: "HEMATOLOGI" },
      {
        t: "table",
        cols: LAB_COLS,
        rows: [
          { rid: "p68-hb", cells: ["Hemoglobin", "L 11.1", "g/dL", "11.7 - 15.5"] },
          { rid: "p68-hct", cells: ["Hematokrit", "35", "%", "35 - 47"] },
          { rid: "p68-wbc", cells: ["Leukosit", "H 12.5", "10^3/uL", "4.5 - 11.0"] },
          { rid: "p68-plt", cells: ["Trombosit", "400", "10^3/uL", "150 - 400"] },
        ],
      },
      { t: "sub", text: "KIMIA KLINIK" },
      {
        t: "table",
        cols: LAB_COLS,
        rows: [
          { rid: "p68-alb", cells: ["Albumin", "L 3.1", "g/dL", "3.5 - 5.2"] },
          { rid: "p68-lytes", cells: ["Natrium / Kalium / Klorida", "139 / 3.7 / 103", "mEq/L", "136-146 / 3.5-5.1 / 98-106"] },
        ],
      },
    ],
  },
  69: {
    docId: "D15",
    blocks: [
      head("Laboratorium rujukan"),
      label("Darah beku 26/02/2026 08:30"),
      { t: "sub", text: "ENDOKRINOLOGI" },
      { t: "table", cols: LAB_COLS, rows: [{ rid: "p69-cortisol", cells: ["Cortisol Serum Pagi", "< 0.6 *", "ug/dL", "3.7 - 19.4"] }] },
      { t: "foot", text: "Tanda * menunjukkan nilai di atas atau di bawah nilai rujukan" },
    ],
  },
  70: {
    docId: "D16",
    blocks: [
      head("Laboratorium"),
      label("Tgl. Permintaan 25-02-2026 09:32  |  Tgl. Selesai 25-02-2026 16:34"),
      { t: "sub", text: "HEMATOLOGI" },
      {
        t: "table",
        cols: LAB_COLS,
        rows: [
          { rid: "p70-hb", cells: ["Hemoglobin", "12.5", "g/dL", "11.7 - 15.5"] },
          { rid: "p70-hct", cells: ["Hematokrit", "38", "%", "35 - 47"] },
          { rid: "p70-wbc", cells: ["Leukosit", "H 12.3", "10^3/uL", "4.5 - 11.0"] },
          { rid: "p70-plt", cells: ["Trombosit", "H 452", "10^3/uL", "150 - 400"] },
        ],
      },
    ],
  },
  71: {
    docId: "D16",
    blocks: [
      {
        t: "table",
        cols: LAB_COLS,
        rows: [
          { rid: "p71-neut", cells: ["Neutrofil Segmen", "H 74", "%", "50 - 70"] },
          { rid: "p71-lymph", cells: ["Limfosit", "L 21", "%", "25 - 40"] },
          { rid: "p71-anc", cells: ["Neutrophil Count", "H 9.212", "10^3/uL", "1.70 - 7.50"] },
          { rid: "p71-esr", cells: ["Laju Endap Darah", "H 61", "mm/jam", "0 - 15"] },
          { rid: "p71-group", cells: ["Golongan Darah + Rhesus", "A / Positif", "", ""] },
        ],
      },
      { t: "foot", text: "Hal.: 1/3" },
    ],
  },
  72: {
    docId: "D16",
    blocks: [
      { t: "sub", text: "HEMOSTASIS" },
      {
        t: "table",
        cols: LAB_COLS,
        rows: [
          { rid: "p72-pt", cells: ["Masa Protrombin (Pasien) / INR", "13.2 / 0.96", "second", "11.7 - 15.1"] },
          { rid: "p72-aptt", cells: ["APTT Pasien", "28.1", "detik", "27.5 - 40.3"] },
        ],
      },
      { t: "sub", text: "KIMIA KLINIK" },
      {
        t: "table",
        cols: LAB_COLS,
        rows: [
          { rid: "p72-alb", cells: ["Albumin", "4.1", "g/dL", "3.5 - 5.2"] },
          { rid: "p72-lytes", cells: ["Natrium / Kalium / Klorida", "141 / 3.9 / 102", "mEq/L", "136-146 / 3.5-5.1 / 98-106"] },
          { rid: "p72-urea", cells: ["Ureum", "L 13", "mg/dL", "17 - 48"] },
          { rid: "p72-creat", cells: ["Kreatinin", "L 0.44", "mg/dL", "0.51 - 0.95"] },
          { rid: "p72-egfr", cells: ["eGFR (CKD-EPI)", "116.1", "mL/min/1.73 m2", ">= 90"] },
        ],
      },
    ],
  },
  73: {
    docId: "D16",
    blocks: [
      label("DATE 28.10.2026  |  Sample : Golongan Darah"),
      { t: "kv", rid: "p73-group", k: "GOLONGAN DARAH / Rh", v: "A  Rh.Pos" },
      { t: "img", rid: "p73-card", kind: "photo", caption: "Blood group card: anti A, anti B, anti AB, anti Rh" },
    ],
  },
  74: {
    docId: "D17",
    blocks: [
      head("Instalasi Radiologi"),
      label("Pemeriksaan : THORAX AP/PA  |  25-02-2026 13:04"),
      { t: "kv", k: "Klinis", v: "tumor pelvis susp lipoma dd liposarkoma" },
      { t: "kv", rid: "p74-cxr", k: "Foto thorax", v: "Ukuran jantung normal. Hilus paru dan bayangan mediastinum normal. Tidak tampak bercak alveolar di kedua lapangan paru. Diafragma dan sinus paru normal." },
      { t: "kv", rid: "p74-cxr-imp", k: "Kesimpulan", v: "Ukuran jantung normal. Tidak tampak gambaran pneumonia saat ini." },
      { t: "sig", text: "Radiologist" },
      { t: "kv", rid: "p74-ecg", k: "ECG 02/25/26 10:10", v: "Rate: 80. Sinus rhythm, normal P axis. Baseline wander. PR 163  QRSD 94  QT 393  QTcB 454" },
    ],
  },
  75: {
    docId: "D17",
    blocks: [
      label("12 Leads; Standard Placement"),
      { t: "img", rid: "p75-ecg", kind: "ecg", caption: "12-lead ECG printout, 25 mm/sec" },
      { t: "kv", rid: "p75-read", k: "Machine read", v: "- NORMAL ECG -   Unconfirmed Diagnosis" },
    ],
  },
};

/* --------------------------------------------------------------- findings */
// cite = { page, rid } is where the value was read. also = other places that
// say the same thing. hold = too unclear to show a doctor before review.

const f = (o) => ({ flags: [], handwritten: false, ...o });
const DISCHARGE = "On discharge (04 Mar'26)";
const HOME = "At home";

const findings = [
  // Diagnoses
  f({ id: "dx1", domain: "DX", encounterId: "E1", title: "Soft-tissue tumour, intra-abdominal", detail: "Final diagnosis as written · the rest of the line could not be read · no histology in the file", verbatim: "Tumor jaringan lunak intraabdomen/iklum c/o/1 peletakan K2 buli", certainty: "as written", coding: "ICD-10 D21.4 (written on the face sheet)", since: "Feb 2026", dateLabel: "Mar 2026", cite: { page: 3, rid: "p3-dx-main" }, confidence: 0.62, handwritten: true, flags: ["partlyRead"] }),
  f({ id: "dx2", domain: "DX", encounterId: "E1", title: "Lipoma or liposarcoma", detail: "Working diagnosis · suspected, not confirmed", verbatim: "Massa intraabdomen dan pelvis susp lipoma dd liposarkoma", certainty: "suspected", since: "Feb 2026", dateLabel: "Feb 2026", cite: { page: 2, rid: "p2-working" }, also: [{ page: 18, rid: "p18-dx" }], confidence: 0.9, handwritten: true, flags: ["suspected"] }),
  f({ id: "dx3", domain: "DX", encounterId: "E1", title: "Rheumatoid arthritis", detail: "Secondary diagnosis · also in past history", verbatim: "Rheumatoid arthritis", certainty: "confirmed", since: "before 2026", dateLabel: "Past history", cite: { page: 3, rid: "p3-dx-3" }, also: [{ page: 2, rid: "p2-past" }], confidence: 0.92, handwritten: true }),
  f({ id: "dx4", domain: "DX", encounterId: "E1", title: "Hypercoagulable state", detail: "Secondary diagnosis · also in past history", verbatim: "Hiperkoagulasi", certainty: "confirmed", since: "before 2026", dateLabel: "Past history", cite: { page: 3, rid: "p3-dx-4" }, also: [{ page: 2, rid: "p2-past" }], confidence: 0.86, handwritten: true }),
  f({ id: "dx5", domain: "DX", encounterId: "E1", title: "Hypoalbuminaemia", detail: "Secondary diagnosis · albumin 3.1 on 28 Feb", verbatim: "Hipoalbumin", certainty: "confirmed", since: "Feb 2026", dateLabel: "Mar 2026", cite: { page: 3, rid: "p3-dx-2" }, confidence: 0.88, handwritten: true }),
  f({ id: "dx6", domain: "DX", encounterId: "E1", hold: true, title: "Face sheet: principal diagnosis (unclear)", detail: "Handwriting could not be read reliably. The code D21.4 is legible.", verbatim: "Tumor kista hati metastasis liver cancer   D21.4", certainty: "unclear", since: "Feb 2026", dateLabel: "Mar 2026", cite: { page: 1, rid: "p1-dx-main" }, confidence: 0.31, handwritten: true, flags: ["lowConfidence"] }),
  f({ id: "dx7", domain: "DX", encounterId: "E1", hold: true, title: "Face sheet: secondary diagnosis and complication (unclear)", detail: "Handwriting could not be read reliably.", verbatim: "Penyakit hati buli. Hipalbuminemia. Pleurotaid effusions / Hypercalcemia", certainty: "unclear", since: "Feb 2026", dateLabel: "Mar 2026", cite: { page: 2, rid: "p2-dx-sec" }, confidence: 0.28, handwritten: true, flags: ["lowConfidence"] }),

  // Allergies
  f({ id: "alg1", domain: "ALG", encounterId: "E1", negative: true, title: "No drug allergy", detail: "Written as none on 3 pages", verbatim: "DAFTAR ALERGI OBAT : Tidak ada.", dateLabel: "Feb 2026", cite: { page: 42, rid: "p42-allergy" }, also: [{ page: 45, rid: "p45-allergy" }, { page: 3, rid: "p3-allergy" }], confidence: 0.95, handwritten: true, verifyLabel: "Confirm none", rejectLabel: "Don't record" }),

  // Medications on discharge
  f({ id: "med1", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Alganax 0.5 mg", detail: "1x1 · PO · qty 40", verbatim: "Alganax  0,5 mg  1x1  PO  40", cite: { page: 4, rid: "p4-med-1" }, confidence: 0.86, handwritten: true }),
  f({ id: "med2", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Nexium 40 mg", detail: "1x1 · PO · qty 7", verbatim: "Nexium  40 mg  1x1  PO  7", cite: { page: 4, rid: "p4-med-2" }, confidence: 0.93, handwritten: true }),
  f({ id: "med3", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Dexyclav 500 mg", detail: "3x1 · PO · qty 19", verbatim: "Dexyclav  500 mg  3x1  PO  19", cite: { page: 4, rid: "p4-med-3" }, confidence: 0.8, handwritten: true }),
  f({ id: "med4", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Acetram", detail: "3x1 · PO · qty 29 · no strength written", verbatim: "Acetram  3x1  PO  29", cite: { page: 4, rid: "p4-med-4" }, confidence: 0.78, handwritten: true }),
  f({ id: "med5", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Cliad", detail: "1x1 · PO · qty 30 · no strength written", verbatim: "Cliad  1x1  PO  30", cite: { page: 4, rid: "p4-med-5" }, confidence: 0.7, handwritten: true }),
  f({ id: "med6", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Vometa FT", detail: "when needed · PO · qty 10", verbatim: "VOMeta FT  K/P  PO  10", cite: { page: 4, rid: "p4-med-6" }, confidence: 0.86, handwritten: true }),
  f({ id: "med7", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Codipront", detail: "when needed, max 3x1 · PO · qty 30", verbatim: "Codipront  K/P, max 3 x 1  PO  30", cite: { page: 4, rid: "p4-med-7" }, confidence: 0.85, handwritten: true }),
  f({ id: "med8", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Fartison 20 mg", detail: "1 x 2 tab · PO · qty 10 · the dose can be read two ways · also taken to theatre as steroid cover", verbatim: "Fartison  20 mg  1 x 2 tab  PO  10", cite: { page: 4, rid: "p4-med-8" }, also: [{ page: 37, rid: "p37-steroid" }], confidence: 0.72, handwritten: true, flags: ["ambiguous"] }),
  f({ id: "med9", domain: "MED", encounterId: "E1", group: DISCHARGE, title: "Brix-a 5 mg", detail: "1x1 · home medicine · stopped from 23 Feb 2026 before surgery · note of 2 Mar allows restart next morning", verbatim: "Brix-a  5 mg  1x1 / stop brixia sejak 23/02/26 / brixa boleh mulai lagi besok pagi", cite: { page: 4, rid: "p4-med-9" }, also: [{ page: 36, rid: "p36-brixa" }, { page: 8, rid: "p8-note" }, { page: 45, rid: "p45-home-1" }], confidence: 0.82, handwritten: true }),
  // Home medicines
  f({ id: "med10", domain: "MED", encounterId: "E1", group: HOME, title: "Omega 3", detail: "1-2 capsules a day", verbatim: "Omega 3  1-2 kapsul / hari", cite: { page: 45, rid: "p45-home-2" }, confidence: 0.9, handwritten: true }),
  f({ id: "med11", domain: "MED", encounterId: "E1", group: HOME, title: "Flaxseed oil softgel", detail: "1-2 capsules a day", verbatim: "Flaxseed oil Softgel  1-2 kapsul / hari", cite: { page: 45, rid: "p45-home-3" }, confidence: 0.9, handwritten: true }),
  f({ id: "med12", domain: "MED", encounterId: "E1", group: HOME, title: "Vitamin D3 K2 5000 IU", detail: "1x1", verbatim: "Vit D3 K2 5000 IU  1x1", cite: { page: 45, rid: "p45-home-4" }, confidence: 0.88, handwritten: true }),
  f({ id: "med13", domain: "MED", encounterId: "E1", group: HOME, title: "Magnesium", detail: "1x2 tabs", verbatim: "Magnesium  1x2 tabs", cite: { page: 45, rid: "p45-home-5" }, confidence: 0.88, handwritten: true }),
  f({ id: "med14", domain: "MED", encounterId: "E1", group: HOME, title: "Trilac injection", detail: "every 2 weeks · last on 23 Feb 2026", verbatim: "Trilac injeksi  Tiap 2 minggu  terakhir 23/02/2026", cite: { page: 45, rid: "p45-home-7" }, confidence: 0.82, handwritten: true }),
  f({ id: "med15", domain: "MED", encounterId: "E1", group: HOME, hold: true, title: "Sixth home medicine (two readings)", detail: "Read as Pancreol OSTEO on the reconciliation form and as Panadol on the drug chart", verbatim: "Pancreol OSTEO  1x1 k/p  /  6. Panadol 1x1", cite: { page: 45, rid: "p45-home-6" }, also: [{ page: 43, rid: "p43-home-6" }], confidence: 0.45, handwritten: true, flags: ["lowConfidence"] }),
  // Given in hospital: the ones a later doctor needs to know about
  f({ id: "medh1", domain: "MED", encounterId: "E1", group: "In hospital", title: "Hydrocortisone 100 mg IV", detail: "During surgery · 27 Feb 2026, 08:10", verbatim: "08.10 -> Hidrocortison 100 mg IV", cite: { page: 39, rid: "p39-hydrocortisone" }, confidence: 0.9, handwritten: true }),
  f({ id: "medh2", domain: "MED", encounterId: "E1", group: "In hospital", title: "Cefazolin 2 g", detail: "Pre-operative antibiotic · 27 Feb 2026, 05:40", verbatim: "AB, Cefazolin 2 gr 0540", cite: { page: 33, rid: "p33-ab" }, also: [{ page: 16, rid: "p16-ab" }], confidence: 0.78, handwritten: true, flags: ["conflict"], conflictWith: { text: "The drug chart is read as Cefotaxim 2 g pre-op", page: 43, rid: "p43-ab" }, verifyLabel: "Confirm cefazolin", rejectLabel: "Don't record" }),
  f({ id: "medh3", domain: "MED", encounterId: "E1", group: "In hospital", title: "Ketorolac 60 mg IV", detail: "End of surgery · 27 Feb 2026, 09:40", verbatim: "09.40 -> Ketorolac 60 mg IV", cite: { page: 39, rid: "p39-ketorolac" }, confidence: 0.86, handwritten: true }),


  // Procedures
  f({ id: "proc1", domain: "PROC", encounterId: "E1", title: "Laparotomy with tumour excision", detail: "27 Feb 2026 · GA with epidural · joint operation: urology, digestive surgery, ob-gyn · surgery 2 h 10 min", verbatim: "(Operasi ekar) tumor + resek (n/lt)", dateLabel: "27 Feb 2026", cite: { page: 3, rid: "p3-proc-2" }, also: [{ page: 28, rid: "p28-consent" }, { page: 39, rid: "p39-duration" }], confidence: 0.8, handwritten: true }),
  f({ id: "proc2", domain: "PROC", encounterId: "E1", title: "Cystoscopy with right ureteric catheter insertion", detail: "27 Feb 2026 · urology, 08:02 to 08:20 · consent also covers a right DJ stent if needed", verbatim: "Cystoscopy Evaluasi pasang UK", dateLabel: "27 Feb 2026", cite: { page: 34, rid: "p34-cysto" }, also: [{ page: 25, rid: "p25-consent" }, { page: 3, rid: "p3-proc-1" }, { page: 39, rid: "p39-times" }], confidence: 0.84 }),
  f({ id: "proc3", domain: "PROC", encounterId: "E1", title: "Hysterectomy", detail: "Past surgery · date not written", verbatim: "r/n. histerektomi", dateLabel: "Past history", cite: { page: 2, rid: "p2-past" }, confidence: 0.74, handwritten: true }),

  // Labs. `series` is oldest to newest; the headline value is the newest.
  f({ id: "lab1", domain: "LAB", encounterId: "E1", title: "Haemoglobin", value: "10.3", unit: "g/dL", range: "11.7 - 15.5", abnormal: "L", dateLabel: "3 Mar 2026", series: [{ d: "25 Feb", v: "12.5" }, { d: "28 Feb", v: "11.1", f: "L" }, { d: "3 Mar", v: "10.3", f: "L" }], verbatim: "Hemoglobin  L 10.3  g/dL  11.7 - 15.5", cite: { page: 67, rid: "p67-hb" }, also: [{ page: 68, rid: "p68-hb" }, { page: 70, rid: "p70-hb" }], confidence: 0.98 }),
  f({ id: "lab2", domain: "LAB", encounterId: "E1", title: "Leukocytes", value: "7.9", unit: "10^3/uL", range: "4.5 - 11.0", abnormal: "", dateLabel: "3 Mar 2026", series: [{ d: "25 Feb", v: "12.3", f: "H" }, { d: "28 Feb", v: "12.5", f: "H" }, { d: "3 Mar", v: "7.9" }], verbatim: "Leukosit  7.9  10^3/uL  4.5 - 11.0", cite: { page: 67, rid: "p67-wbc" }, also: [{ page: 68, rid: "p68-wbc" }, { page: 70, rid: "p70-wbc" }], confidence: 0.98 }),
  f({ id: "lab3", domain: "LAB", encounterId: "E1", title: "Albumin", value: "3.7", unit: "g/dL", range: "3.5 - 5.2", abnormal: "", dateLabel: "3 Mar 2026", series: [{ d: "25 Feb", v: "4.1" }, { d: "28 Feb", v: "3.1", f: "L" }, { d: "3 Mar", v: "3.7" }], verbatim: "Albumin  3.7  g/dL  3.5 - 5.2", cite: { page: 67, rid: "p67-alb" }, also: [{ page: 68, rid: "p68-alb" }, { page: 72, rid: "p72-alb" }], confidence: 0.98 }),
  f({ id: "lab4", domain: "LAB", encounterId: "E1", title: "Platelets", value: "372", unit: "10^3/uL", range: "150 - 400", abnormal: "", dateLabel: "3 Mar 2026", series: [{ d: "25 Feb", v: "452", f: "H" }, { d: "28 Feb", v: "400" }, { d: "3 Mar", v: "372" }], verbatim: "Trombosit  372  10^3/uL  150 - 400", cite: { page: 67, rid: "p67-plt" }, also: [{ page: 68, rid: "p68-plt" }, { page: 70, rid: "p70-plt" }], confidence: 0.98 }),
  f({ id: "lab6", domain: "LAB", encounterId: "E1", title: "Sodium / Potassium / Chloride", value: "139 / 3.7 / 103", unit: "mEq/L", range: "136-146 / 3.5-5.1 / 98-106", abnormal: "", dateLabel: "28 Feb 2026", series: [{ d: "25 Feb", v: "141 / 3.9 / 102" }, { d: "28 Feb", v: "139 / 3.7 / 103" }], verbatim: "Natrium 139, Kalium 3.7, Klorida 103 mEq/L", cite: { page: 68, rid: "p68-lytes" }, also: [{ page: 72, rid: "p72-lytes" }], confidence: 0.97 }),
  f({ id: "lab13", domain: "LAB", encounterId: "E1", title: "Haematocrit", value: "32", unit: "%", range: "35 - 47", abnormal: "L", dateLabel: "3 Mar 2026", series: [{ d: "25 Feb", v: "38" }, { d: "28 Feb", v: "35" }, { d: "3 Mar", v: "32", f: "L" }], verbatim: "Hematokrit  L 32  %  35 - 47", cite: { page: 67, rid: "p67-hct" }, also: [{ page: 68, rid: "p68-hct" }, { page: 70, rid: "p70-hct" }], confidence: 0.98 }),
  f({ id: "lab5", domain: "LAB", encounterId: "E1", title: "Cortisol, morning serum", value: "< 0.6", unit: "ug/dL", range: "3.7 - 19.4", abnormal: "L", dateLabel: "26 Feb 2026", verbatim: "Cortisol Serum Pagi  < 0.6 *  ug/dL  3.7 - 19.4", cite: { page: 69, rid: "p69-cortisol" }, confidence: 0.97 }),
  f({ id: "lab7", domain: "LAB", encounterId: "E0", title: "ESR", value: "61", unit: "mm/hr", range: "0 - 15", abnormal: "H", dateLabel: "25 Feb 2026", verbatim: "Laju Endap Darah  H 61  mm/jam  0 - 15", cite: { page: 71, rid: "p71-esr" }, confidence: 0.98 }),
  f({ id: "lab14", domain: "LAB", encounterId: "E0", title: "Segmented neutrophils", value: "74", unit: "%", range: "50 - 70", abnormal: "H", dateLabel: "25 Feb 2026", verbatim: "Neutrofil Segmen  H 74  %  50 - 70", cite: { page: 71, rid: "p71-neut" }, confidence: 0.98 }),
  f({ id: "lab15", domain: "LAB", encounterId: "E0", title: "Neutrophil count", value: "9.212", unit: "10^3/uL", range: "1.70 - 7.50", abnormal: "H", dateLabel: "25 Feb 2026", verbatim: "Neutrophil Count  H 9.212  10^3/uL  1.70 - 7.50", cite: { page: 71, rid: "p71-anc" }, confidence: 0.98 }),
  f({ id: "lab16", domain: "LAB", encounterId: "E0", title: "Lymphocytes", value: "21", unit: "%", range: "25 - 40", abnormal: "L", dateLabel: "25 Feb 2026", verbatim: "Limfosit  L 21  %  25 - 40", cite: { page: 71, rid: "p71-lymph" }, confidence: 0.98 }),
  f({ id: "lab17", domain: "LAB", encounterId: "E0", title: "Urea", value: "13", unit: "", range: "17 - 48", abnormal: "L", dateLabel: "25 Feb 2026", verbatim: "Ureum  L 13  17 - 48  (unit not printed)", cite: { page: 72, rid: "p72-urea" }, confidence: 0.96 }),
  f({ id: "lab8", domain: "LAB", encounterId: "E0", title: "Creatinine", value: "0.44", unit: "mg/dL", range: "0.51 - 0.95", abnormal: "L", dateLabel: "25 Feb 2026", verbatim: "Kreatinin  L 0.44  mg/dL  0.51 - 0.95", cite: { page: 72, rid: "p72-creat" }, confidence: 0.98 }),
  f({ id: "lab9", domain: "LAB", encounterId: "E0", title: "eGFR (CKD-EPI)", value: "116.1", unit: "mL/min/1.73 m2", range: ">= 90", abnormal: "", dateLabel: "25 Feb 2026", verbatim: "eGFR (CKD-EPI)  116.1", cite: { page: 72, rid: "p72-egfr" }, confidence: 0.96 }),
  f({ id: "lab10", domain: "LAB", encounterId: "E0", title: "PT / INR", value: "13.2 / 0.96", unit: "sec", range: "11.7 - 15.1", abnormal: "", dateLabel: "25 Feb 2026", verbatim: "Masa Protrombin (Pasien) 13.2 second, INR 0.96", cite: { page: 72, rid: "p72-pt" }, confidence: 0.97 }),
  f({ id: "lab11", domain: "LAB", encounterId: "E0", title: "APTT", value: "28.1", unit: "sec", range: "27.5 - 40.3", abnormal: "", dateLabel: "25 Feb 2026", verbatim: "APTT Pasien  28.1  detik  27.5 - 40.3", cite: { page: 72, rid: "p72-aptt" }, confidence: 0.97 }),
  f({ id: "lab12", domain: "LAB", encounterId: "E0", title: "Blood group", value: "A, Rh positive", unit: "", range: "", abnormal: "", dateLabel: "25 Feb 2026", verbatim: "Golongan Darah A, Rhesus Faktor Positif", cite: { page: 71, rid: "p71-group" }, also: [{ page: 73, rid: "p73-group" }], confidence: 0.98 }),

  // Vitals
  f({ id: "vit1", domain: "VIT", encounterId: "E1", title: "At discharge", detail: "BP 102/74 · Pulse 72 · SpO2 98% · Temp 36.6 C · RR 18 · GCS 15", dateLabel: "4 Mar 2026", verbatim: "GCS : 15  Tensi 102/74  Nadi 72  Respirasi 18  Suhu 36,6  SpO2 98", cite: { page: 3, rid: "p3-discharge" }, confidence: 0.88, handwritten: true }),
  f({ id: "vit2", domain: "VIT", encounterId: "E1", title: "Recovery room", detail: "BP 135/81 · Pulse 63 · SpO2 100% · Temp 35.7 C · Pain 2", dateLabel: "27 Feb 2026", verbatim: "Tekanan darah 135/81 mmHg  Nadi 63 x/m  Temperatur 35.7 C  SpO2 100%  Skor nyeri 2", cite: { page: 35, rid: "p35-rr" }, confidence: 0.84, handwritten: true }),
  f({ id: "vit3", domain: "VIT", encounterId: "E1", title: "Admission examination", detail: "BP 142/97 · Pulse 96 · SpO2 98% · Temp 36.6 C · RR 12", dateLabel: "undated", verbatim: "BP 142/97  HR 96  RR 12  SpO2 98  T 36,6", cite: { page: 3, rid: "p3-exam" }, confidence: 0.88, handwritten: true }),
  f({ id: "vit4", domain: "VIT", encounterId: "E1", title: "Before surgery", detail: "Wt 58 kg · Ht 161 cm", dateLabel: "27 Feb 2026", verbatim: "BB: 58 kg. TB: 161", cite: { page: 32, rid: "p32-body" }, confidence: 0.8, handwritten: true }),

  // Reports and notes
  f({ id: "rpt1", group: "Course", domain: "RPT", encounterId: "E1", title: "Presenting complaint", detail: "Interrupted, frequent urination and constipation. MRI showed a lump pressing on the urinary tract.", verbatim: "BAK tersendat-sendat, frekuensi sering. BAB sulit. Dari hasil MRI diketahui ada benjolan menekan ke saluran kemih", dateLabel: "26 Feb 2026", cite: { page: 2, rid: "p2-history" }, confidence: 0.86, handwritten: true }),
  f({ id: "rpt2", group: "Course", domain: "RPT", encounterId: "E1", title: "Discharge date", detail: "4 Mar 2026 on the discharge summary and the discharge permit.", verbatim: "Tanggal Keluar / Date of discharged : 4 / 03 / 2026", dateLabel: "4 Mar 2026", cite: { page: 2, rid: "p2-dates" }, also: [{ page: 6, rid: "p6-permit" }], confidence: 0.8, handwritten: true, flags: ["conflictingValue"], conflictWith: { text: "Face sheet is read as 09/03/2026", page: 1, rid: "p1-discharge" }, verifyLabel: "Confirm 4 Mar", rejectLabel: "Don't record" }),
  f({ id: "rpt3", group: "Course", domain: "RPT", encounterId: "E1", title: "Condition at discharge", detail: "Stable, conscious. Sent home for outpatient follow-up.", verbatim: "Keadaan Umum : Stabil  Kesadaran : CM. [x] Dapat berobat jalan", dateLabel: "4 Mar 2026", cite: { page: 3, rid: "p3-discharge" }, also: [{ page: 3, rid: "p3-reason" }], confidence: 0.88, handwritten: true }),
  f({ id: "rpt4", group: "Course", domain: "RPT", encounterId: "E1", title: "Follow-up planned", detail: "Wed 11 Mar 2026: urologist 9 am, digestive surgeon 4 pm. Keep the dressing clean and dry.", verbatim: "Rabu, 11/03-2026 Jam 16 / Jam 09. Jaga balutan agar tetap bersih dan kering.", dateLabel: "11 Mar 2026", cite: { page: 5, rid: "p5-fu-1" }, also: [{ page: 5, rid: "p5-advice" }], confidence: 0.84, handwritten: true }),
  f({ id: "rpt5", group: "Course", domain: "RPT", encounterId: "E1", title: "Medicines given in hospital", detail: "22 names are listed by hand and several are unclear. Readable ones include Cefazolin, Maxicef, Maxigesic, Fentanyl, Xanax, Lasix, Doxycyclin and Ropivell.", verbatim: "Efisol, Xanax, Aminolylte perifer, Adona forte, Acetam, Cefazolin, Maxicef, Maxigesic, Fentanyl, Farkson, Vomizole, Kelessse, Narfoz, Octaserum, Micovax, Antiten, Arcolase, Ropivell, Doxycyclin, glisenn, Lasix, Codapont", dateLabel: "26 Feb to 4 Mar 2026", cite: { page: 3, rid: "p3-inhosp" }, confidence: 0.6, handwritten: true }),
  f({ id: "rpt6", group: "Investigations", domain: "RPT", encounterId: "E0", title: "Chest X-ray", detail: "Normal heart size. No sign of pneumonia.", verbatim: "Kesimpulan : Ukuran jantung normal. Tidak tampak gambaran pneumonia saat ini.", dateLabel: "25 Feb 2026", cite: { page: 74, rid: "p74-cxr-imp" }, confidence: 0.96 }),
  f({ id: "rpt7", group: "Investigations", domain: "RPT", encounterId: "E0", title: "ECG", detail: "Sinus rhythm, rate 80. PR 163, QRS 94, QT 393, QTc 454 ms. Machine read: normal ECG (unconfirmed).", verbatim: "Rate: 80. Sinus rhythm, normal P axis. PR 163 QRSD 94 QT 393 QTcB 454. - NORMAL ECG - Unconfirmed Diagnosis", dateLabel: "25 Feb 2026", cite: { page: 74, rid: "p74-ecg" }, also: [{ page: 75, rid: "p75-read" }], confidence: 0.95 }),
  f({ id: "rpt8", group: "Keep in mind", domain: "RPT", encounterId: "E1", title: "Blood products", detail: "1 unit of packed red cells (258 mL, A+) was cross-matched and compatible. No transfusion is recorded: the given column and the fluid-chart transfusion fields are blank.", verbatim: "26-02  PRC  258  A+  Comp", dateLabel: "26 Feb 2026", cite: { page: 64, rid: "p64-crossmatch" }, also: [{ page: 32, rid: "p32-blood" }], confidence: 0.85 }),
  f({ id: "rpt9", group: "Keep in mind", domain: "RPT", encounterId: "E1", title: "Steroid use noted", detail: "Long-term triamcinolone use is written in the education record, and regular injections for RA are noted before anaesthesia.", verbatim: "pasien lama memakai triamsinolon / Rutin suntik utk RA. (autoimun)", dateLabel: "Feb 2026", cite: { page: 16, rid: "p16-steroid" }, also: [{ page: 36, rid: "p36-ra" }], confidence: 0.7, handwritten: true }),
  f({ id: "rpt10", group: "Surgery", domain: "RPT", encounterId: "E1", title: "Anaesthesia", detail: "ASA 2. GA (propofol, rocuronium, ETT 7.9) with epidural at L3-L4 (ropivacaine), total block. Anaesthesia time 2 h 30 min.", verbatim: "ASA 1 (2) 3 4 5 E. Perencanaan: GA. Epidural. Lokasi : L3-L4. Lama Sedasi/Anestesi : 2 jam 30 menit", dateLabel: "27 Feb 2026", cite: { page: 38, rid: "p38-ga" }, also: [{ page: 36, rid: "p36-asa" }, { page: 39, rid: "p39-duration" }], confidence: 0.8, handwritten: true }),
  f({ id: "rpt11", group: "Course", domain: "RPT", encounterId: "E1", title: "Progress note", detail: "Glycerin enema allowed. May go home once bowels have opened. Soft diet from the next day.", verbatim: "boleh klisma gliserin. boleh pulang jika sudah BAB. besok boleh diet BBLC.", dateLabel: "2 Mar 2026", cite: { page: 8, rid: "p8-note" }, confidence: 0.78, handwritten: true }),
  f({ id: "rpt12", group: "Course", domain: "RPT", encounterId: "E1", title: "Devices at discharge", detail: "None ticked: no IV line, oxygen, urinary catheter, NG tube, central line or drain.", verbatim: "[ ] Infus [ ] O2 [ ] Kateter [ ] NGT [ ] CVC [ ] Drain", dateLabel: "4 Mar 2026", cite: { page: 3, rid: "p3-devices" }, confidence: 0.9 }),
  f({ id: "rpt13", group: "Surgery", domain: "RPT", encounterId: "E1", title: "Specimen for pathology", detail: "The theatre checklist ticks both \"tissue labelled for pathology\" and \"no tissue\".", verbatim: "[x] Memberi identitas jaringan PA  [x] Tidak ada jaringan", dateLabel: "27 Feb 2026", cite: { page: 33, rid: "p33-specimen" }, confidence: 0.6, flags: ["conflictingValue"], verifyLabel: "Specimen was sent", rejectLabel: "Don't record" }),
  f({ id: "rpt14", group: "Surgery", domain: "RPT", encounterId: "E1", title: "Prognosis on consent", detail: "Written as dubia (uncertain).", verbatim: "Prognosis : dubia", dateLabel: "Feb 2026", cite: { page: 18, rid: "p18-prognosis" }, confidence: 0.8, handwritten: true }),
];

const images = [
  { id: "img1", kind: "angio", group: "Fluoroscopy", title: "Intra-operative fluoroscopy", dateLabel: "27 Feb 2026", page: 34, rid: "p34-fluoro", reportId: "proc2" },
  { id: "img2", kind: "scope", group: "Endoscopy", title: "Cystoscopy images", dateLabel: "27 Feb 2026", page: 34, rid: "p34-scope", reportId: "proc2" },
  { id: "img3", kind: "photo", group: "Photo", title: "Operative photographs", dateLabel: "27 Feb 2026", page: 35, rid: "p35-photos", reportId: "proc1", sensitive: true },
  { id: "img4", kind: "ecg", group: "ECG", title: "12-lead ECG", dateLabel: "25 Feb 2026", page: 75, rid: "p75-ecg", reportId: "rpt7" },
  { id: "img5", kind: "photo", group: "Lab", title: "Blood group card", dateLabel: "25 Feb 2026", page: 73, rid: "p73-card", reportId: "lab12" },
];

const exceptions = [
  {
    id: "ex1",
    kind: "conflictingValue",
    title: "Two discharge dates in the file",
    body: "The discharge summary and the discharge permit say 4 Mar 2026. The face sheet is read as 09/03/2026. 4 Mar is shown until you decide.",
    findingId: "rpt2",
    cites: [
      { label: "Discharge summary", page: 2, rid: "p2-dates" },
      { label: "Face sheet", page: 1, rid: "p1-discharge" },
    ],
  },
  {
    id: "ex2",
    kind: "lowConfidence",
    title: "Face sheet diagnosis could not be read",
    body: "The handwritten diagnosis lines on the face sheet were read with very low confidence and do not match the discharge summary. They are held back from the doctor's view.",
    findingId: "dx6",
    cites: [
      { label: "Face sheet", page: 1, rid: "p1-dx-main" },
      { label: "Face sheet, continued", page: 2, rid: "p2-dx-sec" },
    ],
  },
  {
    id: "ex3",
    kind: "conflict",
    title: "Three names for the pre-operative antibiotic",
    body: "The theatre checklist and the education record say Cefazolin 2 g. The drug chart is read as Cefotaxim 2 g and the anaesthesia sheet lists Ceftriaxone. Cefazolin is shown until you decide.",
    findingId: "medh2",
    cites: [
      { label: "Safety checklist", page: 33, rid: "p33-ab" },
      { label: "Drug chart", page: 43, rid: "p43-ab" },
    ],
  },
  {
    id: "ex4",
    kind: "lowConfidence",
    title: "One home medicine is read two ways",
    body: "The sixth home medicine is read as \"Pancreol OSTEO\" on the reconciliation form and as \"Panadol\" on the drug chart. It is held back from the doctor's view.",
    findingId: "med15",
    cites: [
      { label: "Medication reconciliation", page: 45, rid: "p45-home-6" },
      { label: "Drug chart", page: 43, rid: "p43-home-6" },
    ],
  },
  {
    id: "ex6",
    kind: "lowConfidence",
    title: "Final diagnosis line is only partly readable",
    body: "\"Tumor jaringan lunak intraabdomen\" is clear. The rest of the handwritten line could not be read, so no site or extent is shown beyond that.",
    findingId: "dx1",
    cites: [{ label: "Discharge summary", page: 3, rid: "p3-dx-main" }],
  },
  {
    id: "ex7",
    kind: "conflictingValue",
    title: "Specimen ticks disagree",
    body: "The sign-out checklist ticks both \"tissue labelled for pathology\" and \"no tissue\". There is no histopathology report in the file.",
    findingId: "rpt13",
    cites: [{ label: "Safety checklist", page: 33, rid: "p33-specimen" }],
  },
  {
    id: "ex5",
    kind: "unreadable",
    title: "One page of progress notes not read",
    body: "Page 7 (doctor's handwritten progress notes) could not be read reliably. Page 8 was read in part.",
    findingId: null,
    cites: [{ label: "Progress notes", page: 7, rid: "p7-notes" }],
  },
];

// Things a doctor would expect in an admission like this that the reader did
// not find. Saying so is part of "no silent omission".
const notFound = [
  "Histopathology report of the excised tumour",
  "Operative note (findings, blood loss, what was removed)",
  "MRI report (the MRI is mentioned in the history only)",
  "Whether a ureteric catheter or stent was left in place",
  "Notes from urology, ob-gyn and the internist",
  "Wound status at discharge",
];

// Normal results that are in the file but not listed row by row.
const labsNotShown = {
  count: 9,
  encounterId: "E0",
  names: "MCV, MCH, MCHC, monocytes, lymphocyte count, red cell count, bleeding time, PT control, APTT control",
  cite: { page: 70, rid: "p70-hb" },
};

// **bold** marks the words the eye should land on. Every line cites.
const brief = [
  { text: "**Intra-abdominal soft-tissue tumour** (final diagnosis, partly readable). Working diagnosis **lipoma or liposarcoma (suspected)**. No histology in the file.", cites: ["dx1", "dx2"] },
  { text: "**Laparotomy with tumour excision** and **cystoscopy with right ureteric catheter** on **27 Feb 2026**, GA with epidural. Discharged stable on **4 Mar 2026**.", cites: ["proc1", "proc2", "rpt3"] },
  { text: "Keep in mind: **long-term steroid use** noted, **hydrocortisone 100 mg IV** in theatre, **morning cortisol below 0.6**. **Brix-a** was stopped from 23 Feb for surgery.", cites: ["rpt9", "medh1", "lab5", "med9"] },
  { text: "Background: **rheumatoid arthritis**, **hypercoagulable state**, past **hysterectomy**. **No drug allergy** recorded.", cites: ["dx3", "dx4", "proc3", "alg1"] },
  { text: "**Hb 12.5 to 10.3**; albumin dipped to 3.1 then 3.7. Went home on **9 medicines**; follow-up was due **11 Mar 2026**.", cites: ["lab1", "lab3", "med1", "rpt4"] },
];

const summary = [
  { text: "Admitted 26 February 2026 with interrupted, frequent urination and constipation. An MRI had shown a lump pressing on the urinary tract.", cites: ["rpt1"] },
  { text: "Working diagnosis was an intra-abdominal and pelvic mass, suspected lipoma or liposarcoma. The final diagnosis line reads as an intra-abdominal soft-tissue tumour; the rest of that line is not readable and there is no histology in the file.", cites: ["dx2", "dx1"] },
  { text: "On 27 February 2026, under GA with epidural, urology did a cystoscopy with right ureteric catheter insertion, followed by laparotomy with tumour excision as a joint operation.", cites: ["proc2", "proc1", "rpt10"] },
  { text: "Long-term steroid use is noted. Hydrocortisone 100 mg IV was given during surgery, and morning cortisol on the day of admission was below 0.6 ug/dL.", cites: ["rpt9", "medh1", "lab5"] },
  { text: "Brix-a 5 mg, a home medicine, was stopped from 23 February for surgery; a note on 2 March allows it to restart the next morning.", cites: ["med9"] },
  { text: "Secondary diagnoses: hypoalbuminaemia, rheumatoid arthritis and a hypercoagulable state. Past surgery: hysterectomy. No drug allergy is recorded, on three separate pages.", cites: ["dx5", "dx3", "dx4", "proc3", "alg1"] },
  { text: "Haemoglobin fell from 12.5 to 10.3 g/dL across the stay. One unit of red cells was cross-matched; no transfusion is recorded.", cites: ["lab1", "rpt8"] },
  { text: "Discharged stable on 4 March 2026 on nine medicines, with no lines, catheter or drain, and follow-up on 11 March 2026 with the urologist and the digestive surgeon.", cites: ["rpt3", "rpt12", "med1", "rpt4"] },
];

// The hospital course as dated events. Dates are as written in the file.
const timeline = [
  { id: "t1", date: "10 Feb", title: "Referred for admission", detail: "Suspected giant pelvic tumour. Laparotomy planned.", cite: { page: 6, rid: "p6-referral" }, type: "OPD" },
  { id: "t2", date: "25 Feb", title: "Pre-admission work-up", detail: "Blood tests, chest X-ray, ECG. Hb 12.5, ESR 61.", cite: { page: 70, rid: "p70-hb" }, type: "OPD" },
  { id: "t3", date: "26 Feb", title: "Admitted, 9:23 am", detail: "Digestive Surgery. Cortisol sample at 8:30 am, later reported below 0.6. Brix-a on hold since 23 Feb. One red-cell unit cross-matched.", cite: { page: 1, rid: "p1-admit" }, type: "IPD", encounterId: "E1" },
  { id: "t4", date: "27 Feb", title: "Surgery", detail: "Urology 8:02 to 8:20: cystoscopy, right ureteric catheter. Digestive surgery 8:33 to 9:50: laparotomy, tumour excision. GA with epidural. Hydrocortisone 100 mg IV. Recovery room at 10:15.", cite: { page: 39, rid: "p39-times" }, type: "IPD", encounterId: "E1", key: true },
  { id: "t5", date: "28 Feb", title: "Day 1 after surgery", detail: "Hb 11.1, leukocytes 12.5, albumin 3.1.", cite: { page: 68, rid: "p68-hb" }, type: "IPD", encounterId: "E1" },
  { id: "t6b", date: "2 Mar", title: "Evening note", detail: "Enema allowed. Brix-a may restart next morning. Home once bowels have opened.", cite: { page: 8, rid: "p8-note" }, type: "IPD", encounterId: "E1" },
  { id: "t6", date: "3 Mar", title: "Repeat bloods", detail: "Hb 10.3, leukocytes 7.9, albumin 3.7.", cite: { page: 67, rid: "p67-hb" }, type: "IPD", encounterId: "E1" },
  { id: "t7", date: "4 Mar", title: "Discharged", detail: "Stable, no lines or drain. Nine medicines. X-ray film and 5 lab sheets handed over.", cite: { page: 3, rid: "p3-discharge" }, type: "IPD", encounterId: "E1", key: true },
  { id: "t8", date: "11 Mar", title: "Follow-up was due", detail: "Urologist 9 am, digestive surgeon 4 pm.", cite: { page: 5, rid: "p5-fu-1" }, type: "Plan" },
];

// Canned answers for the "Ask" row. Real answers would come from Dr. Agent.
const questions = [
  { id: "q1", q: "What surgery was done?", a: "On 27 Feb 2026: cystoscopy with ureteric catheter placement, then laparotomy with tumour excision under general anaesthesia.", cites: ["proc2", "proc1"] },
  { id: "q2", q: "Any drug allergy?", a: "None recorded. The drug allergy list, the medication reconciliation form and the discharge summary all say none.", cites: ["alg1"] },
  { id: "q3", q: "How did haemoglobin move?", a: "12.5 g/dL before admission (25 Feb), 11.1 the day after surgery (28 Feb) and 10.3 on 3 Mar.", cites: ["lab1"] },
  { id: "q5", q: "Was blood transfused?", a: "No transfusion is recorded. One unit of packed red cells was cross-matched on 26 Feb and found compatible, but the given column is blank.", cites: ["rpt8"] },
  { id: "q4", q: "Is there a biopsy result?", a: "No histopathology report was found in this file. The tumour type is still written as suspected lipoma or liposarcoma.", cites: ["dx2"] },
];

// How each fact is written in the reading panel. House pattern, same as Past
// Visits and the Doctor Copilot summary guide: the name first, then ONE
// bracket of short qualifiers in a fixed order, no labels inside the bracket.
//   condition   (certainty, role, when)        Lipoma or liposarcoma (Suspected, Working dx, Feb'26)
//   procedure   (date, detail)                 Laparotomy with tumour excision (27 Feb'26, GA)
//   medicine    (frequency, route, quantity)   Nexium 40 mg (1x1, PO, Qty 7)
// Frequencies stay exactly as written on the page (1x1, 3x1). Nothing is
// converted to OD/BD or to slots, because that would be inferring.
const warn = (v) => ({ v, tone: "warning" });
const QUALS = {
  dx1: ["Final dx, as written", "Mar'26"],
  dx2: [warn("Suspected"), "Working dx", "Feb'26"],
  dx3: ["Secondary", "Past history"],
  dx4: ["Secondary", "Past history"],
  dx5: ["Secondary", "Mar'26"],
  alg1: ["Stated on 3 pages"],
  proc1: ["27 Feb'26", "GA + epidural", "2h 10m"],
  proc2: ["27 Feb'26", "Urology"],
  proc3: ["Past surgery"],
  med1: ["1x1", "PO", "Qty 40"],
  med2: ["1x1", "PO", "Qty 7"],
  med3: ["3x1", "PO", "Qty 19"],
  med4: ["3x1", "PO", "Qty 29"],
  med5: ["1x1", "PO", "Qty 30"],
  med6: ["SOS", "PO", "Qty 10"],
  med7: ["SOS, max 3x1", "PO", "Qty 30"],
  med8: ["1 x 2 tab", "PO", "Qty 10"],
  med9: ["1x1", "Stopped 23 Feb'26 for surgery", "Restart advised 03 Mar'26"],
  medh1: ["Intra-op", "27 Feb'26, 08:10"],
  medh2: ["Pre-op", "27 Feb'26, 05:40"],
  medh3: ["Intra-op", "27 Feb'26, 09:40"],
  med10: ["1-2 caps/day"],
  med11: ["1-2 caps/day"],
  med12: ["1x1"],
  med13: ["1x2 tab"],
  med14: ["Every 2w", "Last 23 Feb'26"],
};

// Vitals become label and value pairs: "BP 102/74 · Pulse 72" -> BP: 102/74 | Pulse: 72
const vitalFacts = (detail) =>
  detail.split(" · ").map((part) => {
    const at = part.indexOf(" ");
    return { k: part.slice(0, at), v: part.slice(at + 1) };
  });

// What part each fact plays in the story of the file. The extraction service
// sets this; the structured record is assembled from it (see caseFileSummary).
//   DX    final | working | secondary | chronic
//   PROC  procedure | pastSurgery
//   MED   discharge | home | inHospital          (OPD files use: prescribed)
//   VIT   last | interim
//   RPT   complaint | course | conditionAtDischarge | dischargeDate | followUp | hospitalMeds
//         | investigation | alert | anaesthesia | detail
const ROLES = {
  dx1: "final", dx2: "working", dx3: "chronic", dx4: "chronic", dx5: "secondary", dx6: "final", dx7: "secondary",
  proc1: "procedure", proc2: "procedure", proc3: "pastSurgery",
  med1: "discharge", med2: "discharge", med3: "discharge", med4: "discharge", med5: "discharge", med6: "discharge",
  med7: "discharge", med8: "discharge", med9: "discharge",
  med10: "home", med11: "home", med12: "home", med13: "home", med14: "home", med15: "home",
  medh1: "inHospital", medh2: "inHospital", medh3: "inHospital",
  vit1: "last", vit2: "interim", vit3: "interim", vit4: "interim",
  rpt1: "complaint", rpt2: "dischargeDate", rpt3: "conditionAtDischarge", rpt4: "followUp", rpt5: "hospitalMeds",
  rpt6: "investigation", rpt7: "investigation", rpt8: "alert", rpt9: "alert", rpt10: "anaesthesia",
  rpt11: "course", rpt12: "detail", rpt13: "detail", rpt14: "detail",
};

// A few words that stand for a long note when it is quoted inside a sentence.
const SHORT = {
  rpt9: "long-term steroid use (triamcinolone)",
  rpt8: "1 red-cell unit cross-matched, no transfusion recorded",
};

const withFacts = (item) => {
  const finding = { ...item, role: ROLES[item.id] || (item.domain === "ALG" ? "allergy" : null), short: SHORT[item.id] };
  if (finding.domain === "VIT") return { ...finding, facts: vitalFacts(finding.detail) };
  if (finding.domain === "ALG") return { ...finding, label: "No known drug allergy", quals: QUALS[finding.id] };
  return QUALS[finding.id] ? { ...finding, quals: QUALS[finding.id] } : finding;
};

export const ARCHIVED_RECORDS_MOCK = {
  source: {
    fileId: "IPD case file (sample)",
    fileName: "digitized IPD file, 99 pages",
    facility: HOSPITAL,
    totalPages: 99,
    language: "Indonesian and English",
    processedOn: "14 Nov 2026, 9:40 pm",
    trigger: "Prepared last night for today's appointment",
    engine: "Velora reader v0.3 (sample)",
    pagesWithData: 32,
    pagesFormsOnly: 66,
    pagesUnread: 1,
  },
  encounters,
  documents,
  pages,
  findings: findings.map(withFacts),
  images,
  exceptions,
  notFound,
  labsNotShown,
  summary,
  brief,
  timeline,
  questions,
};

export default ARCHIVED_RECORDS_MOCK;
