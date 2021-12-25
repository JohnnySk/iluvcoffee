import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { skip } from 'rxjs';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Event } from 'src/events/entities/event.entity';
import { Connection, Repository } from 'typeorm';
import coffeesConfig from './config/coffees.config';
import { CreateCoffeeDto } from './dto/create-coffee.dto';
import { Coffee } from './entities/coffee.entity';
import { Flavor } from './entities/flavor.entity';
import { TestClass } from './test.class';

@Injectable()
export class CoffeesService {
  constructor(
    @InjectRepository(Coffee)
    private readonly coffeeRepository: Repository<Coffee>,
    @InjectRepository(Flavor)
    private readonly flavorRepository: Repository<Flavor>,
    private readonly connection: Connection,
    private readonly configService: ConfigService,
    @Inject(coffeesConfig.KEY)
    private coffeesConfiguration: ConfigType<typeof coffeesConfig>, 
    private testClass: TestClass
  ) {
    //example global config
    const databaseHost = this.configService.get<string>(
      'database.host',
      'db'
    );
    //example module based config
    //use coffees.bar to get object prop's value, and use just coffees to get namepsac's data which was registered using registerAs
    const coffeesConfigData = this.configService.get('coffees.foo');
    console.log(coffeesConfigData);
    // Now strongly typed, and able to access properties via:
    console.log(coffeesConfiguration.foo); 
    console.log('-----------');
    console.log(testClass);
  }
  
  findAll(paginationQuery: PaginationQueryDto) {
    const {limit, offset} = paginationQuery;
    return this.coffeeRepository.find({
      relations: ['flavors'],
      skip: offset,
      take: limit
    });
  }

  async findOne(id: string) {
    const coffee = await this.coffeeRepository.findOne(id, {
        relations: ['flavors']
      });
    if (!coffee) {
      throw new NotFoundException(`Coffee with id: ${id} not found`);
    }
    return coffee;
  }

  async create(createCoffeeDto: CreateCoffeeDto) {
    const flavors = await Promise.all(
      createCoffeeDto.flavors.map(name => this.preloadFlavorByName(name)),
    );

    const coffee = this.coffeeRepository.create({...createCoffeeDto, flavors});
    return this.coffeeRepository.save(coffee);
  }

  async update(id: string, updateCoffeeDto: any) {
    const flavors =
      updateCoffeeDto.flavors &&
      (await Promise.all(
        updateCoffeeDto.flavors.map(name => this.preloadFlavorByName(name)),
      ));
    const coffee = await this.coffeeRepository.preload({
      id: +id,
      ...updateCoffeeDto
    });
    if (!coffee) {
      throw new NotFoundException(`Coffee #${id} not found`);
    }
    return this.coffeeRepository.save(coffee);
  }

  async remove(id: string) {
    const coffee = await this.findOne(id);
    return this.coffeeRepository.remove(coffee);
  }

  private async preloadFlavorByName(name: string): Promise<Flavor> {
    const existingFlavor = await this.flavorRepository.findOne({ name });
    if (existingFlavor) {
      return existingFlavor;
    }
    return this.flavorRepository.create({ name });
  }

  async recommendCoffee(coffee: Coffee) {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      coffee.recommendations++;

      const recommendEvent = new Event();
      recommendEvent.name = 'recommend_coffee';
      recommendEvent.type = 'coffee';
      recommendEvent.payload = { coffeeId: coffee.id };
      
      await queryRunner.manager.save(coffee);
      await queryRunner.manager.save(recommendEvent);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
