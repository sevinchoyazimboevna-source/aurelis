import { BadRequestException } from '@nestjs/common';

/** The single input boundary for the legacy GraphQL charterRate alias. */
export function normalizeYachtPricingInput<T extends { charterPrice?: number; charterRate?: number }>(
	input: T,
): Omit<T, 'charterRate'> {
	const hasPrice = input.charterPrice !== undefined;
	const hasRate = input.charterRate !== undefined;
	if (hasPrice && hasRate && input.charterPrice !== input.charterRate) {
		throw new BadRequestException('charterPrice and charterRate must match when both are supplied');
	}
	const normalized = { ...input };
	if (hasPrice) normalized.charterPrice = input.charterPrice;
	else if (hasRate) normalized.charterPrice = input.charterRate;
	delete normalized.charterRate;
	return normalized;
}
