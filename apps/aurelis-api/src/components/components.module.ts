import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BrokerModule } from './broker/broker.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { YachtModule } from './yacht/yacht.module';
import { CrewModule } from './crew/crew.module';
import { DestinationModule } from './destination/destination.module';
import { OfficeModule } from './office/office.module';
import { ArticleModule } from './article/article.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { SellYachtRequestModule } from './sell-yacht-request/sell-yacht-request.module';

import { ChatModule } from './chat/chat.module';

@Module({
	imports: [
		ChatModule,
		AuthModule,
		BrokerModule,
		YachtModule,
		InquiryModule,
		CrewModule,
		DestinationModule,
		OfficeModule,
		ArticleModule,
		WishlistModule,
		SellYachtRequestModule,
	],
})
export class ComponentsModule {}
