import { Calendar2, Notepad2 } from "iconsax-reactjs";
import { Building2 } from "lucide-react";
import { ToothIcon } from "../ToothIcon";
import { TPMedicalIcon } from "../tp-ui";
import rx from "./RxPreviewDocument.module.scss";
import { getAppointmentPatient } from "../lib/appointment-patients";
function formatDate(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
function renderMeta(metaParts) {
  if (metaParts.length === 0) return null;
  return (
    <span className={rx.metaMuted}>
      {" "}
      (
      {metaParts.map((part, index) =>
      <span>
          {index > 0 ? <span className={rx.metaSep}> | </span> : null}
          {part}
        </span>
      )}
      )
    </span>);

}
function SectionList({ title, rows, icon }) {
  if (!rows.length) return null;
  return (
    <section className={rx.section}>
      <div className={rx.sectionHead}>
        {icon ? <span className={rx.icon14}>{icon}</span> : null}
        <h3 className={rx.sectionTitle}>{title}</h3>
      </div>
      <ul className={rx.list}>
        {rows.map((row, index) =>
        <li className={rx.listLi}>
            <span className={rx.rowTitle}>{row.title}</span>
            {renderMeta(row.metaParts)}
          </li>
        )}
      </ul>
    </section>);

}
function RxMedicalSectionIcon({ name }) {
  return (
    <TPMedicalIcon
      name={name}
      variant="bulk"
      size={14}
      color="var(--tp-slate-500)"
      className={rx.medIcon14} />);


}
export function RxPreviewDocument({ snapshot, extraNotes }) {
  /**
   * When `extraNotes` is passed, fold it into the Additional Notes body so the
   * quick-visit consultation narrative renders inside the Rx itself (instead of
   * as a sibling panel above it). Keeps the preview to a single Rx document.
   */
  const mergedAdditionalNotes = (() => {
    const fromSnapshot = String(snapshot?.additionalNotes ?? "").trim();
    const fromExtra = String(extraNotes ?? "").trim();
    if (fromSnapshot && fromExtra) return `${fromExtra}\n\n${fromSnapshot}`;
    return fromSnapshot || fromExtra || "";
  })();
  const dentalBlocks = snapshot?.dentalExamination ?? [];
  const firstPageDentalBlocks = dentalBlocks.slice(0, 4);
  const remainingDentalBlocks = dentalBlocks.slice(4);
  const renderLetterhead = () =>
  <>
      <header className={rx.letterhead}>
        <div className={rx.letterRow}>
          <div className={rx.letterLeft}>
            <div className={rx.logoBox}>
              <Building2
              size={32}
              className={rx.buildingIcon}
              strokeWidth={1.8} />

            </div>
            <div>
              <p className={rx.clinicName}>TP Dental Care</p>
              <p className={rx.docLine}>Dr. Umesh Aggarwal, BDS, MDS</p>
              <p className={rx.metaLine}>
                Reg. ID: DCI-2342342 | +91 78945 61230
              </p>
              <p className={rx.metaLine}>
                K9 Sardar Bungalow, Prahladnagar, Ahmedabad
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className={rx.rule} />
    </>;

  const renderPatientDetails = () => {
    const pid = snapshot?.patientId ?? "apt-1";
    const ap = getAppointmentPatient(pid);
    return (
      <>
        <section className={rx.patientSection}>
          <div className={rx.patientRow}>
            <div className={rx.patientCol}>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Patient Name:</span>{" "}
                {ap.name}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Age/Gender:</span> {ap.age}{" "}
                Years, {ap.genderLabel}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Height/Weight:</span> —
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Address:</span> Prahladnagar,
                Ahmedabad
              </p>
            </div>
            <div className={rx.patientRight}>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Patient ID:</span>{" "}
                {ap.patientCode}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Mobile:</span>{" "}
                {ap.mobile.replace(/^\+91-/, "")}
              </p>
              <p className={rx.patientLine}>
                <span className={rx.patientStrong}>Blood Group:</span>{" "}
                {ap.bloodGroup}
              </p>
            </div>
          </div>
        </section>
        <div className={rx.rule} />
      </>);

  };
  const renderFooter = () =>
  <>
      <div className={rx.rule} />
      <footer className={rx.footer}>
        <p className={rx.footerText}>
          support@tpdentalcare.com | www.tpdentalcare.com
        </p>
      </footer>
    </>;

  const renderDentalSection = (blocks, titleSuffix) => {
    if (!blocks.length) return null;
    return (
      <section className={rx.dentalSection}>
        <h3 className={rx.dentalTitle}>
          <ToothIcon size={12} color="var(--tp-slate-500)" variant="Bulk" />
          Dental Examination{titleSuffix ? ` ${titleSuffix}` : ""}
          <span className={rx.dentalDate}>
            {" "}
            (
            {formatDate(
              snapshot?.dentalUpdatedAt ??
              snapshot?.updatedAt ??
              new Date().toISOString()
            )}
            )
          </span>
        </h3>
        <div className={rx.dentalBlocks}>
          {blocks.map((block, index) =>
          <div className={rx.toothBlock}>
              <p className={rx.toothLabel}>
                <span className={rx.bullet}>•</span>
                {block.toothLabel}
              </p>
              <div className={rx.subStack}>
                {block.treatmentHistory.length ?
              <p className={rx.subLine}>
                    <span className={rx.subBullet}>•</span>
                    <span className={rx.subStrong}>
                      Treatment History:
                    </span>{" "}
                    {block.treatmentHistory.map((item, itemIndex) =>
                <span>
                        {itemIndex > 0 ?
                  <span className={rx.comma}>, </span> :
                  null}
                        <span>{item.title}</span>
                        {renderMeta(item.metaParts)}
                      </span>
                )}
                  </p> :
              null}
                {block.findings.length ?
              <p className={rx.subLine}>
                    <span className={rx.subBullet}>•</span>
                    <span className={rx.subStrong}>Findings:</span>{" "}
                    {block.findings.map((item, itemIndex) =>
                <span>
                        {itemIndex > 0 ?
                  <span className={rx.comma}>, </span> :
                  null}
                        <span>{item.title}</span>
                        {renderMeta(item.metaParts)}
                      </span>
                )}
                  </p> :
              null}
                {block.procedures.length ?
              <p className={rx.subLine}>
                    <span className={rx.subBullet}>•</span>
                    <span className={rx.subStrong}>Procedures:</span>{" "}
                    {block.procedures.map((item, itemIndex) =>
                <span>
                        {itemIndex > 0 ?
                  <span className={rx.comma}>, </span> :
                  null}
                        <span>{item.title}</span>
                        {renderMeta(item.metaParts)}
                      </span>
                )}
                  </p> :
              null}
                {block.overallToothNote ?
              <p className={rx.subLine}>
                    <span className={rx.subBullet}>•</span>
                    <span className={rx.subStrong}>
                      Overall Tooth Notes:
                    </span>{" "}
                    {block.overallToothNote}
                  </p> :
              null}
              </div>
            </div>
          )}
        </div>
      </section>);

  };
  return (
    <div className={rx.page}>
      <article className={rx.sheet}>
        {renderLetterhead()}
        {renderPatientDetails()}
        <div className={rx.sheetBody}>
          {!snapshot ?
          <div className={rx.emptyPad}>
              <p className={rx.emptyText}>
                No Rx data available yet. Add details in Clinical or Dental
                Examination to preview here.
              </p>
            </div> :

          <div className={rx.contentStack}>
              <SectionList
              title="Chief Complaints"
              rows={snapshot.symptoms}
              icon={<RxMedicalSectionIcon name="Virus" />} />

              <SectionList
              title="Examination"
              rows={snapshot.examinations}
              icon={<RxMedicalSectionIcon name="medical service" />} />

              <SectionList
              title="Diagnosis"
              rows={snapshot.diagnoses}
              icon={<RxMedicalSectionIcon name="Diagnosis" />} />

              <SectionList
              title="Investigations"
              rows={snapshot.labInvestigations}
              icon={<RxMedicalSectionIcon name="Test Tube" />} />

              <SectionList
              title="Medication (Rx)"
              rows={snapshot.medications}
              icon={<RxMedicalSectionIcon name="Tablets" />} />

              <SectionList
              title="Advice"
              rows={snapshot.advice}
              icon={<RxMedicalSectionIcon name="health care" />} />

              {renderDentalSection(firstPageDentalBlocks)}
              {snapshot.followUp ?
            <section className={rx.miniSection}>
                  <h3 className={rx.dentalTitle}>
                    <Calendar2
                  size={14}
                  color="var(--tp-slate-500)"
                  variant="Bulk" />

                    Follow Up
                  </h3>
                  <p className={rx.miniBody}>{snapshot.followUp}</p>
                </section> :
            null}
              {mergedAdditionalNotes ?
            <section className={rx.miniSection}>
                  <h3 className={rx.dentalTitle}>
                    <Notepad2
                  size={14}
                  color="var(--tp-slate-500)"
                  variant="Bulk" />

                    Additional Notes
                  </h3>
                  <p className={rx.miniBody}>{mergedAdditionalNotes}</p>
                </section> :
            null}
            </div>}

        </div>
        {renderFooter()}
      </article>
      {remainingDentalBlocks.length > 0 ?
      <article className={rx.sheet}>
          {renderLetterhead()}
          {renderPatientDetails()}
          <div className={rx.continueBody}>
            {renderDentalSection(remainingDentalBlocks, "(contd.)")}
          </div>
          {renderFooter()}
        </article> :
      null}
    </div>);

}