const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, lowercase: true, trim: true },
		password: { type: String, required: true, select: false },
		role: { type: String, enum: ['ADMIN', 'USER', 'OWNER', 'CREW'], required: true },
		status: { type: String, enum: ['ACTIVE', 'BLOCKED', 'DELETED'], required: true },
	},
	{ timestamps: true, collection: 'members' },
);
memberSchema.index({ email: 1 }, { unique: true, sparse: true });

async function main() {
	const uri = process.env.MONGODB_URI;
	const email = process.env.AURELIS_ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.AURELIS_ADMIN_PASSWORD;
	if (!uri || !email || !password) {
		throw new Error('Set MONGODB_URI, AURELIS_ADMIN_EMAIL, and AURELIS_ADMIN_PASSWORD');
	}
	if (password.length < 12) throw new Error('AURELIS_ADMIN_PASSWORD must contain at least 12 characters');

	await mongoose.connect(uri);
	try {
		const Member = mongoose.model('AurelisAdminMember', memberSchema);
		if (await Member.exists({ email })) throw new Error('A member already uses this email address');
		await Member.create({
			email,
			password: await bcrypt.hash(password, 12),
			role: 'ADMIN',
			status: 'ACTIVE',
		});
		process.stdout.write('Created Aurelis administrator account.\n');
	} finally {
		await mongoose.disconnect();
	}
}

main().catch((error) => {
	process.stderr.write('Administrator provisioning failed. Check the required configuration and database connectivity.\n');
	process.exitCode = 1;
});
