const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
	{
		memberType: { type: String, enum: ['ADMIN'], default: 'ADMIN' },
		memberStatus: { type: String, enum: ['ACTIVE', 'BLOCK'], default: 'ACTIVE' },
		memberPhone: { type: String, required: true, unique: true },
		memberNick: { type: String, required: true, unique: true },
		memberPassword: { type: String, required: true, select: false },
	},
	{ timestamps: true, collection: 'members' },
);

async function main() {
	const uri = process.env.MONGODB_URI;
	const memberNick = process.env.AURELIS_ADMIN_NICK;
	const memberPhone = process.env.AURELIS_ADMIN_PHONE;
	const password = process.env.AURELIS_ADMIN_PASSWORD;
	if (!uri || !memberNick || !memberPhone || !password) {
		throw new Error('Set MONGODB_URI, AURELIS_ADMIN_NICK, AURELIS_ADMIN_PHONE, and AURELIS_ADMIN_PASSWORD');
	}
	if (password.length < 12) throw new Error('AURELIS_ADMIN_PASSWORD must contain at least 12 characters');

	await mongoose.connect(uri);
	try {
		const Member = mongoose.model('AurelisAdminMember', schema);
		const exists = await Member.exists({ $or: [{ memberNick }, { memberPhone }] });
		if (exists) throw new Error('A member already uses this nickname or phone number');
		await Member.create({
			memberType: 'ADMIN',
			memberStatus: 'ACTIVE',
			memberNick,
			memberPhone,
			memberPassword: await bcrypt.hash(password, 12),
		});
		process.stdout.write(`Created Aurelis administrator: ${memberNick}\n`);
	} finally {
		await mongoose.disconnect();
	}
}

main().catch((error) => {
	process.stderr.write(`${error.message}\n`);
	process.exitCode = 1;
});
