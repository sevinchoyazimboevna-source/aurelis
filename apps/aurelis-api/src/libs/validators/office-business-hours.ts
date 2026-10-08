import { DayOfWeek } from '../enums/office.enum';

// Same-day local display hours only; no timezone arithmetic or overnight/split shifts.
export function validOfficeBusinessHours(value: unknown): boolean {
	if (!Array.isArray(value) || value.length > 7) return false;
	const days = new Set<string>();
	return value.every((entry) => {
		if (!entry || typeof entry !== 'object' || !Object.values(DayOfWeek).includes(entry.day) || days.has(entry.day))
			return false;
		days.add(entry.day);
		const closed = entry.closed ?? false;
		if (typeof closed !== 'boolean' || entry.closed === null) return false;
		if (closed) return entry.openTime == null && entry.closeTime == null;
		const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
		return (
			typeof entry.openTime === 'string' &&
			typeof entry.closeTime === 'string' &&
			time.test(entry.openTime) &&
			time.test(entry.closeTime) &&
			entry.openTime < entry.closeTime
		);
	});
}
export function validOfficeTimezone(value: unknown): boolean {
	if (typeof value !== 'string' || !value.trim()) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: value });
		return true;
	} catch {
		return false;
	}
}
