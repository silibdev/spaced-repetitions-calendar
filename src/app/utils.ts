import { v4 } from 'uuid';

export class Utils {

  static generateRandomUUID(): string {
    return v4();
  }

  static generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }
}
