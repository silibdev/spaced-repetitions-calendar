import { v4 } from 'uuid';
import * as LZUTF8 from 'lzutf8';
import LZString from 'lz-string';

export class Utils {
  static generateRandomUUID(): string {
    return v4();
  }

  static generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }

  static manageMessageWebWorker({ db, decomp, forceSave }: any): any {
    let newDB;

    if (decomp) {
      try {
        newDB = JSON.parse(db);
      } catch (e) {
        try {
          newDB = JSON.parse(
            LZUTF8.decompress(db, {
              outputEncoding: 'String',
              inputEncoding: 'Base64',
            }),
          );
        } catch (e) {
          newDB = JSON.parse(LZString.decompressFromUTF16(db) || '[]');
        }
      }
      newDB.forEach((event: any) => (event.start = new Date(event.start)));
    } else {
      newDB = LZUTF8.compress(JSON.stringify(db), { outputEncoding: 'Base64' });
    }

    return { db: newDB, decomp, forceSave };
  }
}
