import { validateEnvironment } from './libs/config/environment';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
import { SocketModule } from './socket/socket.module';
import { YachtModule } from './components/yacht/yacht.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.local', '.env'],
			validate: validateEnvironment,
		}),
		GraphQLModule.forRoot({
			driver: ApolloDriver,
			playground: true,
			uploads: false,
			autoSchemaFile: true,
			formatError: (error: T) => {
				const graphQlFormattedError = {
					extensions: {
						code: error?.extensions?.code,
					},
					message:
						error?.extensions?.exception?.response?.message ||
						error?.extensions?.response?.message ||
						error?.message,
				};
				console.log('graphQl server error', graphQlFormattedError);
				return graphQlFormattedError;
			},
		}),
		DatabaseModule,
		SocketModule,
		YachtModule,
	],
	controllers: [AppController],
	providers: [AppService, AppResolver],
})
export class AppModule {}
