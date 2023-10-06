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
}
