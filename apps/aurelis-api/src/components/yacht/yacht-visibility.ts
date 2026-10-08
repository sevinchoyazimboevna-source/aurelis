import { YachtStatus } from '../../libs/enums/yacht.enum';

// Canonical public Yacht availability for catalog, detail and linked discovery.
export function buildPublicYachtVisibilityFilter(): { status: YachtStatus } {
	return { status: YachtStatus.PUBLISHED };
}
