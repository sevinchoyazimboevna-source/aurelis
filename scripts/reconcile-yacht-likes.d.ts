export function parseArgs(args: string[]): { apply: boolean; help: boolean };
export interface CountRow {
	_id: unknown;
	stored: number | string | null;
	present: number;
	expected: number;
}
export interface ReconciliationCollection {
	aggregate(pipeline: unknown[], options: unknown): AsyncIterable<CountRow> & { close(): Promise<void> };
	countDocuments(filter: unknown, options: unknown): Promise<number>;
	updateOne(filter: unknown, update: unknown, options: unknown): Promise<{ modifiedCount: number }>;
}
export function reconcile(
	db: { collection(name: string): ReconciliationCollection },
	options?: {
		apply?: boolean;
		writesPaused?: boolean;
		report?: (row: unknown) => void;
	},
): Promise<{
	mode: string;
	scanned: number;
	mismatches: number;
	applied: number;
	conflicts: number;
	orphanRelations: number;
}>;
