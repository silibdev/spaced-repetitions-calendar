import { v4 } from 'uuid';

export class Utils {
  static playAudio(audio: HTMLAudioElement | undefined) {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      return new Promise(resolve => {
        audio.play();
        audio.addEventListener("ended", () => resolve(undefined));
      });
    }
    return Promise.resolve();
  }

  static generateRandomUUID(): string {
    return v4();
  }

  static generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }
}
