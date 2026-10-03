import { Module } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            useFactory: () => {
                const uri = process.env.MONGODB_URI;
                if (!uri) throw new Error('MONGODB_URI must be configured');
                return { uri };
            },
        }),
    ],
    exports: [],
})
export class DatabaseModule {
    constructor(@InjectConnection() private readonly connection: Connection) {
        if(connection.readyState === 1) {
            console.log(`MongoDB connected (${process.env.NODE_ENV ?? 'development'})`);
        } else {
                console.log("DB is not connected");
            }

    }
}
