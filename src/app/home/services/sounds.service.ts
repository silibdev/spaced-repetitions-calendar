import { Injectable } from '@angular/core';
import {
  first,
  from,
  map,
  Observable,
  of,
  pairwise,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { Howl } from 'howler';

type SoundConfig = {
  correct: string;
  wrong: string;
  complete: string;
  done: string;
};

@Injectable({
  providedIn: 'root',
})
export class SoundsService {
  private soundsConfig: SoundConfig = {
    correct: 'assets/sounds/correct.mp3',
    wrong: 'assets/sounds/wrong.mp3',
    complete: 'assets/sounds/complete.mp3',
    done: 'assets/sounds/done.mp3',
  };
  private soundsMap: Record<string, Howl> = {};
  private soundsSubj$ = new Subject<keyof SoundConfig | null>();
  private sounds$: Observable<unknown>;
  private soundComplete$ = new Subject();

  constructor() {
    Object.entries(this.soundsConfig).forEach(([name, path]) => {
      const audio = new Howl({
        src: [path],
      });
      this.soundsMap[name] = audio;
    });

    this.sounds$ = this.soundsSubj$.asObservable().pipe(
      startWith(null),
      pairwise(),
      tap(([prevSound, nextSound]) => {
        if (prevSound) {
          this.soundsMap[prevSound].stop();
        }
      }),
      switchMap(([prevSound, nextSound]) => {
        if (nextSound) {
          return from(
            new Promise((resolve) => {
              const audio = this.soundsMap[nextSound];
              audio.on('stop', () => resolve(undefined));
              audio.on('end', () => resolve(undefined));
              audio.play();
            }),
          ).pipe(
            map(() => nextSound),
            tap(() => {
              this.soundComplete$.next(null);
              this.soundsSubj$.next(null);
            }),
          );
        }
        this.soundComplete$.next(null);
        return of();
      }),
    );

    this.sounds$.subscribe();
  }

  playSound(sound: keyof SoundConfig): Promise<any> {
    const promise = new Promise((resolve) => {
      this.soundComplete$.pipe(first()).subscribe(resolve);
    });
    this.soundsSubj$.next(sound);
    return promise;
  }
}
