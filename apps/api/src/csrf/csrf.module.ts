import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { CsrfMiddleware } from './csrf.middleware';

@Module({})
export class CsrfModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
