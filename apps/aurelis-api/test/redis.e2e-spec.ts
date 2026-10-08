import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import request from 'supertest';
import { RedisService } from '../src/redis/redis.service';
import { RedisHealthController } from '../src/redis/redis-health.controller';
import { RateLimitGuard } from '../src/redis/rate-limit.guard';
import { YachtResolver } from '../src/components/yacht/yacht.resolver';
import { YachtService } from '../src/components/yacht/yacht.service';
import { BrokerService } from '../src/components/broker/broker.service';
import { AuthResolver } from '../src/components/auth/auth.resolver';
import { AuthService } from '../src/components/auth/auth.service';
import { InquiryResolver } from '../src/components/inquiry/inquiry.resolver';
import { InquiryService } from '../src/components/inquiry/inquiry.service';
import { SellYachtRequestResolver } from '../src/components/sell-yacht-request/sell-yacht-request.resolver';
import { SellYachtRequestService } from '../src/components/sell-yacht-request/sell-yacht-request.service';
import { OptionalInquiryAuthGuard } from '../src/components/inquiry/optional-inquiry-auth.guard';
import { formatGraphQLError } from '../src/components/auth/auth-errors';

describe('Redis HTTP policies (real resolvers/global guard, offline storage)', () => {
	let app: INestApplication;
	let available = true;
	const counts = new Map<string, number>();
	const recordView = jest.fn().mockResolvedValue(1);
	const login = jest.fn().mockResolvedValue({ accessToken: 'test' });
	const create = jest.fn().mockResolvedValue({ _id: '000000000000000000000001' });
	const redis = {
		health: () => Promise.resolve({ status: available ? 'up' : 'down' }),
		consumeRateLimit: jest.fn((scope: string, ip: string, limit: number) => {
			if (!available) return Promise.resolve(undefined);
			const key = `${scope}:${ip}`;
			const count = (counts.get(key) ?? 0) + 1;
			counts.set(key, count);
			return Promise.resolve({ allowed: count <= limit, retryAfterSeconds: 30 });
		}),
	};
	const post = (query: string) => request(app.getHttpServer()).post('/graphql').send({ query });
	beforeAll(async () => {
		const module = await Test.createTestingModule({
			imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, formatError: formatGraphQLError })],
			controllers: [RedisHealthController],
			providers: [
				YachtResolver,
				AuthResolver,
				InquiryResolver,
				SellYachtRequestResolver,
				{ provide: APP_GUARD, useClass: RateLimitGuard },
				{ provide: RedisService, useValue: redis },
				{ provide: YachtService, useValue: { recordView, catalog: () => ({ list: [], total: 0 }) } },
				{ provide: BrokerService, useValue: {} },
				{ provide: AuthService, useValue: { login, googleLogin: login, authenticateRequest: () => undefined } },
				{ provide: InquiryService, useValue: { create, createSales: create, createCharter: create } },
				{ provide: SellYachtRequestService, useValue: { create } },
			],
		})
			.overrideGuard(OptionalInquiryAuthGuard)
			.useValue({ canActivate: () => true })
			.compile();
		app = module.createNestApplication();
		await app.init();
	});
	beforeEach(() => {
		available = true;
		counts.clear();
		jest.clearAllMocks();
	});
	afterAll(async () => {
		await app.close();
	});
	it('blocks views before persistence after the limit and ignores spoofed forwarded headers', async () => {
		const query = 'mutation { recordYachtView(yachtId: "000000000000000000000001") }';
		for (let i = 0; i < 60; i++) await post(query);
		const response = await request(app.getHttpServer())
			.post('/graphql')
			.set('X-Forwarded-For', 'new-ip')
			.send({ query });
		expect((response.body as { errors: { extensions: unknown }[] }).errors[0].extensions).toEqual({
			code: 'RATE_LIMITED',
			retryAfterSeconds: 30,
		});
		expect(recordView).toHaveBeenCalledTimes(60);
	});
	it('shares the login limit across password and Google login', async () => {
		for (let i = 0; i < 10; i++)
			await post('mutation { login(input: {email:"user@example.com",password:"test"}) {accessToken} }');
		const response = await post('mutation { googleLogin(input:{credential:"test"}) {accessToken} }');
		expect((response.body as { errors: { extensions: { code: string } }[] }).errors[0].extensions.code).toBe(
			'RATE_LIMITED',
		);
		expect(login).toHaveBeenCalledTimes(10);
	});
	it('shares generic, charter and sales inquiry quota', async () => {
		const contact =
			'yachtId:"000000000000000000000001",name:"User",email:"user@example.com",message:"Interested in this yacht"';
		const queries = [
			`mutation { submitSalesInquiry(input:{${contact}}) {_id} }`,
			`mutation { submitCharterInquiry(input:{${contact},startDate:"2026-10-10",endDate:"2026-10-11"}) {_id} }`,
			`mutation { submitYachtInquiry(input:{${contact},type:SALES}) {_id} }`,
		];
		for (let i = 0; i < 5; i++) {
			const response = await post(queries[i % 3]);
			expect((response.body as { errors?: unknown[] }).errors).toBeUndefined();
		}
		const response = await post(queries[0]);
		expect((response.body as { errors: { extensions: { code: string } }[] }).errors[0].extensions.code).toBe(
			'RATE_LIMITED',
		);
		expect(create).toHaveBeenCalledTimes(5);
	});
	it('limits sell requests independently from inquiries', async () => {
		const query =
			'mutation { submitSellYachtRequest(input:{ownerName:"Owner",email:"owner@example.com",phone:"12345",yachtName:"Yacht",builder:"Builder",yearBuilt:2020,lengthM:20,location:"Nice",country:"France"}) {_id} }';
		for (let i = 0; i < 5; i++) {
			const response = await post(query);
			expect((response.body as { errors?: unknown[] }).errors).toBeUndefined();
		}
		const response = await post(query);
		expect((response.body as { errors: { extensions: { code: string } }[] }).errors[0].extensions.code).toBe(
			'RATE_LIMITED',
		);
		expect(create).toHaveBeenCalledTimes(5);
	});
	it('fails closed during outages while public catalog and health remain available', async () => {
		available = false;
		const response = await post('mutation { recordYachtView(yachtId:"000000000000000000000001") }');
		expect((response.body as { errors: { extensions: unknown }[] }).errors[0].extensions).toEqual({
			code: 'RATE_LIMIT_UNAVAILABLE',
			retryAfterSeconds: 5,
		});
		expect(recordView).not.toHaveBeenCalled();
		const catalog = await post('{ getYachts(input:{}) {total} }');
		expect((catalog.body as { data: unknown }).data).toEqual({ getYachts: { total: 0 } });
		const health = await request(app.getHttpServer()).get('/health/redis').expect(200);
		expect(health.body).toEqual({ status: 'degraded', redis: { status: 'down' }, rateLimitPolicy: 'fail-closed' });
	});
	it('reports Redis availability without exposing configuration', async () => {
		const response = await request(app.getHttpServer()).get('/health/redis').expect(200);
		expect(response.body).toEqual({ status: 'ok', redis: { status: 'up' }, rateLimitPolicy: 'fail-closed' });
	});
});
