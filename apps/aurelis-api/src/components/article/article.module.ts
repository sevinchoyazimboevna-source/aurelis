import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import ArticleSchema from '../../libs/schemas/Article.model';
import MemberSchema from '../../libs/schemas/Member.model';
import YachtSchema from '../../libs/schemas/Yacht.model';
import DestinationSchema from '../../libs/schemas/Destination.model';
import { AuthModule } from '../auth/auth.module';
import { ArticleResolver } from './article.resolver';
import { ArticleService } from './article.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Article', schema: ArticleSchema },
			{ name: 'Member', schema: MemberSchema },
			{ name: 'Yacht', schema: YachtSchema },
			{ name: 'Destination', schema: DestinationSchema },
		]),
		AuthModule,
	],
	providers: [ArticleResolver, ArticleService],
	exports: [ArticleService],
})
export class ArticleModule {}
