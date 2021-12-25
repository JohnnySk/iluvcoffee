import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingMiddleware } from 'src/common/middleware/logging.middleware';
import { Event } from 'src/events/entities/event.entity';
import { CoffeesController } from './coffees.controller';
import { CoffeesService } from './coffees.service';
import coffeesConfig from './config/coffees.config';
import { Coffee } from './entities/coffee.entity';
import { Flavor } from './entities/flavor.entity';
import { TestClass } from './test.class';

@Module({
    imports: [TypeOrmModule.forFeature([Coffee, Flavor, Event]), ConfigModule.forFeature(coffeesConfig)],
    controllers: [CoffeesController],
    providers: [CoffeesService, TestClass]
})
export class CoffeesModule implements NestModule{
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggingMiddleware).forRoutes({path: 'coffees', method: RequestMethod.GET});
    }
}
