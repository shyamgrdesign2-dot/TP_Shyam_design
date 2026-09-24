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
  text(lab ? 'DIAGNOSTICS' : 'CLINIC', 36, 775, 9, bold, muted);
  rule(758);
  text(lab ? 'LABORATORY REPORT' : 'PRESCRIPTION', 36, 732, 15, bold);
  text(patient.name || 'Patient', 36, 703, 13, bold);
  text([patient.age != null ? `${patient.age} years` : '', patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender].filter(Boolean).join(' | '), 36, 685, 10, regular, muted);
  text(`Date: ${row.eventDate}`, 390, 703, 10);
  rule(668);
  let y = 639;
  const section = label => {
    page.drawRectangle({ x: 36, y: y - 7, width: 523, height: 23, color: rgb(.95,.95,.97) });
    text(label, 46, y, 10, bold); y -= 32;
  };
  const paragraph = (value) => {
    const words = clean(value).split(/\s+/); let current = '';
    const lines = [];
    for (const word of words) { const next = current ? `${current} ${word}` : word; if (regular.widthOfTextAtSize(next, 11) > 498) { lines.push(current); current = word; } else current = next; }
    if (current) lines.push(current);
    for (const part of lines) {
      text(part, 46, y); y -= 18;
    }
    y -= 12;
  };
  if (lab) {
    section('Investigation');
    paragraph(row.title);
    section('Result and reference range');
    paragraph(row.text);
  } else {
    section('Diagnosis'); paragraph('Type 2 diabetes reviewed.');
    section('Consultation notes');
    paragraph('Patient reports taking medication regularly. No hypoglycaemic episodes reported.');
    section('Medication (Rx)');
    text('Medicine / strength', 46, y, 10, bold); text('Schedule', 302, y, 10, bold); text('Duration', 444, y, 10, bold); y -= 26;
    text('Metformin 500 mg tablet', 46, y); text('1-0-0-1', 302, y); text('30 days', 444, y); y -= 23;
    text('After meals', 46, y, 10, regular, muted); y -= 32;
    section('Advice / follow-up'); paragraph('Repeat HbA1c in three months.');
  }
  rule(117);
  text('TatvaPractice | Dr.Velora', 36, 41, 9, regular, muted);
  text('Page 1 of 1', 509, 41, 9, regular, muted);
  pdf.setTitle(`${lab ? 'Lab report' : 'Prescription'}`);
  pdf.setSubject(`Fixture source: ${RECORDS.find(record => record.id === row.id)?.id || 'sample'}`);
  return pdf.save();
}
