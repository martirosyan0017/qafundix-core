/** Returns an ISO timestamp for the supplied date or the current time. */
export function toIsoString(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) throw new RangeError('Cannot format an invalid date');
  return date.toISOString();
}

/** Adds a finite number of milliseconds without mutating the input date. */
export function addMilliseconds(date: Date, milliseconds: number): Date {
  if (Number.isNaN(date.getTime()) || !Number.isFinite(milliseconds))
    throw new RangeError('A valid date and finite milliseconds are required');
  return new Date(date.getTime() + milliseconds);
}
