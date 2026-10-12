# Aurelis Yacht Backend Blueprint

## Objective

Build a clean, scalable NestJS monorepo backend for a luxury yacht charter platform inspired by Fraser Yachts, while keeping the current monorepo structure and only changing business logic to yacht-focused operations.

## Architecture

### Monorepo layout

- `apps/aurelis-api`
  - Main backend API
  - GraphQL / REST endpoints for yacht platform operations
- `apps/aurelis-batch`
  - Job runner for ranking, reporting, maintenance, seasonal pricing, availability sync

### Core modules

1. `auth`
   - signup
   - login
   - refresh token
   - logout
   - forgot/reset password
   - email verification

2. `member`
   - user profile
   - role management
   - status management
   - preferences
   - contact and identity data

3. `yacht`
   - yacht profile
   - fleet / inventory
   - price and availability
   - media and amenities
   - destination / cruising area

4. `charter`
   - charter offers
   - inquiry requests
   - availability matching
   - itinerary / route planning

5. `booking`
   - reservation
   - payment status
   - contract status
   - cancellation flow

6. `notification`
   - inquiry alerts
   - booking updates
   - admin notifications

7. `like` / `follow`
   - saved yachts
   - watchlist
   - favorite brokers / owners

8. `view`
   - yacht page views
   - inquiry impression tracking

9. `admin`
   - user moderation
   - listing approval
   - report management
   - platform configuration

## Core business model

### User roles

- `CLIENT`
  - search yachts
  - save favorites
  - request charters
  - manage bookings

- `AGENT`
  - manage client inquiries
  - create charter opportunities
  - coordinate yacht introductions

- `OWNER`
  - manage yacht fleet
  - update availability and pricing
  - review bookings

- `ADMIN`
  - full platform access
  - approve listings and users
  - monitor bookings and reports

### Main entities

#### Member

```ts
interface Member {
	_id: string;
	email: string;
	passwordHash: string;
	fullName: string;
	phone: string;
	role: 'CLIENT' | 'AGENT' | 'OWNER' | 'ADMIN';
	status: 'PENDING' | 'ACTIVE' | 'BLOCKED';
	isVerified: boolean;
	country: string;
	createdAt: Date;
	updatedAt: Date;
}
```

#### Yacht

```ts
interface Yacht {
	_id: string;
	name: string;
	model: string;
	year: number;
	length: number;
	builder: string;
	guestCapacity: number;
	cabinCount: number;
	crewCount: number;
	yachtType: string;
	status: 'DRAFT' | 'ACTIVE' | 'HIDDEN' | 'BOOKED';
	pricePerDay: number;
	currency: string;
	location: string;
	charterRegions: string[];
	amenities: string[];
	media: string[];
	ownerId: string;
	agentId?: string;
	createdAt: Date;
	updatedAt: Date;
}
```

#### Charter

```ts
interface Charter {
	_id: string;
	yachtId: string;
	clientId: string;
	brokerId?: string;
	startDate: Date;
	endDate: Date;
	destination: string;
	itinerary: string[];
	charterType: 'PRIVATE' | 'EVENT' | 'CROISIE';
	status: 'INQUIRY' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BOOKED';
	notes?: string;
	createdAt: Date;
}
```

#### Booking

```ts
interface Booking {
	_id: string;
	charterId: string;
	yachtId: string;
	guestId: string;
	status: 'REQUESTED' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
	totalPrice: number;
	deposit: number;
	currency: string;
	createdAt: Date;
}
```

## Auth flow

### Signup

Endpoint:

- `POST /auth/signup`

Payload:

```json
{
	"fullName": "John Smith",
	"email": "john@example.com",
	"phone": "+971500000000",
	"password": "StrongPass!123",
	"role": "CLIENT",
	"country": "UAE"
}
```

Backend logic:

- validate input
- check duplicate email / phone
- hash password
- create member with default status `PENDING` or `ACTIVE`
- issue email verification or send onboarding email

### Login

Endpoint:

- `POST /auth/login`

Payload:

```json
{
	"email": "john@example.com",
	"password": "StrongPass!123"
}
```

Backend logic:

- find member by email
- verify password
- ensure active status
- generate `accessToken`
- generate `refreshToken`
- return safe user payload and token metadata

### JWT structure

```ts
interface JwtPayload {
	sub: string;
	email: string;
	role: string;
	status: string;
	iat: number;
	exp: number;
}
```

## Access rules

- `CLIENT`
  - search yachts
  - request charters
  - save favorites

- `OWNER`
  - manage owned yachts
  - update availability
  - view bookings for own yachts

- `AGENT`
  - manage inquiries and client matches
  - access assigned listings

- `ADMIN`
  - all data access
  - moderation and configuration

## Clean coding standards

1. Keep modules focused
   - one module = one business concern
2. Do not rename everything blindly
   - adapt domain semantics instead of replacing names without business purpose
3. Keep DTOs explicit
   - request and response models must be clear
4. Use enums for statuses and roles
   - avoid magic strings across the codebase
5. Use service layer for business logic
   - controllers only handle HTTP or GraphQL requests
6. Keep guards and decorators strict
   - role and auth checks belong in guards
7. Design for mobile and web together
   - one backend API supports both UI types

## Recommended first implementation order

### Phase 1: Core account and auth

- signup
- login
- role model
- user status
- JWT + refresh tokens

### Phase 2: Yacht and charter inventory

- yacht schema
- yacht CRUD
- charter inquiry flow
- availability logic

### Phase 3: Booking flow

- reservation request
- payment/deposit tracking
- cancellation and confirmation logic

### Phase 4: Batch and ranking

- top yachts
- premium listings
- seasonal availability refresh
- ranking by views/likes/inquiries

### Phase 5: Admin and reporting

- listing approval
- user moderation
- reporting tools

## Final guidance

Yes, this backend will work cleanly if we keep it modular and role-based.

The correct path is not to rewrite everything at once. We should implement the yacht system in phases, starting with auth + member + yacht + charter, then booking, then batch, and finally admin.

This keeps the code clean, testable, and ready for both PC and mobile frontend apps.
