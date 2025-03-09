import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { distinctUntilChanged, map, Observable, startWith } from 'rxjs';
import { SettingsService } from '../../home/services/settings.service';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
  providers: [MessageService],
})
export class GeneralComponent implements OnInit {
  generalForm: UntypedFormGroup;
  autoSavingMinutes$?: Observable<string>;

  constructor(
    private settingsService: SettingsService,
    private messageService: MessageService,
    fb: UntypedFormBuilder,
  ) {
    const { autoSavingTimer } = this.settingsService.generalOptions;
    this.generalForm = fb.group({
      autoSavingTimer: [autoSavingTimer],
    });

    this.autoSavingMinutes$ = this.generalForm
      .get('autoSavingTimer')
      ?.valueChanges.pipe(
        startWith(autoSavingTimer),
        distinctUntilChanged(),
        map((seconds) => {
          const minutes: number = Math.floor(seconds / 60);
          return (
            minutes + ':' + (seconds - minutes * 60).toString().padStart(2, '0')
          );
        }),
      );
  }

  ngOnInit(): void {}

  save(): void {
    const formValue = this.generalForm.value;
    const saved = this.settingsService.saveGeneralOptions({
      autoSavingTimer: formValue.autoSavingTimer,
    });
    if (saved) {
      this.messageService.add({
        summary: 'Saved!',
        severity: 'success',
      });
    } else {
      this.messageService.add({
        summary: 'Error!',
        severity: 'error',
      });
    }
  }
}
