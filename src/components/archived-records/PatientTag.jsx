import React from "react";
import { Avatar } from "@dhspl-tatvacare/tesseract-ui";
import { ReactComponent as PatientIcon } from "../../common/prescription-header/icons/user.svg";
import { useArchivedRecords } from "./archivedRecordsStore";
import styles from "./ArchivedRecords.module.scss";

// Whose file this is, at the top of the Case File: the patient's name, then
// age, sex and patient ID, as the file states them. Nothing when the file
// gives no name.
export default function PatientTag() {
  const { bundle } = useArchivedRecords();
  const patient = bundle.patient || {};
  if (!patient.name) return null;
  // As the Rx pad header writes it: F | 84y, then the patient ID.
  const meta = [patient.sex ? patient.sex[0].toUpperCase() : null, patient.age ? `${patient.age}y` : null, patient.id ? `ID ${patient.id}` : null].filter(Boolean);
  return (
    <div className={styles.patientTag} aria-label={`Patient: ${[patient.name, ...meta].join(", ")}`}>
      <Avatar name={patient.name} icon={<PatientIcon width={28} height={28} aria-hidden="true" />} size={40} />
      <span className={styles.patientTagText}>
        <span className={styles.patientTagName}>{patient.name}</span>
        {meta.length ? (
          <span className={styles.patientTagMeta}>
            {meta.map((part, index) => (
              <React.Fragment key={part}>
                {index > 0 ? <span className={styles.patientTagDivider} aria-hidden="true">|</span> : null}
                <span>{part}</span>
              </React.Fragment>
            ))}
          </span>
        ) : null}
      </span>
    </div>
  );
}
