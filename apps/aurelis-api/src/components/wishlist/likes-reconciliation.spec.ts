import { parseArgs, reconcile, CountRow } from '../../../../../scripts/reconcile-yacht-likes';

describe('Standalone likes reconciliation (offline)', () => {
	const fixture = (rows: CountRow[]) => {
		const close = jest.fn().mockResolvedValue(undefined);
		const aggregate = jest.fn(() => ({
			async *[Symbol.asyncIterator]() {
				for (const row of rows) yield await Promise.resolve(row);
			},
			close,
		}));
		const countDocuments = jest.fn().mockResolvedValue(3);
		const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
		const collection = { aggregate, countDocuments, updateOne };
		return { db: { collection: jest.fn(() => collection) }, close, aggregate, countDocuments, updateOne };
	};
	const mismatch = { _id: 'yacht', stored: 1, present: 1, expected: 3 };
	it('defaults to dry-run and reports mismatches/orphans without writes', async () => {
		const f = fixture([
			mismatch,
			{ _id: 'missing', stored: null, present: 0, expected: 2 },
			{ _id: 'legacy', stored: null, present: 1, expected: 0 },
		]);
		const report = jest.fn();
		expect(await reconcile(f.db, { report })).toMatchObject({
			mode: 'dry-run',
			scanned: 2,
			mismatches: 1,
			applied: 0,
			orphanRelations: 2,
		});
		expect(report).toHaveBeenCalledTimes(2);
		expect(f.updateOne).not.toHaveBeenCalled();
		expect(f.countDocuments).not.toHaveBeenCalled();
		expect(f.close).toHaveBeenCalled();
	});
	it('requires explicit apply plus a maintenance acknowledgment', async () => {
		expect(parseArgs([])).toEqual({ apply: false, help: false });
		expect(() => parseArgs(['--apply'])).toThrow();
		expect(() => parseArgs(['--typo'])).toThrow();
		expect(parseArgs(['--apply', '--writes-paused']).apply).toBe(true);
		const f = fixture([mismatch]);
		await expect(reconcile(f.db, { apply: true })).rejects.toThrow();
		expect(f.db.collection).not.toHaveBeenCalled();
	});
	it('repairs only the counter using compare-and-set without upsert', async () => {
		const f = fixture([mismatch]);
		expect(await reconcile(f.db, { apply: true, writesPaused: true })).toMatchObject({ applied: 1, conflicts: 0 });
		expect(f.updateOne).toHaveBeenCalledWith(
			{ _id: 'yacht', likesCount: 1 },
			{ $set: { likesCount: 3 } },
			{ upsert: false, maxTimeMS: 30000 },
		);
	});
	it('skips changed relation counts and changed counters', async () => {
		const f = fixture([mismatch, mismatch]);
		f.countDocuments.mockResolvedValueOnce(4);
		f.updateOne.mockResolvedValueOnce({ modifiedCount: 0 });
		expect(await reconcile(f.db, { apply: true, writesPaused: true })).toMatchObject({ applied: 0, conflicts: 2 });
		expect(f.updateOne).toHaveBeenCalledTimes(1);
	});
	it('repairs positive legacy counts and zero counts without deleting relations', async () => {
		const f = fixture([
			{ ...mismatch, stored: null },
			{ ...mismatch, expected: 0 },
		]);
		f.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
		expect(await reconcile(f.db, { apply: true, writesPaused: true })).toMatchObject({ applied: 2 });
		expect(f.updateOne).toHaveBeenNthCalledWith(
			1,
			{ _id: 'yacht', likesCount: null },
			{ $set: { likesCount: 3 } },
			{ upsert: false, maxTimeMS: 30000 },
		);
	});
	it('closes the cursor after a write failure and rejects unsupported counts', async () => {
		const f = fixture([mismatch]);
		f.updateOne.mockRejectedValueOnce(new Error('offline'));
		await expect(reconcile(f.db, { apply: true, writesPaused: true })).rejects.toThrow('offline');
		expect(f.close).toHaveBeenCalled();
		await expect(reconcile(fixture([{ ...mismatch, expected: 2147483648 }]).db)).rejects.toThrow('supported range');
	});
});
