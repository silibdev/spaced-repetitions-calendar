import { Injectable } from '@angular/core';
import { first, from, map, Observable, of, pairwise, startWith, Subject, switchMap, tap } from 'rxjs';
import { Utils } from '../../utils';

type SoundConfig = {
  correct: string;
  wrong: string;
  complete: string;
  done: string
}

@Injectable({
  providedIn: 'root'
})
export class SoundsService {

  private soundsConfig: SoundConfig = {
    correct: 'assets/sounds/correct.mp3',
    wrong: 'assets/sounds/wrong.mp3',
    complete: 'assets/sounds/complete.mp3',
    done: 'assets/sounds/done.mp3'
  };
  private soundsMap: Record<string, HTMLAudioElement> = {};
  private soundsSubj$ = new Subject<keyof SoundConfig | null>();
  private sounds$: Observable<unknown>;
  private soundComplete$ = new Subject();

  constructor() {
    Object.entries(this.soundsConfig).forEach(([name, path]) => {
      const audio = new Audio();
      audio.src = path;
      audio.load();
      this.soundsMap[name] = audio;
    });

    this.sounds$ = this.soundsSubj$.asObservable().pipe(
      startWith(null),
      pairwise(),
      tap(([prevSound, nextSound]) => {
        if (prevSound && nextSound && prevSound !== nextSound) {
          Utils.stopAudio(this.soundsMap[prevSound]);
        }
      }),
      switchMap(([prevSound, nextSound]) => {
          if (nextSound) {
            return from(Utils.playAudio(this.soundsMap[nextSound])).pipe(
              map(() => nextSound),
              tap(() => {
                this.soundComplete$.next(null);
                this.soundsSubj$.next(null);
              })
            );
          }
          this.soundComplete$.next(null);
          return of();
        }
      )
    );

    this.sounds$.subscribe();
  }

  playSound(sound: keyof SoundConfig): Promise<any> {
    const promise = new Promise(resolve => {
      this.soundComplete$.pipe(first()).subscribe(resolve);
    });
    this.soundsSubj$.next(sound);
    return promise;
  }
}
