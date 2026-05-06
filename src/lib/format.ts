/**
 * Format a number as Colombian Pesos (COP)
 * Example: 1250000 → "$ 1.250.000"
 */
export function formatCOP(amount: number): string {
  return (
    '$ ' +
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

/**
 * Parse a COP formatted string back to number
 */
export function parseCOP(value: string): number {
  return Number(value.replace(/[$.\\s]/g, '').replace(',', '.')) || 0;
}

/**
 * Format a date to Colombian locale
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get today's date range in Bogota timezone
 */
export function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const bogotaOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const diff = bogotaOffset - utcOffset;
  const bogotaNow = new Date(now.getTime() + diff * 60 * 1000);

  const start = new Date(bogotaNow);
  start.setHours(0, 0, 0, 0);
  const startUTC = new Date(start.getTime() - diff * 60 * 1000);

  const end = new Date(bogotaNow);
  end.setHours(23, 59, 59, 999);
  const endUTC = new Date(end.getTime() - diff * 60 * 1000);

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
  };
}
