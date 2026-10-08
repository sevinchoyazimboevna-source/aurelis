import { Module } from '@nestjs/common';
import { AuthModule } from '../components/auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { SocketGateway } from './socket.gateway';
import { SocketAdapterService } from './socket-adapter.service';
import { SocketStateService } from './socket-state.service';
import { RoomPolicy } from './room-policy';
import { SocketHealthController } from './socket-health.controller';
import { ChatModule } from '../components/chat/chat.module';
@Module({
	imports: [AuthModule, RedisModule, ChatModule],
	providers: [SocketGateway, SocketAdapterService, SocketStateService, RoomPolicy],
	controllers: [SocketHealthController],
})
export class RealtimeModule {}
