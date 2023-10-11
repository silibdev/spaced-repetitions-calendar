import { v4 } from 'uuid';

export class Utils {
  static playAudio(audio: HTMLAudioElement | undefined) {
    console.log('playing', audio);
    if (!audio) {
      return Promise.resolve();
    }
    Utils.stopAudio(audio);
    return new Promise(resolve => {
      audio.play();
      audio.addEventListener("ended", () => resolve(undefined));
    });
  }

  static generateRandomUUID(): string {
    return v4();
  }

  static generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }

  static stopAudio(audio: HTMLAudioElement | undefined) {
    console.log('stop', audio);
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
  }
}
