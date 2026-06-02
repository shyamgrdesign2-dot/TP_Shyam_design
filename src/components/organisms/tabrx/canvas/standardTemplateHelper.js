import { A4_BASE_WIDTH, A4_BASE_HEIGHT } from "./constants";

/**
 * Generates a standard letterhead background as a data URL.
 *
 * In the source product this pulled the doctor/clinic profile from the
 * auth token; here we accept an optional `profile` object and fall back to
 * sensible placeholders so the template renders standalone.
 */
export const generateStandardTemplateBackground = (profile = {}) => {
  const canvas = document.createElement("canvas");
  canvas.width = A4_BASE_WIDTH;
  canvas.height = A4_BASE_HEIGHT;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const doctorName = profile?.doctorName || "Dr. Shyam GR";
  const speciality = profile?.speciality || "General Physician";
  const clinicName = profile?.clinicName || "TatvaCare Clinic";
  const address = profile?.address || "2nd Floor, Wellness Avenue";
  const city = profile?.city || "Bengaluru";
  const state = profile?.state || "Karnataka";
  const phone = profile?.phone || "+91 95679 33357";
  const email = profile?.email || "care@tatvapractice.in";

  const purpleColor = "#A352D1";
  const textColor = "#333333";
  const lineColor = "#000000";

  // --- HEADER ---
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.font = "bold 20px Arial";
  ctx.fillStyle = purpleColor;
  ctx.fillText(doctorName, 40, 60);

  ctx.font = "16px Arial";
  ctx.fillStyle = textColor;
  ctx.fillText(speciality, 40, 85);

  ctx.textAlign = "right";

  ctx.font = "bold 20px Arial";
  ctx.fillStyle = purpleColor;
  ctx.fillText(clinicName, A4_BASE_WIDTH - 40, 60);

  ctx.font = "16px Arial";
  ctx.fillStyle = textColor;
  let currentY = 85;
  if (address) {
    ctx.fillText(address, A4_BASE_WIDTH - 40, currentY);
    currentY += 22;
  }
  if (city) {
    ctx.fillText(city, A4_BASE_WIDTH - 40, currentY);
    currentY += 22;
  }
  if (state) {
    ctx.fillText(state, A4_BASE_WIDTH - 40, currentY);
    currentY += 22;
  }

  const headerLineY = Math.max(120, currentY + 10);
  ctx.beginPath();
  ctx.moveTo(40, headerLineY);
  ctx.lineTo(A4_BASE_WIDTH - 40, headerLineY);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // --- FOOTER ---
  const footerLineY = A4_BASE_HEIGHT - 60;

  ctx.beginPath();
  ctx.moveTo(40, footerLineY);
  ctx.lineTo(A4_BASE_WIDTH - 40, footerLineY);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = "14px Arial";
  ctx.fillStyle = textColor;

  const footerTextParts = [];
  if (clinicName) footerTextParts.push(clinicName);
  if (phone) footerTextParts.push(phone);
  if (email) footerTextParts.push(email);

  ctx.fillText(footerTextParts.join("  |  "), 40, footerLineY + 15);

  return canvas.toDataURL("image/png");
};
