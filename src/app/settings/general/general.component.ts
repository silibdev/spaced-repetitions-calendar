import { Component, OnInit } from '@angular/core';
import { EventFormService } from '../../home/services/event-form.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { distinctUntilChanged, map, Observable, startWith } from 'rxjs';


@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
  providers: [MessageService]
})
export class GeneralComponent implements OnInit {

  generalForm: FormGroup;
  autoSavingMinutes$?: Observable<string>;

  constructor(
    private eventFormService: EventFormService,
    private messageService: MessageService,
    fb: FormBuilder
  ) {
    const {autoSavingTimer} = this.eventFormService.generalOptions;
    this.generalForm = fb.group({
      autoSavingTimer: [autoSavingTimer]
    });

    this.autoSavingMinutes$ = this.generalForm.get('autoSavingTimer')?.valueChanges.pipe(
      startWith(autoSavingTimer),
      distinctUntilChanged(),
      map( seconds => {
        const minutes: number = Math.floor(seconds / 60);
        return minutes + ':' + (seconds - minutes * 60).toString().padStart(2, '0');
      })
    )
  }

  ngOnInit(): void {
  }

  save(): void {
    const formValue = this.generalForm.value;
    const saved = this.eventFormService.saveGeneralOptions({
      autoSavingTimer: formValue.autoSavingTimer
    });
    if (saved) {
      this.messageService.add({
        summary: 'Saved!',
        severity: 'success'
      });
    } else {
      this.messageService.add({
        summary: 'Error!',
        severity: 'error'
      })
    }
  }



}
