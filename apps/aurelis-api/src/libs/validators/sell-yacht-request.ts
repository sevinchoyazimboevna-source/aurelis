// UTC year, evaluated at validation time; callers may supply a year for offline checks.
export function validSellYachtBuildYear(value: unknown, currentYear = new Date().getUTCFullYear()): boolean {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1800 && value <= currentYear;
}
