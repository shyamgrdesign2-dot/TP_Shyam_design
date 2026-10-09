export function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatDoctorName(name) {
  if (!name) return '';
  return name.startsWith('Dr.') ? name : `Dr. ${name}`;
}
