'use strict';

// Standalone operator utility. Never imported by application startup.
const mongoose = require('mongoose');

function parseArgs(args) {
	if (args.some((arg) => !['--apply', '--writes-paused', '--help'].includes(arg))) throw new Error('Unknown option');
	const apply = args.includes('--apply');
	if (apply && !args.includes('--writes-paused')) throw new Error('Apply requires --writes-paused');
	return { apply, help: args.includes('--help') };
}

async function reconcile(db, { apply = false, writesPaused = false, report = () => undefined } = {}) {
	if (apply && !writesPaused) throw new Error('Apply requires paused wishlist writers');
	const yachts = db.collection('yachts');
	const wishlist = db.collection('wishlistItems');
	// Stream one grouped row per ID; avoid one full relation scan per yacht or an in-memory collection snapshot.
	const cursor = yachts.aggregate(
		[
			{
				$project: {
					_id: 1,
					stored: { $ifNull: ['$likesCount', null] },
					present: { $literal: 1 },
					expected: { $literal: 0 },
				},
			},
			{
				$unionWith: {
					coll: 'wishlistItems',
					pipeline: [
						{ $group: { _id: '$yachtId', expected: { $sum: 1 } } },
						{ $project: { _id: 1, expected: 1, stored: { $literal: null }, present: { $literal: 0 } } },
					],
				},
			},
			{
				$group: {
					_id: '$_id',
					expected: { $sum: '$expected' },
					present: { $max: '$present' },
					stored: { $max: '$stored' },
				},
			},
		],
		{ allowDiskUse: true, maxTimeMS: 300000 },
	);
	const summary = {
		mode: apply ? 'apply' : 'dry-run',
		scanned: 0,
		mismatches: 0,
		applied: 0,
		conflicts: 0,
		orphanRelations: 0,
	};
	try {
		for await (const row of cursor) {
			if (!row.present) {
				summary.orphanRelations += row.expected;
				report({ yachtId: String(row._id), orphanRelations: row.expected });
				continue;
			}
			summary.scanned++;
			if (!Number.isSafeInteger(row.expected) || row.expected < 0 || row.expected > 2147483647)
				throw new Error('Count exceeds supported range');
			if ((row.stored ?? 0) === row.expected) continue;
			summary.mismatches++;
			report({ yachtId: String(row._id), stored: row.stored, expected: row.expected });
			if (!apply) continue;
			// No transaction spans relations and counters. Maintenance quiescence is mandatory.
			if ((await wishlist.countDocuments({ yachtId: row._id }, { maxTimeMS: 30000 })) !== row.expected) {
				summary.conflicts++;
				continue;
			}
			const result = await yachts.updateOne(
				{ _id: row._id, likesCount: row.stored },
				{ $set: { likesCount: row.expected } },
				{ upsert: false, maxTimeMS: 30000 },
			);
			if (result.modifiedCount === 1) summary.applied++;
			else summary.conflicts++;
		}
	} finally {
		await cursor.close();
	}
	return summary;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		console.log('Usage: node scripts/reconcile-yacht-likes.js [--apply --writes-paused]');
		console.log(
			'Default: read-only dry-run. Set MONGODB_URI explicitly. Apply only after draining API requests/cache fills and pausing all wishlist writers; wait 30 seconds after repair for popularity caches to expire before resuming.',
		);
		return;
	}
	if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI required');
	const connection = await mongoose
		.createConnection(process.env.MONGODB_URI, {
			autoIndex: false,
			autoCreate: false,
			serverSelectionTimeoutMS: 5000,
		})
		.asPromise();
	try {
		const summary = await reconcile(connection.db, {
			apply: options.apply,
			writesPaused: process.argv.includes('--writes-paused'),
			report: (row) => console.log(JSON.stringify(row)),
		});
		console.log(JSON.stringify(summary));
		if (summary.conflicts) process.exitCode = 2;
	} finally {
		await connection.close();
	}
}

module.exports = { parseArgs, reconcile };
if (require.main === module) {
	main().catch(() => {
		// Never print connection strings, Mongo errors, credentials, paths or stack traces.
		console.error(
			'Reconciliation failed. Check options, configuration and database availability; partial apply is possible.',
		);
		process.exitCode = 1;
	});
}
