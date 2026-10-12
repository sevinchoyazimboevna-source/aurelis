/** JSON values accepted by the ER model's JSON fields. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export interface JsonObject {
	[key: string]: JsonValue;
}
export function isJsonValue(
	value: unknown,
	ancestors = new Set<object>(),
): value is JsonValue {
	if (value === null || typeof value === 'string' || typeof value === 'boolean')
		return true;
	if (typeof value === 'number') return Number.isFinite(value);
	if (typeof value !== 'object' || ancestors.has(value)) return false;
	if (
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) !== Object.prototype &&
		Object.getPrototypeOf(value) !== null
	)
		return false;
	ancestors.add(value);
	const valid = Object.values(value).every((item) => isJsonValue(item, ancestors));
	ancestors.delete(value);
	return valid;
}
