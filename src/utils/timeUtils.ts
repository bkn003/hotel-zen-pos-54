/**
 * Time Utilities - AM/PM Formatting
 * Consistent time formatting across the Hotel Zen POS system
 */

/**
 * Format time in 12-hour AM/PM format
 * @param date - Date object or ISO string
 * @returns Formatted time string like "02:35 PM"
 */
export const formatTimeAMPM = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '--:-- --';
  }

  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  const hoursStr = hours.toString().padStart(2, '0');
  const minutesStr = minutes.toString().padStart(2, '0');

  return `${hoursStr}:${minutesStr} ${ampm}`;
};

/**
 * Format date and time in display format with AM/PM
 * @param date - Date object or ISO string
 * @returns Formatted string like "12 Jan | 02:35 PM"
 */
export const formatDateTimeAMPM = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '-- --- | --:-- --';
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const time = formatTimeAMPM(d);

  return `${day} ${month} | ${time}`;
};

/**
 * Get time elapsed since a given date
 * @param date - Date object or ISO string
 * @returns Human readable elapsed time like "5 min" or "1 hr 30 min"
 */
export const getTimeElapsed = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '--';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
};

/**
 * Check if a timestamp is within undo window (default 5 minutes)
 * @param date - Date object or ISO string
 * @param windowMinutes - Undo window in minutes (default 5)
 * @returns Boolean indicating if undo is still possible
 */
export const isWithinUndoWindow = (date: Date | string, windowMinutes: number = 5): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = diffMs / (1000 * 60);

  return diffMins <= windowMinutes;
};

/**
 * Get simplified short unit from full unit string
 * @param unit - Full unit string like "Gram (g)" or "Piece (pc)"
 * @returns Short unit like "g" or "pc"
 */
export const getShortUnit = (unit?: string): string => {
  if (!unit) return 'pc';
  return unit
    .replace(/pieces?|piece\s?\(pc\)/i, 'pc')
    .replace(/grams?|gram\s?\(g\)/i, 'g')
    .replace(/milliliters?|ml/i, 'ml')
    .replace(/liters?|liter\s?\(l\)/i, 'L')
    .replace(/kilograms?|kilogram\s?\(kg\)/i, 'kg');
};

/**
 * Format quantity with smart unit conversion
 * Converts 1000g+ to kg, 1000ml+ to L
 * @param quantity - The quantity value
 * @param unit - The unit string (short form like "g", "ml", "pc")
 * @returns Formatted string like "1.2kg" or "5pc"
 */
export const formatQuantityWithUnit = (quantity: number, unit?: string): string => {
  const shortUnit = getShortUnit(unit);

  // Convert grams to kg if >= 1000
  if (shortUnit === 'g' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}kg`;
  }

  // Convert ml to L if >= 1000
  if (shortUnit === 'ml' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}L`;
  }

  // For whole numbers, don't show decimal
  if (Number.isInteger(quantity)) {
    return `${quantity}${shortUnit}`;
  }

  return `${quantity.toFixed(1)}${shortUnit}`;
};
