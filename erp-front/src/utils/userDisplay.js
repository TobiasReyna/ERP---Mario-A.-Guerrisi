// Devuelve las iniciales (máx. 2) de un nombre para el avatar. Ej: "Juan Pérez" -> "JP"
export const getInitials = (nombre) => {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
};
