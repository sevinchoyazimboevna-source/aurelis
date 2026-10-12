import { ModelDefinition } from '@nestjs/mongoose';
import { MemberRecordSchema } from './account.model';
import { AuthIdentitySchema } from './auth-identity.model';
import { YachtSchema } from './yacht.model';
import { YachtListingSchema } from './yacht-listing.model';
import { DestinationSchema } from './destination.model';
import { YachtDestinationSchema } from './yacht-destination.model';
import { OfficeSchema } from './office.model';
import { TeamMemberSchema } from './team-member.model';
import { WishlistSchema } from './wishlist.model';
import { InquirySchema } from './inquiry.model';
import { ArticleSchema } from './article.model';
import { PageContentSchema } from './page-content.model';
import { NewsletterSubscriptionSchema } from './newsletter-subscription.model';

/** Import with MongooseModule.forFeature(aurelisModelDefinitions) in migrated modules. */
export const aurelisModelDefinitions: ModelDefinition[] = [
	{ name: 'MemberRecord', schema: MemberRecordSchema },
	{ name: 'AuthIdentity', schema: AuthIdentitySchema },
	{ name: 'Yacht', schema: YachtSchema },
	{ name: 'YachtListing', schema: YachtListingSchema },
	{ name: 'Destination', schema: DestinationSchema },
	{ name: 'YachtDestination', schema: YachtDestinationSchema },
	{ name: 'Office', schema: OfficeSchema },
	{ name: 'TeamMember', schema: TeamMemberSchema },
	{ name: 'Wishlist', schema: WishlistSchema },
	{ name: 'Inquiry', schema: InquirySchema },
	{ name: 'Article', schema: ArticleSchema },
	{ name: 'PageContent', schema: PageContentSchema },
	{ name: 'NewsletterSubscription', schema: NewsletterSubscriptionSchema },
];
