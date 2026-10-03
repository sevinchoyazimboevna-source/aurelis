import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      playground: process.env.NODE_ENV !== 'production',
      autoSchemaFile: true,
      formatError: (error: T) => {
        return {
          code: error?.extensions?.code,
          message:
          error?.extensions?.exception?.response?.message ||
          error?.extensions?.response?.message ||
          error?.message,
        };
      },
    }),
    ComponentsModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {} //modul decorator
