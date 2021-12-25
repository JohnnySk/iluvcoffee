import { Injectable } from "@nestjs/common";

@Injectable()
export class TestClass {
    getSome (): [string] {
        return ['someOne'];
    }
}