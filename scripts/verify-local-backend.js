/* Opt-in Step 17 verification. Only loopback URLs and fresh aurelis_step17_* databases. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { io } = require('socket.io-client');
const { getIntrospectionQuery, buildClientSchema, printSchema, validateSchema } = require('graphql');
const bcrypt = require('bcryptjs');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = {
	cases: [],
	operations: {},
	sockets: {},
	indexes: {},
	limitations: ['Live Google login requires an external verified Google token; not supplied.'],
};
for (const event of [
	'socket:ready',
	'message:send',
	'message:new',
	'message:read',
	'conversation:presence',
	'socket:error',
	'room:join',
	'room:leave',
	'presence:status',
	'presence:heartbeat',
	'typing:start',
	'typing:stop',
])
	report.sockets[event] = { positive: 0, negative: 0, failed: 0 };
const sockets = [];
let mongo, redis, schema, api, api2, admin, customer, broker, third, broker2, yacht, conversation;
const output = path.resolve('.tmp/step17');
const suffix = Date.now().toString(36);
const password = 'Local-Step17-Test-Password-42';
const mongoUri = process.env.STEP17_MONGODB_URI;
const redisUri = process.env.STEP17_REDIS_URL;
function localUrl(value, protocols) {
	const u = new URL(value);
	assert(
		protocols.includes(u.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname),
		'Only loopback targets allowed',
	);
	assert(!u.username && !u.password, 'Credential-bearing URLs are not accepted');
	return u;
}
function mark(kind, name, ok, positive) {
	const target = kind === 'socket' ? report.sockets : report.operations;
	const item = (target[name] ||= { positive: 0, negative: 0, failed: 0 });
	item[ok ? (positive ? 'positive' : 'negative') : 'failed']++;
}
async function check(name, fn) {
	try {
		await fn();
		report.cases.push({ name, status: 'PASS' });
		console.log('PASS ' + name);
	} catch (error) {
		report.cases.push({ name, status: 'FAIL', reason: String(error.message).slice(0, 400) });
		console.log('FAIL ' + name + ': ' + String(error.message).slice(0, 400));
	}
}
async function raw(query, variables, token, url = api) {
	const response = await fetch(url + '/graphql', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
		body: JSON.stringify({ query, variables }),
		signal: AbortSignal.timeout(10000),
	});
	return response.json();
}
function field(name) {
	const q = schema.getQueryType().getFields()[name];
	const m = schema.getMutationType().getFields()[name];
	assert(q || m, 'Unknown operation ' + name);
	return { kind: q ? 'query' : 'mutation', value: q || m };
}
async function call(name, args = {}, select, token, errorCode, url = api) {
	const { kind, value } = field(name);
	const keys = Object.keys(args);
	const definitions = keys.map((k) => '$' + k + ': ' + value.args.find((a) => a.name === k)?.type.toString());
	const argText = keys.map((k) => k + ': $' + k).join(', ');
	const query =
		kind +
		(keys.length ? '(' + definitions.join(', ') + ')' : '') +
		' { ' +
		name +
		(keys.length ? '(' + argText + ')' : '') +
		(select ? ' { ' + select + ' }' : '') +
		' }';
	const result = await raw(query, args, token, url);
	try {
		if (errorCode) {
			assert(result.errors?.length, name + ' should reject');
			if (errorCode !== '*') assert.equal(result.errors[0].extensions.code, errorCode);
			assert(
				!JSON.stringify(result.errors).match(/stacktrace|mongodb:\/\/|redis:\/\/|C:\\\\Users|password:|JWT_SECRET=/i),
				'Unsafe public error',
			);
			mark('graphql', name, true, false);
			return result.errors[0];
		}
		assert(!result.errors, name + ' ' + JSON.stringify(result.errors));
		mark('graphql', name, true, true);
		return result.data[name];
	} catch (error) {
		mark('graphql', name, false, !errorCode);
		throw error;
	}
}
// Resets only this loopback HTTP identity between isolated validation scenarios.
// Actual exhaustion tests do not reset their window. No FLUSHDB/FLUSHALL is used.
async function resetHttpQuota(scope) {
	for (const ip of ['127.0.0.1', '::ffff:127.0.0.1']) {
		await redis.del('aurelis:rate:' + scope + ':' + crypto.createHash('sha256').update(ip).digest('hex'));
	}
}
async function account(label) {
	const r = await call(
		'register',
		{ input: { email: '  STEP17-' + label + '-' + suffix + '@EXAMPLE.TEST  ', password, confirmPassword: password } },
		'accessToken member { _id email role status }',
	);
	assert.equal(r.member.email, ('step17-' + label + '-' + suffix + '@example.test').toLowerCase());
	assert.equal(r.member.role, 'USER');
	assert.equal(r.member.status, 'ACTIVE');
	return { ...r.member, token: r.accessToken };
}
async function login(who) {
	const r = await call('login', { input: { email: who.email, password } }, 'accessToken member { _id role status }');
	who.token = r.accessToken;
	return r;
}
async function connect(who, url = api) {
	const socket = io(url, {
		auth: { token: who.token },
		transports: ['websocket'],
		reconnection: false,
		autoConnect: false,
		timeout: 5000,
	});
	sockets.push(socket);
	socket.on('presence:status', () => mark('socket', 'presence:status', true, true));
	socket.on('socket:error', () => mark('socket', 'socket:error', true, true));
	await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('socket ready timeout')), 7000);
		socket.once('socket:ready', () => {
			clearTimeout(timer);
			mark('socket', 'socket:ready', true, true);
			resolve();
		});
		socket.once('connect_error', (e) => {
			clearTimeout(timer);
			reject(new Error(e.message));
		});
		socket.connect();
	});
	return socket;
}
async function rejectedSocket(token) {
	const s = io(api, {
		auth: { token },
		transports: ['websocket'],
		reconnection: false,
		autoConnect: false,
		timeout: 5000,
	});
	sockets.push(s);
	await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('socket rejection timeout')), 7000);
		s.once('connect_error', (e) => {
			clearTimeout(timer);
			assert.equal(e.message, 'SOCKET_UNAUTHENTICATED');
			mark('socket', 'handshake', true, false);
			resolve();
		});
		s.once('socket:ready', () => {
			clearTimeout(timer);
			reject(new Error('Invalid socket admitted'));
		});
		s.connect();
	});
	s.disconnect();
}
async function ack(s, name, payload, ok = true) {
	const r = await s.timeout(6000).emitWithAck(name, payload);
	try {
		assert.equal(r.ok, ok, name + ' ' + JSON.stringify(r));
		mark('socket', name, true, ok);
		return r;
	} catch (error) {
		mark('socket', name, false, ok);
		throw error;
	}
}
function once(s, event) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			s.off(event, listener);
			reject(new Error(event + ' timeout'));
		}, 7000);
		const listener = (data) => {
			clearTimeout(timer);
			mark('socket', event, true, true);
			resolve(data);
		};
		s.once(event, listener);
	});
}
const pageSelect = 'list { _id } total page limit totalPages';
const yachtSelect =
	'_id name status listingModes charterPrice charterRate salePrice destinationIds brokerId viewsCount likesCount';
const convSelect = '_id customerId yachtId brokerId brokerMemberId lastMessageAt unreadCount';
const msgSelect = '_id conversationId senderId text readAt createdAt';
async function main() {
	assert(process.argv.includes('--run'), 'Use --run with explicit local test configuration');
	api = process.env.STEP17_API_URL;
	api2 = process.env.STEP17_SECOND_API_URL || api;
	localUrl(api, ['http:']);
	localUrl(api2, ['http:']);
	const mu = localUrl(mongoUri, ['mongodb:']);
	assert(/^\/aurelis_step17_[a-z0-9_]+$/.test(mu.pathname), 'Fresh test database prefix required');
	const ru = localUrl(redisUri, ['redis:']);
	assert(/^\/(?:[1-9]|1[0-5])$/.test(ru.pathname), 'Dedicated nonzero Redis logical database required');
	await fs.mkdir(output, { recursive: true });
	mongo = await mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 3000 }).asPromise();
	redis = new Redis(redisUri, { maxRetriesPerRequest: 0, commandTimeout: 3000 });
	await redis.ping();
	await check('real stack health on both API instances', async () => {
		for (const base of [api, api2])
			for (const route of ['/', '/health/redis', '/health/socket']) {
				const r = await fetch(base + route);
				assert.equal(r.status, 200);
				const text = await r.text();
				if (route !== '/') assert.equal(JSON.parse(text).status, 'ok', route + ' degraded');
			}
		assert.equal((await mongo.db.command({ ping: 1 })).ok, 1);
	});
	const intro = await raw(getIntrospectionQuery());
	assert(!intro.errors, 'Introspection failed');
	schema = buildClientSchema(intro.data);
	await fs.writeFile(output + '/schema.graphql', printSchema(schema));
	for (const type of [schema.getQueryType(), schema.getMutationType()])
		for (const n of Object.keys(type.getFields())) report.operations[n] = { positive: 0, negative: 0, failed: 0 };
	await check('generated schema: validation, compatibility and no obsolete fields', async () => {
		assert.equal(validateSchema(schema).length, 0);
		assert.equal(schema.getType('Yachts').getFields().total.type.toString(), 'Float!');
		assert.equal(schema.getType('YachtInquiries').getFields().total.type.toString(), 'Float!');
		assert.equal(schema.getType('Crews').getFields().total.type.toString(), 'Int!');
		assert.equal(schema.getType('BrokerProfiles').getFields().total.type.toString(), 'Float!');
		assert.equal(schema.getType('Member').getFields().password, undefined);
		assert(
			!printSchema(schema).match(/memberNick|memberPhone|MemberType|staffLogin|StaffAuth|type Property|type Agent/),
		);
		assert(
			schema
				.getType('InquiryType')
				.getValues()
				.some((x) => x.name === 'SALES'),
		);
		assert(
			schema
				.getType('YachtListingMode')
				.getValues()
				.some((x) => x.name === 'SALE'),
		);
	});
	assert.equal(await call('sayHello'), 'Aurelis Yacht API');
	customer = await account('customer');
	broker = await account('broker');
	third = await account('third');
	broker2 = await account('broker2');
	admin = await account('admin');
	await mongo
		.collection('members')
		.updateOne({ _id: new mongoose.Types.ObjectId(admin._id) }, { $set: { role: 'ADMIN' } });
	await check('registration normalization, hash, duplicate, validation and spoofing', async () => {
		const stored = await mongo.collection('members').findOne({ _id: new mongoose.Types.ObjectId(customer._id) });
		assert(await bcrypt.compare(password, stored.password));
		assert.notEqual(stored.password, password);
		assert.equal(stored.confirmPassword, undefined);
		await call(
			'register',
			{ input: { email: customer.email, password, confirmPassword: password } },
			'member { _id }',
			undefined,
			'AUTH_EMAIL_ALREADY_EXISTS',
		);
		await call(
			'register',
			{ input: { email: 'invalid', password, confirmPassword: password } },
			'member { _id }',
			undefined,
			'*',
		);
		await call(
			'register',
			{ input: { email: 'mismatch-' + suffix + '@example.test', password, confirmPassword: 'different' } },
			'member { _id }',
			undefined,
			'AUTH_PASSWORD_MISMATCH',
		);
		for (const forged of [{ role: 'ADMIN' }, { status: 'ACTIVE' }])
			await call(
				'register',
				{ input: { email: 'spoof-' + suffix + '@example.test', password, confirmPassword: password, ...forged } },
				'member { _id }',
				undefined,
				'*',
			);
		const claims = JSON.parse(Buffer.from(customer.token.split('.')[1], 'base64url'));
		assert.equal(claims.memberId, customer._id);
		assert.equal(claims.role, 'USER');
		assert.equal(claims.status, 'ACTIVE');
	});
	await check('password login and getMe', async () => {
		await login(customer);
		await login(broker);
		await login(admin);
		await login(broker2);
		const me = await call('getMe', {}, '_id email role status', customer.token);
		assert.equal(me._id, customer._id);
		await call('getMe', {}, '_id', 'invalid', 'AUTH_INVALID_TOKEN');
		const wrong = await call(
			'login',
			{ input: { email: customer.email, password: 'incorrect' } },
			'member { _id }',
			undefined,
			'AUTH_INVALID_CREDENTIALS',
		);
		const unknown = await call(
			'login',
			{ input: { email: 'missing-' + suffix + '@example.test', password } },
			'member { _id }',
			undefined,
			'AUTH_INVALID_CREDENTIALS',
		);
		assert.equal(wrong.message, unknown.message);
		await call('login', { input: { email: 'invalid', password } }, 'member { _id }', undefined, '*');
	});
	await check('live invalid Google token rejects safely', async () => {
		await call(
			'googleLogin',
			{ input: { credential: 'invalid-google-token' } },
			'member { _id }',
			undefined,
			'AUTH_GOOGLE_INVALID',
		);
	});
	await check('blocked/deleted and expired JWT rejection', async () => {
		const { JwtService } = require('@nestjs/jwt');
		const jwt = new JwtService({ secret: process.env.STEP17_JWT_SECRET });
		const expired = jwt.sign({ memberId: customer._id }, { expiresIn: -1 });
		await call('getMe', {}, '_id', expired, 'AUTH_INVALID_TOKEN');
		for (const status of ['BLOCKED', 'DELETED']) {
			await mongo
				.collection('members')
				.updateOne({ _id: new mongoose.Types.ObjectId(third._id) }, { $set: { status } });
			await call('getMe', {}, '_id', third.token, 'AUTH_ACCOUNT_' + status);
			await rejectedSocket(third.token);
			await resetHttpQuota('login');
			await call(
				'login',
				{ input: { email: third.email, password } },
				'member { _id }',
				undefined,
				'AUTH_ACCOUNT_' + status,
			);
		}
		await mongo
			.collection('members')
			.updateOne({ _id: new mongoose.Types.ObjectId(third._id) }, { $set: { status: 'ACTIVE' } });
		await rejectedSocket('invalid-token');
		await rejectedSocket(expired);
	});
	const office = await call(
		'createOffice',
		{
			input: {
				name: 'Step17 Office ' + suffix,
				country: 'France',
				city: 'Nice',
				addressLine1: '1 Marina',
				status: 'PUBLISHED',
				featured: true,
				timezone: 'Europe/Paris',
				businessHours: [{ day: 'MONDAY', openTime: '09:00', closeTime: '17:00' }],
			},
		},
		'_id slug businessHours { day openTime closeTime }',
		admin.token,
	);
	const bp = await call(
		'saveBrokerProfile',
		{
			input: { name: 'Step17 Broker', email: broker.email, memberId: broker._id, officeId: office._id, isActive: true },
		},
		'_id officeId',
		admin.token,
	);
	const bp2 = await call(
		'saveBrokerProfile',
		{ input: { name: 'Step17 Broker Two', email: broker2.email, memberId: broker2._id, isActive: true } },
		'_id',
		admin.token,
	);
	const region = await call(
		'createDestination',
		{ input: { name: 'Step17 Region ' + suffix, type: 'REGION', status: 'PUBLISHED', featured: true } },
		'_id slug',
		admin.token,
	);
	const country = await call(
		'createDestination',
		{
			input: {
				name: 'Step17 Country ' + suffix,
				type: 'COUNTRY',
				status: 'PUBLISHED',
				parentId: region._id,
				country: 'France',
			},
		},
		'_id slug',
		admin.token,
	);
	const area = await call(
		'createDestination',
		{ input: { name: 'Step17 Area ' + suffix, type: 'AREA', status: 'PUBLISHED', parentId: country._id } },
		'_id slug',
		admin.token,
	);
	const baseYacht = {
		name: 'Step17 Yacht ' + suffix,
		builder: 'Test Builder',
		model: 'Model17',
		location: 'Nice',
		country: 'France',
		lengthM: 32,
		cabins: 4,
		guests: 8,
		listingModes: ['SALE', 'CHARTER'],
		salePrice: 1000000,
		saleCurrency: 'EUR',
		charterRate: 50000,
		charterCurrency: 'EUR',
		status: 'PUBLISHED',
		featured: true,
		brokerId: bp._id,
		destinationIds: [area._id],
	};
	yacht = await call('createYacht', { input: baseYacht }, yachtSelect, admin.token);
	const saleOnly = await call(
		'createYacht',
		{
			input: {
				...baseYacht,
				name: 'Sale Only ' + suffix,
				listingModes: ['SALE'],
				salePrice: 2000000,
				charterRate: undefined,
				charterCurrency: undefined,
			},
		},
		yachtSelect,
		admin.token,
	);
	const charterOnly = await call(
		'createYacht',
		{
			input: {
				...baseYacht,
				name: 'Charter Only ' + suffix,
				listingModes: ['CHARTER'],
				salePrice: undefined,
				saleCurrency: undefined,
			},
		},
		yachtSelect,
		admin.token,
	);
	const draft = await call(
		'createYacht',
		{ input: { ...baseYacht, name: 'Draft ' + suffix, status: 'DRAFT' } },
		yachtSelect,
		admin.token,
	);
	const archive = await call(
		'createYacht',
		{ input: { ...baseYacht, name: 'Archive ' + suffix, status: 'ARCHIVED' } },
		yachtSelect,
		admin.token,
	);
	await check('all Yacht catalog filters, sorts and canonical pricing', async () => {
		assert.equal(yacht.charterPrice, 50000);
		assert.equal(yacht.charterRate, 50000);
		const stored = await mongo.collection('yachts').findOne({ _id: new mongoose.Types.ObjectId(yacht._id) });
		assert.equal(stored.charterPrice, 50000);
		assert.equal(stored.charterRate, undefined);
		const detail = await call('getYacht', { id: yacht._id }, yachtSelect + ' broker { _id }');
		assert.equal(detail.broker._id, bp._id);
		await call('getFeaturedYachts', { input: {} }, pageSelect);
		await call('getYachtsForStaff', { input: {} }, pageSelect, admin.token);
		for (const sortBy of [
			'NEWEST',
			'PRICE_ASC',
			'PRICE_DESC',
			'NAME_ASC',
			'NAME_DESC',
			'MOST_VIEWED',
			'MOST_LIKED',
			'POPULAR',
		]) {
			const p = await call(
				'getYachts',
				{ input: { sortBy, filter: { listingMode: 'SALE', currency: 'EUR' } } },
				'list { _id salePrice name status } total page limit totalPages',
			);
			assert(p.list.every((x) => x.status === 'PUBLISHED'));
			if (sortBy === 'PRICE_ASC' || sortBy === 'PRICE_DESC') {
				const prices = p.list.map((x) => x.salePrice);
				assert.deepEqual(
					prices,
					[...prices].sort((a, b) => (sortBy === 'PRICE_ASC' ? a - b : b - a)),
				);
			}
		}
		for (const filter of [
			{ listingMode: 'CHARTER' },
			{ builder: 'Test Builder' },
			{ model: 'Model17' },
			{ country: 'France' },
			{ location: 'Nice' },
			{ destinationId: area._id },
			{ featured: true },
			{ listingMode: 'SALE', currency: 'EUR', minPrice: 1, maxPrice: 1100000 },
			{ minLengthM: 30, maxLengthM: 40 },
			{ minCabins: 3, maxCabins: 5 },
			{ minGuests: 6, maxGuests: 10 },
		]) {
			const p = await call('getYachts', { input: { filter } }, pageSelect);
			assert(p.list.some((x) => x._id === yacht._id));
		}
		assert.equal((await call('getYachts', { input: { filter: { destinationId: region._id } } }, pageSelect)).total, 0);
		for (const id of [draft._id, archive._id]) await call('getYacht', { id }, yachtSelect, undefined, '*');
		await call(
			'updateYacht',
			{ input: { _id: yacht._id, name: 'Step17 Updated ' + suffix } },
			yachtSelect,
			admin.token,
		);
	});
	await check('atomic view increments, hidden rejection and legacy output', async () => {
		const start = (await call('getYacht', { id: yacht._id }, yachtSelect)).viewsCount;
		const counts = await Promise.all(Array.from({ length: 10 }, () => call('recordYachtView', { yachtId: yacht._id })));
		assert.equal(new Set(counts).size, 10);
		assert.equal((await call('getYacht', { id: yacht._id }, yachtSelect)).viewsCount, start + 10);
		for (const id of [draft._id, archive._id])
			await call('recordYachtView', { yachtId: id }, undefined, undefined, '*');
		await mongo
			.collection('yachts')
			.updateOne({ _id: new mongoose.Types.ObjectId(saleOnly._id) }, { $unset: { viewsCount: '', likesCount: '' } });
		const old = await call('getYacht', { id: saleOnly._id }, yachtSelect);
		assert.equal(old.viewsCount, 0);
		assert.equal(old.likesCount, 0);
	});
	await check('wishlist concurrency, unique likes, privacy, hidden and republication', async () => {
		const adds = await Promise.all(
			Array.from({ length: 8 }, () =>
				call('addYachtToWishlist', { yachtId: yacht._id }, '_id yachtId createdAt', customer.token),
			),
		);
		assert.equal(new Set(adds.map((x) => x._id)).size, 1);
		assert.equal((await call('getYacht', { id: yacht._id }, yachtSelect)).likesCount, 1);
		assert.equal(await call('isYachtWishlisted', { yachtId: yacht._id }, undefined, customer.token), true);
		assert.equal((await call('getMyWishlist', { input: {} }, pageSelect, third.token)).total, 0);
		await call('addYachtToWishlist', { yachtId: yacht._id }, '_id', third.token);
		assert.equal((await call('getYacht', { id: yacht._id }, yachtSelect)).likesCount, 2);
		await call('updateYacht', { input: { _id: yacht._id, status: 'DRAFT' } }, '_id', admin.token);
		assert.equal((await call('getMyWishlist', { input: {} }, pageSelect, customer.token)).total, 0);
		await call('isYachtWishlisted', { yachtId: yacht._id }, undefined, customer.token, '*');
		await call('updateYacht', { input: { _id: yacht._id, status: 'PUBLISHED' } }, '_id', admin.token);
		assert.equal((await call('getMyWishlist', { input: {} }, pageSelect, customer.token)).total, 1);
		assert.equal(await call('removeYachtFromWishlist', { yachtId: yacht._id }, undefined, customer.token), true);
		assert.equal(await call('removeYachtFromWishlist', { yachtId: yacht._id }, undefined, customer.token), false);
		assert.equal(
			(await call('toggleYachtWishlist', { yachtId: yacht._id }, 'yachtId wishlisted', customer.token)).wishlisted,
			true,
		);
		assert.equal(
			(await call('toggleYachtWishlist', { yachtId: yacht._id }, 'yachtId wishlisted', customer.token)).wishlisted,
			false,
		);
		await call('removeYachtFromWishlist', { yachtId: yacht._id }, undefined, third.token);
		assert.equal((await call('getYacht', { id: yacht._id }, yachtSelect)).likesCount, 0);
	});
	await check('live popularity cache partitions, TTL, hits and invalidations', async () => {
		const before = new Set(await redis.keys('aurelis:cache:popularity:*'));
		for (const sortBy of ['MOST_VIEWED', 'MOST_LIKED', 'POPULAR'])
			for (const listingMode of ['SALE', 'CHARTER'])
				for (const page of [1, 2]) {
					const args = { input: { sortBy, page, limit: 1, filter: { listingMode, currency: 'EUR' } } };
					const a = await call('getYachts', args, pageSelect);
					const b = await call('getYachts', args, pageSelect);
					assert.deepEqual(a, b);
				}
		const newKeys = (await redis.keys('aurelis:cache:popularity:*')).filter(
			(k) => !before.has(k) && !k.endsWith(':generation'),
		);
		assert(newKeys.length >= 12);
		for (const key of newKeys) {
			const ttl = await redis.ttl(key);
			assert(ttl > 0 && ttl <= 30);
			const v = JSON.parse(await redis.get(key));
			assert(!JSON.stringify(v).includes('email'));
		}
		let gen = await redis.get('aurelis:cache:popularity:generation');
		await call('recordYachtView', { yachtId: yacht._id });
		assert.notEqual(await redis.get('aurelis:cache:popularity:generation'), gen);
		gen = await redis.get('aurelis:cache:popularity:generation');
		await call('addYachtToWishlist', { yachtId: yacht._id }, '_id', customer.token);
		assert.notEqual(await redis.get('aurelis:cache:popularity:generation'), gen);
		await call('removeYachtFromWishlist', { yachtId: yacht._id }, undefined, customer.token);
	});
	await check('Crew CAPTAIN/CHEF, member uniqueness, visibility and filters', async () => {
		for (const role of ['CAPTAIN', 'CHEF']) {
			const c = await call(
				'createCrewProfile',
				{
					input: {
						role,
						firstName: 'Step17',
						lastName: role,
						memberId: role === 'CAPTAIN' ? customer._id : broker._id,
						status: 'PUBLISHED',
						featured: true,
						nationality: 'France',
						location: 'Nice',
						languages: ['English'],
						experienceYears: 10,
					},
				},
				'_id displayName',
				admin.token,
			);
			assert(c.displayName.includes('Step17'));
			await call('getCrew', { id: c._id }, '_id role displayName');
			assert.equal(
				(
					await call(
						'getCrews',
						{ input: { filter: { role, language: 'English', minExperienceYears: 5 } } },
						pageSelect,
					)
				).total,
				1,
			);
			await call('updateCrewProfile', { input: { _id: c._id, status: 'DRAFT' } }, '_id', admin.token);
			await call('getCrew', { id: c._id }, '_id', undefined, '*');
			await call('updateCrewProfile', { input: { _id: c._id, status: 'ARCHIVED' } }, '_id', admin.token);
			await call('getCrew', { id: c._id }, '_id', undefined, '*');
			await call('updateCrewProfile', { input: { _id: c._id, status: 'PUBLISHED' } }, '_id', admin.token);
		}
		await call('getFeaturedCrews', { input: {} }, pageSelect);
		await call('getCrewsForStaff', { input: {} }, pageSelect, admin.token);
		await call(
			'createCrewProfile',
			{ input: { role: 'CHEF', firstName: 'Duplicate', memberId: customer._id } },
			'_id',
			admin.token,
			'*',
		);
	});
	await check('Destinations hierarchy, slug preservation, parent validation and cycles', async () => {
		for (const d of [region, country, area]) await call('getDestination', { slug: d.slug }, '_id slug');
		assert.equal(
			(await call('getDestinations', { input: { filter: { parentId: country._id, search: 'Step17' } } }, pageSelect))
				.total,
			1,
		);
		await call('getFeaturedDestinations', { input: {} }, pageSelect);
		await call('getDestinationsForAdmin', { input: {} }, pageSelect, admin.token);
		await call('updateDestination', { input: { _id: region._id, parentId: area._id } }, '_id', admin.token, '*');
		await call(
			'updateDestination',
			{ input: { _id: region._id, parentId: new mongoose.Types.ObjectId().toString() } },
			'_id',
			admin.token,
			'*',
		);
		const d = await call(
			'updateDestination',
			{ input: { _id: area._id, name: 'Renamed Step17 Area', parentId: null } },
			'_id slug parentId',
			admin.token,
		);
		assert.equal(d.slug, area.slug);
		assert.equal(d.parentId, null);
	});
	await check('Offices business hours, slug, filters and archive preserving broker links', async () => {
		await call('getOffice', { slug: office.slug }, '_id businessHours { day openTime closeTime }');
		assert.equal(
			(await call('getOffices', { input: { filter: { city: 'Nice', country: 'France' } } }, pageSelect)).total,
			1,
		);
		await call('getFeaturedOffices', { input: {} }, pageSelect);
		await call('getOfficesForAdmin', { input: {} }, pageSelect, admin.token);
		await call(
			'updateOffice',
			{ input: { _id: office._id, businessHours: [{ day: 'MONDAY', openTime: '17:00', closeTime: '09:00' }] } },
			'_id',
			admin.token,
			'*',
		);
		const o = await call(
			'updateOffice',
			{ input: { _id: office._id, name: 'Renamed Step17 Office', status: 'ARCHIVED' } },
			'_id slug',
			admin.token,
		);
		assert.equal(o.slug, office.slug);
		await call('getOffice', { slug: office.slug }, '_id', undefined, '*');
		const b = await call('getBrokerProfile', { id: bp._id }, '_id officeId');
		assert.equal(b.officeId, office._id);
		await call('getBrokerProfiles', {}, 'list { _id } total');
		await call('updateOffice', { input: { _id: office._id, status: 'PUBLISHED' } }, '_id', admin.token);
	});
	await check('Articles NEWS/INSIGHT/GUIDE publication timing and metadata', async () => {
		for (const type of ['NEWS', 'INSIGHT', 'GUIDE']) {
			const a = await call(
				'createArticle',
				{
					input: {
						title: 'Step17 ' + type + ' ' + suffix,
						type,
						status: 'PUBLISHED',
						content: 'Local verification plain text',
						featured: true,
						yachtIds: [yacht._id],
						destinationIds: [area._id],
						authorMemberId: customer._id,
					},
				},
				'_id slug publishedAt',
				admin.token,
			);
			assert(a.publishedAt);
			await call('getArticle', { slug: a.slug }, '_id content');
			const changed = await call(
				'updateArticle',
				{ input: { _id: a._id, title: 'Renamed ' + type, status: 'DRAFT' } },
				'_id slug publishedAt',
				admin.token,
			);
			assert.equal(changed.slug, a.slug);
			assert.equal(changed.publishedAt, a.publishedAt);
			await call('getArticle', { slug: a.slug }, '_id', undefined, '*');
			await call('updateArticle', { input: { _id: a._id, status: 'ARCHIVED' } }, '_id', admin.token);
			await call('getArticle', { slug: a.slug }, '_id', undefined, '*');
			await call('updateArticle', { input: { _id: a._id, status: 'PUBLISHED' } }, '_id', admin.token);
		}
		const future = await call(
			'createArticle',
			{
				input: {
					title: 'Future ' + suffix,
					type: 'NEWS',
					status: 'PUBLISHED',
					content: 'Scheduled text',
					publishAt: new Date(Date.now() + 86400000).toISOString(),
				},
			},
			'_id slug publishedAt',
			admin.token,
		);
		assert(future.publishedAt);
		await call('getArticle', { slug: future.slug }, '_id', undefined, '*');
		assert.equal((await call('getArticles', { input: { filter: { search: 'Renamed' } } }, pageSelect)).total, 3);
		await call('getFeaturedArticles', { input: {} }, pageSelect);
		await call('getArticlesForAdmin', { input: {} }, pageSelect, admin.token);
	});
	const contact = {
		yachtId: yacht._id,
		name: 'Step17 Contact',
		email: 'lead@example.test',
		message: 'Please contact me about this local test yacht.',
	};
	let charter, sales, sell;
	await check('guest/member charter and sales facades, privacy and canonical statuses', async () => {
		charter = await call(
			'submitCharterInquiry',
			{
				input: {
					...contact,
					startDate: '2026-01-01T00:00:00.000Z',
					endDate: '2026-01-07T00:00:00.000Z',
					guestCount: 4,
				},
			},
			'_id type status memberId',
		);
		assert.equal(charter.type, 'CHARTER');
		assert.equal(charter.status, 'NEW');
		assert.equal(charter.memberId, null);
		const authed = await call(
			'submitCharterInquiry',
			{ input: { ...contact, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-07T00:00:00.000Z' } },
			'_id memberId',
			customer.token,
		);
		assert.equal(authed.memberId, customer._id);
		sales = await call('submitSalesInquiry', { input: contact }, '_id type status memberId', customer.token);
		assert.equal(sales.type, 'SALES');
		assert.equal(sales.status, 'NEW');
		assert.equal(sales.memberId, customer._id);
		await call('submitSalesInquiry', { input: contact }, '_id memberId');
		await call('submitYachtInquiry', { input: { ...contact, type: 'SALES' } }, '_id type status');
		await call('getYachtInquiries', { input: {} }, pageSelect, admin.token);
		await call('getYachtInquiriesPage', { input: {} }, pageSelect, admin.token);
		await call('getYachtInquiry', { id: charter._id }, '_id type', admin.token);
		await call('updateYachtInquiry', { input: { _id: charter._id, status: 'CONTACTED' } }, '_id status', admin.token);
		await call('getYachtInquiry', { id: sales._id }, '_id', customer.token, 'AUTH_FORBIDDEN');
		const blocked = await call('submitSalesInquiry', { input: contact }, '_id', undefined, 'RATE_LIMITED');
		assert(blocked.extensions.retryAfterSeconds > 0);
	});
	await check('Sell Yacht persistence, validation and absence of side effects', async () => {
		const before = await mongo.collection('yachts').countDocuments();
		const input = {
			ownerName: 'Step17 Owner',
			email: 'owner@example.test',
			phone: '+1 234 567',
			yachtName: 'Step17 Intake',
			builder: 'Test Builder',
			yearBuilt: 2020,
			lengthM: 30,
			location: 'Nice',
			country: 'France',
			askingPrice: 100000,
			currency: 'EUR',
		};
		sell = await call('submitSellYachtRequest', { input }, '_id status memberId', customer.token);
		assert.equal(sell.memberId, customer._id);
		assert.equal(await mongo.collection('yachts').countDocuments(), before);
		assert.equal((await call('getMe', {}, 'role', customer.token)).role, 'USER');
		const saved = await mongo.collection('sellYachtRequests').findOne({ _id: new mongoose.Types.ObjectId(sell._id) });
		assert.equal(saved.brokerId, undefined);
		assert.equal(saved.yachtId, undefined);
		await call('getSellYachtRequestsForAdmin', { input: {} }, pageSelect, admin.token);
		await call('getSellYachtRequest', { id: sell._id }, '_id', admin.token);
		await call(
			'updateSellYachtRequestStatus',
			{ input: { requestId: sell._id, status: 'CONTACTED' } },
			'_id status',
			admin.token,
		);
		await call(
			'submitSellYachtRequest',
			{ input: { ...input, askingPrice: 100, currency: undefined } },
			'_id',
			undefined,
			'*',
		);
		for (const bad of [{ phone: '' }, { email: 'invalid' }, { lengthM: -1 }])
			await call('submitSellYachtRequest', { input: { ...input, ...bad } }, '_id', undefined, '*');
	});

	await check('public write validation reaches services without quota interference', async () => {
		for (const [name, input] of [
			[
				'submitCharterInquiry',
				{
					...contact,
					yachtId: saleOnly._id,
					startDate: '2026-01-01T00:00:00.000Z',
					endDate: '2026-01-07T00:00:00.000Z',
				},
			],
			['submitSalesInquiry', { ...contact, yachtId: charterOnly._id }],
			[
				'submitCharterInquiry',
				{ ...contact, startDate: '2026-01-07T00:00:00.000Z', endDate: '2026-01-01T00:00:00.000Z' },
			],
			[
				'submitCharterInquiry',
				{ ...contact, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-07T00:00:00.000Z', guestCount: 9 },
			],
			[
				'submitCharterInquiry',
				{ ...contact, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-07T00:00:00.000Z', guestCount: -1 },
			],
			['submitSalesInquiry', { ...contact, yachtId: draft._id }],
			['submitSalesInquiry', { ...contact, yachtId: 'invalid' }],
			['submitSalesInquiry', { ...contact, name: '' }],
			['submitSalesInquiry', { ...contact, email: 'invalid' }],
			['submitSalesInquiry', { ...contact, message: 'x'.repeat(4001) }],
			['submitYachtInquiry', { ...contact, type: 'SALE' }],
			['submitSalesInquiry', { ...contact, memberId: third._id }],
		]) {
			await resetHttpQuota('inquiry');
			const before = await mongo.collection('yachtInquiries').countDocuments();
			const error = await call(name, { input }, '_id', undefined, '*');
			assert.notEqual(error.extensions.code, 'RATE_LIMITED');
			assert.equal(await mongo.collection('yachtInquiries').countDocuments(), before);
		}
		await resetHttpQuota('sell');
		const sellBase = {
			ownerName: 'Validation',
			email: 'owner@example.test',
			phone: '123',
			yachtName: 'Test',
			builder: 'Test',
			yearBuilt: 2020,
			lengthM: 30,
			location: 'Nice',
			country: 'France',
		};
		for (const [field, value] of [
			['ownerName', ''],
			['email', 'bad'],
			['phone', ''],
			['yachtName', ''],
			['builder', ''],
			['yearBuilt', 1799],
			['lengthM', -1],
			['location', ''],
			['country', ''],
			['description', 'x'.repeat(4001)],
		]) {
			await resetHttpQuota('sell');
			const before = await mongo.collection('sellYachtRequests').countDocuments();
			const error = await call(
				'submitSellYachtRequest',
				{ input: { ...sellBase, [field]: value } },
				'_id',
				undefined,
				'*',
			);
			assert.notEqual(error.extensions.code, 'RATE_LIMITED');
			assert.equal(await mongo.collection('sellYachtRequests').countDocuments(), before);
		}
		await call(
			'updateYacht',
			{ input: { _id: yacht._id, destinationIds: [area._id, area._id.toUpperCase()] } },
			'_id',
			admin.token,
			'*',
		);
		await call('getYachts', { input: { filter: { minLengthM: 100, maxLengthM: 1 } } }, pageSelect, undefined, '*');
		await call(
			'getYachts',
			{ input: { filter: { minPrice: 100, maxPrice: 1, listingMode: 'SALE', currency: 'EUR' } } },
			pageSelect,
			undefined,
			'*',
		);
	});

	// Inspect authorization on every implemented ADMIN resolver, using valid current args.
	await check('all ADMIN domain operations deny USER', async () => {
		const attempts = [
			['getYachtsForStaff', { input: {} }, pageSelect],
			['createYacht', { input: baseYacht }, '_id'],
			['updateYacht', { input: { _id: yacht._id, name: 'Forbidden' } }, '_id'],
			['saveBrokerProfile', { input: { name: 'Forbidden', email: broker.email } }, '_id'],
			['getCrewsForStaff', { input: {} }, pageSelect],
			['createCrewProfile', { input: { role: 'CHEF', firstName: 'Forbidden' } }, '_id'],
			[
				'updateCrewProfile',
				{ input: { _id: new mongoose.Types.ObjectId().toString(), firstName: 'Forbidden' } },
				'_id',
			],
			['getDestinationsForAdmin', { input: {} }, pageSelect],
			['createDestination', { input: { name: 'Forbidden', type: 'AREA' } }, '_id'],
			['updateDestination', { input: { _id: area._id, name: 'Forbidden' } }, '_id'],
			['getOfficesForAdmin', { input: {} }, pageSelect],
			[
				'createOffice',
				{ input: { name: 'Forbidden', country: 'France', city: 'Nice', addressLine1: '1 Street' } },
				'_id',
			],
			['updateOffice', { input: { _id: office._id, name: 'Forbidden' } }, '_id'],
			['getArticlesForAdmin', { input: {} }, pageSelect],
			['createArticle', { input: { title: 'Forbidden', type: 'NEWS' } }, '_id'],
			['updateArticle', { input: { _id: new mongoose.Types.ObjectId().toString(), title: 'Forbidden' } }, '_id'],
			['getYachtInquiries', { input: {} }, pageSelect],
			['getYachtInquiriesPage', { input: {} }, pageSelect],
			['getYachtInquiry', { id: sales._id }, '_id'],
			['updateYachtInquiry', { input: { _id: sales._id, status: 'CLOSED' } }, '_id'],
			['getSellYachtRequestsForAdmin', { input: {} }, pageSelect],
			['getSellYachtRequest', { id: sell._id }, '_id'],
			['updateSellYachtRequestStatus', { input: { requestId: sell._id, status: 'CLOSED' } }, '_id'],
		];
		for (const [n, args, sel] of attempts) await call(n, args, sel, customer.token, 'AUTH_FORBIDDEN');
	});
	await check('every paginated endpoint bounds, totals, last/empty pages', async () => {
		const entries = [
			['getBrokerProfiles', null],
			['getYachts', null],
			['getFeaturedYachts', null],
			['getYachtsForStaff', admin.token],
			['getCrews', null],
			['getFeaturedCrews', null],
			['getCrewsForStaff', admin.token],
			['getDestinations', null],
			['getFeaturedDestinations', null],
			['getDestinationsForAdmin', admin.token],
			['getOffices', null],
			['getFeaturedOffices', null],
			['getOfficesForAdmin', admin.token],
			['getArticles', null],
			['getFeaturedArticles', null],
			['getArticlesForAdmin', admin.token],
			['getMyWishlist', customer.token],
			['getYachtInquiriesPage', admin.token],
			['getSellYachtRequestsForAdmin', admin.token],
			['getMyConversations', customer.token],
		];
		for (const [n, t] of entries) {
			const first = await call(n, { input: { page: 1, limit: 1 } }, pageSelect, t);
			assert.equal(first.totalPages, first.total);
			assert.equal(first.page, 1);
			assert.equal(first.limit, 1);
			const last = await call(n, { input: { page: Math.max(1, first.totalPages), limit: 1 } }, pageSelect, t);
			assert.equal(last.total, first.total);
			const empty = await call(n, { input: { page: first.totalPages + 2, limit: 1 } }, pageSelect, t);
			assert.equal(empty.list.length, 0);
			assert.equal(empty.total, first.total);
			for (const input of [{ page: 0 }, { page: -1 }, { limit: 0 }, { limit: 51 }])
				await call(n, { input }, pageSelect, t, '*');
		}
		assert.equal((await call('getYachtInquiries', { input: { limit: 101 } }, pageSelect, admin.token)).limit, 100);
	});
	conversation = await call('startYachtConversation', { yachtId: yacht._id }, convSelect, customer.token);
	assert.equal(conversation.customerId, customer._id);
	assert.equal(conversation.brokerMemberId, broker._id);
	assert.equal(conversation.brokerId, bp._id);
	const cs = await connect(customer);
	const bs = await connect(broker, api2);
	const ts = await connect(third, api2);
	const as = await connect(admin);
	await ack(cs, 'room:join', { conversationId: conversation._id });
	await ack(bs, 'room:join', { conversationId: conversation._id });
	await check('private persisted realtime messages across two actual API instances', async () => {
		let leaks = 0;
		ts.on('message:new', () => leaks++);
		let pending = once(bs, 'message:new');
		const m = await call(
			'sendMessage',
			{ input: { conversationId: conversation._id, text: 'Customer local test' } },
			msgSelect,
			customer.token,
		);
		const received = await pending;
		assert.equal(received._id, m._id);
		assert.equal(received.senderId, customer._id);
		assert(await mongo.collection('messages').findOne({ _id: new mongoose.Types.ObjectId(m._id) }));
		pending = once(cs, 'message:new');
		const reply = await ack(bs, 'message:send', {
			conversationId: conversation._id,
			text: 'Broker local reply',
			senderId: third._id,
		});
		const rec = await pending;
		assert.equal(rec.senderId, broker._id);
		assert.equal(rec._id, reply.message._id);
		await sleep(300);
		assert.equal(leaks, 0);
		const c = await call('getConversation', { conversationId: conversation._id }, convSelect, customer.token);
		assert(new Date(c.lastMessageAt) >= new Date(m.createdAt));
		await call('getMyConversations', { input: {} }, pageSelect, customer.token);
		const history = await call(
			'getConversationMessages',
			{ conversationId: conversation._id, input: { page: 1, limit: 1 } },
			'list { _id createdAt } total page limit totalPages',
			customer.token,
		);
		assert.equal(history.total, 2);
		assert.equal(history.list[0]._id, rec._id);
	});
	await check('recipient unread, mark read, sender ownership and realtime receipt', async () => {
		assert.equal(
			(await call('getConversation', { conversationId: conversation._id }, convSelect, customer.token)).unreadCount,
			1,
		);
		assert.equal(
			(await call('getConversation', { conversationId: conversation._id }, convSelect, broker.token)).unreadCount,
			1,
		);
		let receipt = once(cs, 'message:read');
		const read = await ack(bs, 'message:read', { conversationId: conversation._id });
		assert.equal(read.modifiedCount, 1);
		await receipt;
		assert.equal(
			(await call('getConversation', { conversationId: conversation._id }, convSelect, broker.token)).unreadCount,
			0,
		);
		receipt = once(bs, 'message:read');
		const r = await call(
			'markConversationRead',
			{ conversationId: conversation._id },
			'modifiedCount readAt',
			customer.token,
		);
		assert.equal(r.modifiedCount, 1);
		await receipt;
		const rows = await mongo
			.collection('messages')
			.find({ conversationId: new mongoose.Types.ObjectId(conversation._id) })
			.toArray();
		assert(rows.every((x) => x.readAt instanceof Date));
	});
	await check('unrelated user and ADMIN cannot join/send/read/type; ADMIN history read-only', async () => {
		for (const s of [ts, as])
			for (const event of [
				'room:join',
				'typing:start',
				'typing:stop',
				'message:send',
				'message:read',
				'conversation:presence',
			])
				await ack(s, event, { conversationId: conversation._id, text: 'forbidden' }, false);
		for (const n of ['getConversation', 'getConversationMessages'])
			await call(
				n,
				{ conversationId: conversation._id },
				n === 'getConversation' ? convSelect : pageSelect,
				third.token,
				'CHAT_FORBIDDEN',
			);
		await call(
			'sendMessage',
			{ input: { conversationId: conversation._id, text: 'forbidden' } },
			msgSelect,
			third.token,
			'CHAT_FORBIDDEN',
		);
		await call(
			'markConversationRead',
			{ conversationId: conversation._id },
			'modifiedCount',
			third.token,
			'CHAT_FORBIDDEN',
		);
		await call('getConversation', { conversationId: conversation._id }, convSelect, admin.token);
		await call('getConversationMessages', { conversationId: conversation._id }, pageSelect, admin.token);
		await call(
			'sendMessage',
			{ input: { conversationId: conversation._id, text: 'forbidden' } },
			msgSelect,
			admin.token,
			'CHAT_FORBIDDEN',
		);
		await call(
			'markConversationRead',
			{ conversationId: conversation._id },
			'modifiedCount',
			admin.token,
			'CHAT_FORBIDDEN',
		);
		await call('startYachtConversation', { yachtId: yacht._id }, convSelect, admin.token, 'CHAT_FORBIDDEN');
		await ack(cs, 'room:join', { conversationId: 'forged' }, false);
		await call(
			'sendMessage',
			{ input: { conversationId: conversation._id, text: 'forged', senderId: third._id } },
			msgSelect,
			customer.token,
			'*',
		);
		await call(
			'startYachtConversation',
			{ yachtId: yacht._id, customerId: third._id },
			convSelect,
			customer.token,
			'*',
		);
	});
	await check('live typing start/stop, private TTL and multi-session presence', async () => {
		let typing = once(bs, 'typing:start');
		await ack(cs, 'typing:start', { conversationId: conversation._id });
		const t = await typing;
		assert.equal(t.memberId, customer._id);
		assert.equal(t.ttlSeconds, 5);
		const key = 'aurelis:socket:typing:' + conversation._id + ':' + customer._id;
		assert((await redis.ttl(key)) > 0);
		typing = once(bs, 'typing:stop');
		await ack(cs, 'typing:stop', { conversationId: conversation._id });
		await typing;
		await ack(cs, 'typing:start', { conversationId: conversation._id });
		await sleep(5300);
		assert.equal(await redis.exists(key), 0);
		const cs2 = await connect(customer, api2);
		assert.equal((await ack(bs, 'conversation:presence', { conversationId: conversation._id })).online, true);
		await ack(cs2, 'presence:heartbeat', {});
		assert((await redis.ttl('aurelis:socket:presence:' + customer._id)) <= 60);
		cs.disconnect();
		await sleep(300);
		assert.equal((await ack(bs, 'conversation:presence', { conversationId: conversation._id })).online, true);
		cs2.disconnect();
		await sleep(300);
		assert.equal((await ack(bs, 'conversation:presence', { conversationId: conversation._id })).online, false);
	});
	const cr = await connect(customer);
	await check('reconnect requires fresh explicit rejoin and supports subsequent delivery', async () => {
		await ack(cr, 'typing:start', { conversationId: conversation._id }, false);
		await ack(cr, 'room:join', { conversationId: conversation._id });
		const incoming = once(cr, 'message:new');
		await ack(bs, 'message:send', { conversationId: conversation._id, text: 'After reconnect' });
		await incoming;
		await ack(cr, 'room:leave', { conversationId: conversation._id });
		await ack(cr, 'room:join', { conversationId: conversation._id });
	});
	await check('broker member relink and reassignment preserve historical authorization', async () => {
		await call(
			'saveBrokerProfile',
			{ input: { _id: bp._id, name: 'Step17 Broker', email: broker.email, memberId: broker2._id } },
			'_id',
			admin.token,
		);
		const reused = await call('startYachtConversation', { yachtId: yacht._id }, convSelect, customer.token);
		assert.equal(reused._id, conversation._id);
		assert.equal(reused.brokerMemberId, broker._id);
		await call('getConversation', { conversationId: conversation._id }, convSelect, broker2.token, 'CHAT_FORBIDDEN');
		await call('getConversation', { conversationId: conversation._id }, convSelect, broker.token);
		await call('updateYacht', { input: { _id: yacht._id, brokerId: bp2._id } }, '_id', admin.token);
		await call('getConversation', { conversationId: conversation._id }, convSelect, broker2.token, 'CHAT_FORBIDDEN');
		const fresh = await call('startYachtConversation', { yachtId: yacht._id }, convSelect, customer.token);
		assert.notEqual(fresh._id, conversation._id);
		assert.equal(fresh.brokerMemberId, broker2._id);
		await call('getConversation', { conversationId: conversation._id }, convSelect, broker.token);
	});
	await check('hidden yacht keeps participant chat history while blocking new starts', async () => {
		for (const status of ['DRAFT', 'ARCHIVED']) {
			await call('updateYacht', { input: { _id: yacht._id, status } }, '_id', admin.token);
			await call('getConversationMessages', { conversationId: conversation._id }, pageSelect, customer.token);
			await call('getConversationMessages', { conversationId: conversation._id }, pageSelect, broker.token);
			await call('startYachtConversation', { yachtId: yacht._id }, convSelect, third.token, 'CHAT_YACHT_NOT_FOUND');
		}
		await call('updateYacht', { input: { _id: yacht._id, status: 'PUBLISHED' } }, '_id', admin.token);
	});
	await check('chat history pagination and invalid message inputs', async () => {
		for (const input of [{ page: 0 }, { page: -1 }, { limit: 0 }, { limit: 51 }])
			await call(
				'getConversationMessages',
				{ conversationId: conversation._id, input },
				pageSelect,
				customer.token,
				'*',
			);
		const empty = await call(
			'getConversationMessages',
			{ conversationId: conversation._id, input: { page: 1000, limit: 1 } },
			pageSelect,
			customer.token,
		);
		assert.equal(empty.list.length, 0);
		assert(empty.total > 0);
		for (const text of ['', ' '.repeat(10), 'x'.repeat(4001)])
			await call('sendMessage', { input: { conversationId: conversation._id, text } }, msgSelect, customer.token, '*');
		await call('getConversation', { conversationId: 'invalid' }, convSelect, customer.token, 'BAD_USER_INPUT');
	});
	await check('concurrent send timestamps never regress and GraphQL/Socket share quota', async () => {
		const result = await Promise.all(
			Array.from({ length: 6 }, (_, i) =>
				call(
					'sendMessage',
					{ input: { conversationId: conversation._id, text: 'Concurrent ' + i } },
					msgSelect,
					customer.token,
				),
			),
		);
		const c = await call('getConversation', { conversationId: conversation._id }, convSelect, customer.token);
		assert(new Date(c.lastMessageAt) >= new Date(Math.max(...result.map((x) => new Date(x.createdAt).getTime()))));
		let gqlLimited = false,
			socketLimited = false;
		for (let i = 0; i < 32; i++) {
			if (i % 2 === 0) {
				const { kind, value } = field('sendMessage');
				const r = await raw(
					kind + '($input: ' + value.args[0].type + ') { sendMessage(input:$input) { _id } }',
					{ input: { conversationId: conversation._id, text: 'Quota test' } },
					customer.token,
				);
				if (r.errors) {
					assert.equal(r.errors[0].extensions.code, 'RATE_LIMITED');
					gqlLimited = true;
				}
			} else {
				const r = await cr
					.timeout(6000)
					.emitWithAck('message:send', { conversationId: conversation._id, text: 'Quota test' });
				if (!r.ok) {
					assert.equal(r.code, 'RATE_LIMITED');
					socketLimited = true;
				}
			}
		}
		assert(gqlLimited && socketLimited);
		// Count persisted messages confirms both transports consumed one shared 30-message window.
		const count = await mongo
			.collection('messages')
			.countDocuments({ senderId: new mongoose.Types.ObjectId(customer._id) });
		assert.equal(count, 30);
		report.sharedMessageQuota = { persistedCustomerMessages: count };
	});
	await check('live Redis service JSON/cache/TTL/temporary/atomic quota/pubsub helpers', async () => {
		require('ts-node').register({ transpileOnly: true, project: 'tsconfig.json' });
		const { ConfigService } = require('@nestjs/config');
		const { RedisService } = require('../apps/aurelis-api/src/redis/redis.service.ts');
		const service = new RedisService(new ConfigService({ REDIS_URL: redisUri }));
		service.onModuleInit();
		try {
			for (let n = 0; n < 50 && (await service.health()).status !== 'up'; n++) await sleep(100);
			assert.equal((await service.health()).status, 'up');
			const { SESSION_SCRIPT } = require('../apps/aurelis-api/src/realtime/socket-state.service.ts');
			const leaseKey = 'step17:expired-lease:' + suffix;
			await service.evalState(SESSION_SCRIPT, leaseKey, ['touch', 'crashed-session', 1]);
			await sleep(1200);
			assert.equal(await redis.exists(leaseKey), 0);
			const key = 'step17:' + suffix;
			assert(await service.setJson(key, { value: 17 }, 1));
			assert.deepEqual(await service.getJson(key), { value: 17 });
			assert((await redis.ttl(key)) <= 1);
			await sleep(1200);
			assert.equal(await service.getJson(key), undefined);
			assert(await service.setTemporary('step17', suffix, { ok: true }, 1));
			assert.deepEqual(await service.getTemporary('step17', suffix), { ok: true });
			const results = await Promise.all(
				Array.from({ length: 10 }, () => service.consumeRateLimit('step17-' + suffix, 'local', 3, 1)),
			);
			assert.equal(results.filter((x) => x?.allowed).length, 3);
			await sleep(1200);
			assert.equal((await service.consumeRateLimit('step17-' + suffix, 'local', 3, 1)).allowed, true);
			const { SocketStateService } = require('../apps/aurelis-api/src/realtime/socket-state.service.ts');
			const state = new SocketStateService(service);
			const fakeId = new mongoose.Types.ObjectId().toString();
			assert.equal(await state.presence(fakeId, 'session', 'touch'), true);
			assert.equal(await state.presence(fakeId, 'session', 'remove'), false);
			const pub = service.createPubSubClient(),
				sub = service.createPubSubClient();
			try {
				await Promise.all([pub.connect(), sub.connect()]);
				const channel = 'step17:' + suffix;
				await sub.subscribe(channel);
				const p = new Promise((resolve) => sub.once('message', (_ch, msg) => resolve(msg)));
				await pub.publish(channel, 'local-pubsub');
				assert.equal(await p, 'local-pubsub');
			} finally {
				pub.disconnect();
				sub.disconnect();
			}
		} finally {
			service.onModuleDestroy();
		}
	});
	await check('live Mongo indexes, BSON persistence and required unique constraints', async () => {
		for (const name of [
			'members',
			'yachts',
			'brokerProfiles',
			'crewProfiles',
			'destinations',
			'offices',
			'articles',
			'wishlistItems',
			'yachtInquiries',
			'sellYachtRequests',
			'conversations',
			'messages',
		]) {
			const indexes = await mongo.collection(name).indexes();
			report.indexes[name] = indexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique || false }));
			assert(indexes.length > 1, name + ' indexes missing');
		}
		const unique = report.indexes.wishlistItems.find((i) => i.unique && i.key.memberId === 1 && i.key.yachtId === 1);
		assert(unique);
		const relations = report.indexes.conversations.find(
			(i) => i.unique && i.key.customerId === 1 && i.key.yachtId === 1 && i.key.brokerId === 1,
		);
		assert(relations);
		for (const name of ['members', 'yachts', 'yachtInquiries', 'sellYachtRequests', 'conversations', 'messages'])
			assert((await mongo.collection(name).countDocuments()) > 0, name + ' persistence missing');
		await call('addYachtToWishlist', { yachtId: yacht._id }, '_id', third.token);
		let duplicate = false;
		try {
			await mongo.collection('wishlistItems').insertOne({
				memberId: new mongoose.Types.ObjectId(third._id),
				yachtId: new mongoose.Types.ObjectId(yacht._id),
			});
		} catch (e) {
			duplicate = e.code === 11000;
		}
		assert(duplicate);
		await call('removeYachtFromWishlist', { yachtId: yacht._id }, undefined, third.token);
	});
	await check('Redis login/view/inquiry/sell and socket quotas do not persist rejected writes', async () => {
		const { value } = field('login');
		let limited = false;
		for (let i = 0; i < 12; i++) {
			const r = await raw('mutation($input: ' + value.args[0].type + ') { login(input:$input) { member { _id } } }', {
				input: { email: customer.email, password: 'bad' },
			});
			if (r.errors?.[0].extensions.code === 'RATE_LIMITED') limited = true;
		}
		assert(limited);
		const before = (await call('getYacht', { id: yacht._id }, yachtSelect)).viewsCount;
		let accepted = 0,
			rejected = 0;
		for (let i = 0; i < 65; i++) {
			const { value: v } = field('recordYachtView');
			const r = await raw('mutation($yachtId: ' + v.args[0].type + ') { recordYachtView(yachtId:$yachtId) }', {
				yachtId: yacht._id,
			});
			if (r.errors) {
				assert.equal(r.errors[0].extensions.code, 'RATE_LIMITED');
				rejected++;
			} else accepted++;
		}
		assert(rejected > 0);
		assert.equal((await call('getYacht', { id: yacht._id }, yachtSelect)).viewsCount, before + accepted);
		let sellLimit = false;
		for (let i = 0; i < 7; i++) {
			const { value: v } = field('submitSellYachtRequest');
			const r = await raw('mutation($input: ' + v.args[0].type + ') { submitSellYachtRequest(input:$input) { _id } }', {
				input: {
					ownerName: 'Local quota',
					email: 'quota@example.test',
					phone: '123',
					yachtName: 'Quota',
					builder: 'Test',
					yearBuilt: 2020,
					lengthM: 30,
					location: 'Nice',
					country: 'France',
				},
			});
			if (r.errors?.[0].extensions.code === 'RATE_LIMITED') sellLimit = true;
		}
		assert(sellLimit);
		let socketLimit = false;
		for (let i = 0; i < 125; i++) {
			const p = new Promise((resolve) => {
				const onError = (data) => {
					if (data.code === 'RATE_LIMITED') resolve(data);
				};
				ts.once('socket:error', onError);
				ts.emit('presence:heartbeat', {}, (r) => {
					ts.off('socket:error', onError);
					resolve(r);
				});
			});
			const r = await p;
			if (r.code === 'RATE_LIMITED') {
				socketLimit = true;
				break;
			}
		}
		assert(socketLimit);
	});

	await check('actual socket connection exhaustion fails closed', async () => {
		let exhausted = false;
		for (let i = 0; i < 25; i++) {
			const socket = io(api, {
				auth: { token: 'invalid-token' },
				transports: ['websocket'],
				autoConnect: false,
				reconnection: false,
				timeout: 4000,
			});
			sockets.push(socket);
			const error = await new Promise((resolve, reject) => {
				const timer = setTimeout(() => reject(new Error('connect quota timeout')), 6000);
				socket.once('connect_error', (value) => {
					clearTimeout(timer);
					resolve(value);
				});
				socket.once('socket:ready', () => {
					clearTimeout(timer);
					reject(new Error('Invalid socket admitted'));
				});
				socket.connect();
			});
			socket.disconnect();
			if (error.message === 'RATE_LIMITED') {
				assert(error.data.retryAfterSeconds > 0);
				exhausted = true;
				break;
			}
			assert.equal(error.message, 'SOCKET_UNAUTHENTICATED');
		}
		assert(exhausted);
		report.sockets.handshake = { positive: 1, negative: 1, failed: 0, status: 'PASS' };
	});

	await check('logout is authenticated and stateless', async () => {
		assert.equal(await call('logout', {}, undefined, customer.token), true);
		await call('getMe', {}, '_id', customer.token);
		await call('logout', {}, undefined, undefined, 'AUTH_UNAUTHENTICATED');
	});
}
async function finish() {
	for (const s of sockets) s.disconnect();
	if (redis) redis.disconnect();
	if (mongo) await mongo.close();
	for (const [name, v] of Object.entries(report.operations))
		v.status = v.failed ? 'FAIL' : name === 'googleLogin' ? 'UNVERIFIED' : v.positive ? 'PASS' : 'UNVERIFIED';
	for (const v of Object.values(report.sockets))
		v.status = v.failed ? 'FAIL' : v.positive || v.negative ? 'PASS' : 'UNVERIFIED';
	report.summary = {
		pass: report.cases.filter((x) => x.status === 'PASS').length,
		fail: report.cases.filter((x) => x.status === 'FAIL').length,
	};
	await fs.mkdir(output, { recursive: true });
	await fs.writeFile(output + '/live-results.json', JSON.stringify(report, null, 2) + '\n');
	console.log(JSON.stringify(report.summary));
	if (report.summary.fail) process.exitCode = 1;
}
if (process.argv.includes('--help'))
	console.log(
		'Opt-in local verification: set STEP17_API_URL, STEP17_SECOND_API_URL, STEP17_MONGODB_URI (fresh aurelis_step17_* DB), STEP17_REDIS_URL (dedicated nonzero DB), STEP17_JWT_SECRET; then run with --run. Never targets remote hosts, drops collections, flushes Redis, or executes migrations. Creates synthetic records retained for inspection.',
	);
else
	main()
		.catch((error) => {
			report.cases.push({
				name: 'verification setup/dependencies',
				status: 'FAIL',
				reason: String(error.message).slice(0, 500),
			});
			console.log('FAIL verification setup/dependencies: ' + String(error.message).slice(0, 500));
		})
		.finally(finish);
