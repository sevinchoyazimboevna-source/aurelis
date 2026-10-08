import { model, models, Types } from 'mongoose';
import CrewProfileSchema from '../../libs/schemas/CrewProfile.model';

const CrewModel = models.Step4CrewValidation ?? model('Step4CrewValidation', CrewProfileSchema);
const valid = { firstName: 'Aurelis', role: 'CAPTAIN' };

describe('CrewProfile schema (offline validation)', () => {
	it.each(['CAPTAIN', 'CHEF'])('accepts %s with profile defaults and no auth fields', (role) => {
		const profile = new CrewModel({
			...valid,
			role,
			password: 'not-persisted',
			email: 'not-persisted',
			jwt: 'not-persisted',
			googleId: 'not-persisted',
		});
		expect(profile.validateSync()).toBeUndefined();
		expect(profile.toObject()).toMatchObject({ status: 'DRAFT', featured: false, languages: [], images: [] });
		for (const field of ['memberId', 'displayName', 'password', 'email', 'jwt', 'googleId'])
			expect(profile.toObject()).not.toHaveProperty(field);
		expect(CrewProfileSchema.options.timestamps).toBe(true);
		expect(CrewProfileSchema.options.collection).toBe('crewProfiles');
	});
	it('uses an optional Member ObjectId reference', () => {
		const memberId = new Types.ObjectId();
		const profile = new CrewModel({ ...valid, memberId });
		expect(profile.validateSync()).toBeUndefined();
		expect(profile.memberId).toEqual(memberId);
		expect(CrewProfileSchema.path('memberId').options.ref).toBe('Member');
	});
	it('declares one partial unique member index plus two justified publication indexes', () => {
		const indexes = CrewProfileSchema.indexes();
		expect(indexes).toHaveLength(3);
		expect(indexes.find(([keys]) => keys.memberId === 1)?.[1]).toMatchObject({
			unique: true,
			partialFilterExpression: { memberId: { $type: 'objectId' } },
		});
		expect(indexes.some(([keys]) => keys.status === 1 && keys.createdAt === -1)).toBe(true);
		expect(indexes.some(([keys]) => keys.status === 1 && keys.featured === 1)).toBe(true);
	});
	it.each([
		{ firstName: undefined },
		{ firstName: '' },
		{ firstName: '   ' },
		{ role: undefined },
		{ role: 'CREW' },
		{ role: 'ENGINEER' },
		{ status: 'INVALID' },
		{ experienceYears: -1 },
		{ experienceYears: 1.5 },
		{ experienceYears: Infinity },
		{ memberId: 'invalid' },
		{ languages: ['English', 'English'] },
		{ languages: ['  '] },
		{ images: [''] },
	])('rejects invalid persistence fields %j', (fields) => {
		expect(new CrewModel({ ...valid, ...fields }).validateSync()).toBeDefined();
	});
	it.each(['DRAFT', 'PUBLISHED', 'ARCHIVED'])('retains status %s even when featured is true', (status) => {
		const profile = new CrewModel({ ...valid, status, featured: true });
		expect(profile.validateSync()).toBeUndefined();
		expect(profile.status).toBe(status);
	});
});
