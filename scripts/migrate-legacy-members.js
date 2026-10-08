const mongoose = require('mongoose');

function loadMappings() {
	try {
		const mappings = JSON.parse(process.env.AURELIS_LEGACY_ADMIN_EMAILS || '{}');
		if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) throw new Error();
		return mappings;
	} catch {
		throw new Error('AURELIS_LEGACY_ADMIN_EMAILS must be a JSON object mapping legacy member _id values to email addresses');
	}
}

function normalizeEmail(value) {
	if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
		throw new Error('Every legacy admin mapping must contain a valid email address');
	}
	return value.trim().toLowerCase();
}

async function main() {
	const uri = process.env.MONGODB_URI;
	if (!uri) throw new Error('MONGODB_URI must be configured');
	const mappings = loadMappings();
	const apply = process.argv.includes('--apply');
	await mongoose.connect(uri);
	try {
		const collection = mongoose.connection.collection('members');
		const indexes = await collection.indexes();
		const legacyPhoneIndex = indexes.find((index) => index.key?.memberPhone === 1 && index.unique);
		const legacyNickIndex = indexes.find((index) => index.key?.memberNick === 1 && index.unique);
		const legacyMembers = await collection.find({ memberType: 'ADMIN', email: { $exists: false } }, { projection: { _id: 1 } }).toArray();
		const mappedIds = new Set(Object.keys(mappings));
		if (legacyMembers.some((member) => !mappedIds.has(member._id.toString()))) {
			throw new Error('Every legacy administrator without an email must have an explicit mapping');
		}
		const updates = [];
		const mappedEmails = new Set();
		for (const [id, rawEmail] of Object.entries(mappings)) {
			if (!mongoose.isValidObjectId(id)) throw new Error('A legacy admin mapping contains an invalid member _id');
			const email = normalizeEmail(rawEmail);
			if (mappedEmails.has(email)) throw new Error('Legacy administrator mappings must use distinct email addresses');
			mappedEmails.add(email);
			const member = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
			if (!member || member.memberType !== 'ADMIN' || !member.memberPassword) {
				throw new Error('A mapped legacy administrator was not found or is missing its password hash');
			}
			const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const conflict = await collection.findOne({ email: { $regex: `^${escapedEmail}$`, $options: 'i' }, _id: { $ne: member._id } });
			if (conflict) throw new Error('A mapped email address is already used by another member');
			const status = member.memberStatus === 'BLOCK' ? 'BLOCKED' : member.memberStatus === 'ACTIVE' ? 'ACTIVE' : null;
			if (!status) throw new Error('A mapped legacy administrator has an unsupported status');
			updates.push({ _id: member._id, email, password: member.memberPassword, role: 'ADMIN', status });
		}

		if (!updates.length) throw new Error('Provide at least one explicit legacy admin email mapping');
		process.stdout.write(`${apply ? 'Applying' : 'Dry run:'} ${updates.length} legacy admin mapping(s).\n`);
		if (!apply) {
			process.stdout.write('No database changes made. Re-run with --apply only after reviewing the mappings.\n');
			return;
		}

		for (const update of updates) {
			await collection.updateOne(
				{ _id: update._id },
				{ $set: { email: update.email, password: update.password, role: update.role, status: update.status, updatedAt: new Date() } },
			);
		}
		if (legacyPhoneIndex) await collection.dropIndex(legacyPhoneIndex.name);
		if (legacyNickIndex) await collection.dropIndex(legacyNickIndex.name);
		await collection.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
		await collection.createIndex({ googleId: 1 }, { unique: true, sparse: true, name: 'googleId_1' });
		process.stdout.write('Legacy admins mapped. Existing legacy fields and member documents were preserved.\n');
	} finally {
		await mongoose.disconnect();
	}
}

main().catch((error) => {
	process.stderr.write('Legacy member migration failed. Review the explicit mappings and database connectivity.\n');
	process.exitCode = 1;
});
