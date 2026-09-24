import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { RECORDS } from './fixtures.js';

// Only for fictional fixtures. Never reconstruct a live prescription from an excerpt.
export async function createSampleEvidencePdf(row, patient = {}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(.16, .18, .23), muted = rgb(.43, .46, .52), line = rgb(.88, .89, .92);
  const clean = value => String(value || '').replace(/[–—]/g, '-').replace(/[^\x20-\x7e\n]/g, '');
  const text = (value, x, y, size = 11, font = regular, color = ink) => page.drawText(clean(value), { x, y, size, font, color });
  const rule = y => page.drawLine({ start: { x: 36, y }, end: { x: 559, y }, thickness: .7, color: line });
  const lab = row.code === 'lab_result';
  text('TatvaPractice', 36, 795, 21, bold);
  text(lab ? 'SAMPLE DIAGNOSTICS' : 'SAMPLE CLINIC', 36, 775, 9, bold, muted);
  text('FICTIONAL DOCUMENT', 421, 796, 10, bold, muted);
  text('For UI review only', 459, 778, 9, regular, muted);
  rule(758);
  text(lab ? 'LABORATORY REPORT' : 'PRESCRIPTION', 36, 732, 15, bold);
  text(patient.name || 'Sample patient', 36, 703, 13, bold);
  text([patient.age != null ? `${patient.age} years` : '', patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender].filter(Boolean).join(' | '), 36, 685, 10, regular, muted);
  text(`Date: ${row.eventDate}`, 390, 703, 10);
  rule(668);
  let y = 639;
  const section = label => {
    page.drawRectangle({ x: 36, y: y - 7, width: 523, height: 23, color: rgb(.95,.95,.97) });
    text(label, 46, y, 10, bold); y -= 32;
  };
  const paragraph = (value, highlighted = false) => {
    const words = clean(value).split(/\s+/); let current = '';
    const lines = [];
    for (const word of words) { const next = current ? `${current} ${word}` : word; if (regular.widthOfTextAtSize(next, 11) > 498) { lines.push(current); current = word; } else current = next; }
    if (current) lines.push(current);
    for (const part of lines) {
      if (highlighted) page.drawRectangle({ x: 44, y: y - 3, width: regular.widthOfTextAtSize(part, 11) + 4, height: 15, color: rgb(1,.94,.66) });
      text(part, 46, y); y -= 18;
    }
    y -= 12;
  };
  if (lab) {
    section('Investigation');
    paragraph(row.title);
    section('Result and reference range');
    paragraph(row.text.replace('Fictional laboratory report. ', ''), true);
    section('Report notes');
    paragraph('Values and reference ranges in this document are invented for the interface preview.');
  } else {
    section('Diagnosis'); paragraph('Type 2 diabetes reviewed.', row.code === 'consultation');
    section('Consultation notes');
    paragraph('Patient reports taking medication regularly. No hypoglycaemic episodes reported.');
    section('Medication (Rx)');
    text('Medicine / strength', 46, y, 10, bold); text('Schedule', 302, y, 10, bold); text('Duration', 444, y, 10, bold); y -= 26;
    if (row.code === 'medicine') page.drawRectangle({ x: 42, y: y - 6, width: 508, height: 24, color: rgb(1,.94,.66) });
    text('Metformin 500 mg tablet', 46, y); text('1-0-0-1', 302, y); text('30 days', 444, y); y -= 23;
    text('After meals', 46, y, 10, regular, muted); y -= 32;
    section('Advice / follow-up'); paragraph('Repeat HbA1c in three months.');
  }
  rule(117);
  text('Sample document - no signature or clinical validity', 36, 96, 10, regular, muted);
  text('Yellow shading identifies the cited passage.', 36, 78, 9, regular, muted);
  text('Fictional source for design review | Dr.Velora', 36, 41, 9, regular, muted);
  text('Page 1 of 1', 509, 41, 9, regular, muted);
  pdf.setTitle(`${lab ? 'Lab report' : 'Prescription'} - fictional UI sample`);
  pdf.setSubject(`Fixture source: ${RECORDS.find(record => record.id === row.id)?.id || 'sample'}`);
  return pdf.save();
}
