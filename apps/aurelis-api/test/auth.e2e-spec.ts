import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthResolver } from '../src/components/auth/auth.resolver';
import { AuthService } from '../src/components/auth/auth.service';
import { AuthErrorCode, authError, formatGraphQLError } from '../src/components/auth/auth-errors';
import { AuthGuard } from '../src/components/auth/guards/auth.guard';

describe('Member authentication GraphQL contract (e2e)', () => {
	let app: INestApplication;
	let authService: { login: jest.Mock; register: jest.Mock; googleLogin: jest.Mock; getMe: jest.Mock; logout: jest.Mock; authenticateRequest: jest.Mock };

	beforeAll(async () => {
		authService = {
			login: jest.fn(),
			register: jest.fn(),
			googleLogin: jest.fn(),
			getMe: jest.fn(),
			logout: jest.fn(),
			authenticateRequest: jest.fn().mockImplementation(async (req) => {
				const member = { _id: '507f1f77bcf86cd799439011', email: 'sailor@example.com', role: 'USER', status: 'ACTIVE' };
				req.authMember = member;
				return member;
			}),
		};
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [
				GraphQLModule.forRoot({
					driver: ApolloDriver,
					autoSchemaFile: true,
					formatError: formatGraphQLError,
				}),
			],
			providers: [
				AuthResolver,
				{ provide: AuthService, useValue: authService },
				{ provide: AuthGuard, useValue: { canActivate: () => true } },
			],
		}).compile();
		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns non-enumerating login errors with the stable GraphQL code and no credential details', async () => {
		authService.login.mockRejectedValueOnce(authError(AuthErrorCode.INVALID_CREDENTIALS));
		const response = await request(app.getHttpServer()).post('/graphql').send({
			query: 'mutation { login(input: { email: "unknown@example.com", password: "sensitive-password" }) { accessToken member { email } } }',
		});
		expect(response.body.data).toBeNull();
		expect(response.body.errors[0].extensions.code).toBe('AUTH_INVALID_CREDENTIALS');
		expect(JSON.stringify(response.body)).not.toContain('sensitive-password');
		expect(JSON.stringify(response.body)).not.toContain('hashed-password');
	});

	it('returns AUTH_INVALID_EMAIL for invalid registration email without echoing input values', async () => {
		const response = await request(app.getHttpServer()).post('/graphql').send({
			query: 'mutation { register(input: { email: "not-email", password: "sensitive-password", confirmPassword: "sensitive-password" }) { accessToken member { email } } }',
		});
		expect(response.body.errors[0].extensions.code).toBe('AUTH_INVALID_EMAIL');
		expect(JSON.stringify(response.body)).not.toContain('sensitive-password');
	});

	it('publishes the exact auth and Member GraphQL fields and Boolean logout result', async () => {
		const schemaResponse = await request(app.getHttpServer()).post('/graphql').send({
			query: '{ auth: __type(name: "AuthResponse") { fields { name } } member: __type(name: "Member") { fields { name } } registerInput: __type(name: "RegisterInput") { inputFields { name } } loginInput: __type(name: "LoginInput") { inputFields { name } } googleInput: __type(name: "GoogleLoginInput") { inputFields { name } } }',
		});
		expect(schemaResponse.body.data.auth.fields.map((field: { name: string }) => field.name)).toEqual(['accessToken', 'member']);
		expect(schemaResponse.body.data.member.fields.map((field: { name: string }) => field.name)).toEqual(['_id', 'email', 'googleId', 'role', 'status', 'createdAt', 'updatedAt']);
		expect(schemaResponse.body.data.registerInput.inputFields.map((field: { name: string }) => field.name)).toEqual(['email', 'password', 'confirmPassword']);
		expect(schemaResponse.body.data.loginInput.inputFields.map((field: { name: string }) => field.name)).toEqual(['email', 'password']);
		expect(schemaResponse.body.data.googleInput.inputFields.map((field: { name: string }) => field.name)).toEqual(['credential']);

		authService.logout.mockResolvedValueOnce(true);
		const logoutResponse = await request(app.getHttpServer()).post('/graphql').send({ query: 'mutation { logout }' });
		expect(logoutResponse.body.data.logout).toBe(true);
	});

	it('protects getMe and returns only the current Member object', async () => {
		authService.authenticateRequest.mockImplementationOnce(async (req) => {
			if (!req.headers.authorization) throw authError(AuthErrorCode.UNAUTHENTICATED);
			const member = { _id: '507f1f77bcf86cd799439011', email: 'sailor@example.com', googleId: null, role: 'USER', status: 'ACTIVE' };
			req.authMember = member;
			return member;
		});
		const missing = await request(app.getHttpServer()).post('/graphql').send({ query: '{ getMe { email } }' });
		expect(missing.body.errors[0].extensions.code).toBe('AUTH_UNAUTHENTICATED');

		authService.getMe.mockResolvedValueOnce({
			_id: '507f1f77bcf86cd799439011',
			email: 'sailor@example.com',
			googleId: null,
			role: 'USER',
			status: 'ACTIVE',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		});
		const current = await request(app.getHttpServer())
			.post('/graphql')
			.set('Authorization', 'Bearer valid-token')
			.send({ query: '{ getMe { _id email googleId role status createdAt updatedAt } }' });
		expect(authService.authenticateRequest).toHaveBeenLastCalledWith(expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer valid-token' }) }));
		expect(authService.getMe).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
		expect(current.body.errors).toBeUndefined();
		expect(current.body.data.getMe).toEqual(expect.objectContaining({ email: 'sailor@example.com', role: 'USER', status: 'ACTIVE', googleId: null }));
		expect(JSON.stringify(current.body)).not.toMatch(/password|hash|token/i);
	});
});
