export interface PaginatedResult<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
}
export interface SortOptions<T> {
	field: Extract<keyof T, string>;
	direction: 1 | -1;
}
