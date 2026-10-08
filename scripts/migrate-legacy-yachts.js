const mongoose = require('mongoose');

function planYachtMigration(document) {
	const set = {};
	const unset = {};
	const owns = (field) => Object.prototype.hasOwnProperty.call(document, field);
	if (Array.isArray(document.listingModes) && document.listingModes.includes('SALES')) {
		set.listingModes = [...new Set(document.listingModes.map((mode) => (mode === 'SALES' ? 'SALE' : mode)))];
	}
	if (owns('charterRate')) {
		if (
			typeof document.charterRate !== 'number' ||
			!Number.isFinite(document.charterRate) ||
			document.charterRate < 0
		) {
			return { conflict: 'Invalid legacy charterRate' };
		}
		if (owns('charterPrice') && document.charterPrice !== document.charterRate) {
			return { conflict: 'Conflicting charterPrice and charterRate; manual review required' };
		}
		if (!owns('charterPrice')) set.charterPrice = document.charterRate;
		unset.charterRate = '';
	}
	const update = {};
	if (Object.keys(set).length) update.$set = set;
	if (Object.keys(unset).length) update.$unset = unset;
	// Optimistic predicates prevent overwriting a concurrent canonical price or mode update.
	const filter = { _id: document._id };
	for (const field of ['listingModes', 'charterPrice', 'charterRate']) {
		filter[field] = owns(field) ? { $eq: document[field], $exists: true } : { $exists: false };
	}
	return { filter, update };
}

async function main() {
	if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be configured');
	if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Only --apply is supported');
	const apply = process.argv.includes('--apply');
	await mongoose.connect(process.env.MONGODB_URI);
	try {
		const collection = mongoose.connection.collection('yachts');
		const match = { $or: [{ listingModes: 'SALES' }, { charterRate: { $exists: true } }] };
		const count = await collection.countDocuments(match);
		process.stdout.write(`${apply ? 'Apply' : 'Dry run'}: ${count} matching yacht document(s).\n`);
		process.stdout.write(
			'Transform SALES to SALE; copy legacy charterRate only when charterPrice is absent; remove an equal/copied legacy alias. Conflicts are skipped.\n',
		);
		let proposed = 0,
			conflicts = 0,
			changed = 0,
			concurrent = 0;
		for await (const document of collection.find(match, {
			projection: { _id: 1, listingModes: 1, charterRate: 1, charterPrice: 1 },
		})) {
			const plan = planYachtMigration(document);
			if (plan.conflict) {
				conflicts++;
				process.stdout.write(`Conflict yacht ${document._id}: ${plan.conflict}\n`);
				continue;
			}
			if (!Object.keys(plan.update).length) continue;
			proposed++;
			process.stdout.write(`Proposed yacht ${document._id}: ${JSON.stringify(plan.update)}\n`);
			if (apply) {
				const result = await collection.updateOne(plan.filter, plan.update);
				changed += result.modifiedCount;
				if (!result.matchedCount) concurrent++;
			}
		}
		process.stdout.write(
			`Proposed: ${proposed}; conflicts: ${conflicts}; changed: ${changed}; concurrent skips: ${concurrent}.\n`,
		);
		if (!apply) process.stdout.write('No database changes made. Review before explicitly passing --apply.\n');
	} finally {
		await mongoose.disconnect();
	}
}

module.exports = { planYachtMigration };
if (require.main === module)
	main().catch(() => {
		process.stderr.write(
			'Yacht migration failed. Review configuration and connectivity; database details are suppressed.\n',
		);
		process.exitCode = 1;
	});
