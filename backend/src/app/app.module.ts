import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { User } from './user/user.entity';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
      AuthModule,
      TypeOrmModule.forRoot({
          type: 'sqlite',
          database: 'data-portal.db', // This file will be created in your backend directory
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true, // Enable auto schema sync; disable in production
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

