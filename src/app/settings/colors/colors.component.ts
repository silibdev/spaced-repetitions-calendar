import { Component, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder } from '@angular/forms';
import { SettingsService } from '../../home/services/settings.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-colors',
  templateUrl: './colors.component.html',
  styleUrls: ['./colors.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ColorsComponent implements OnInit {

  //Array of group label-value
  colorsForm: UntypedFormArray;
  addingNew = false;

  constructor(
    private settingsService: SettingsService,
    private formBuilder: UntypedFormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.colorsForm = formBuilder.array(this.settingsService.colors.map(color =>
      this.formBuilder.group({
        label: color.label,
        value: color.value
      })
    ));
    this.colorsForm.disable();
  }

  ngOnInit(): void {
  }

  enableEdit(index: number): void {
    this.colorsForm.at(index).enable();
  }

  private cancelOperation(index: number, success: boolean): void {
    this.colorsForm.at(index).disable();
    if ((index + 1) === this.colorsForm.length && this.addingNew) {
      this.addingNew = false;
      if (!success) {
        this.colorsForm.removeAt(index);
      }
    }
  }

  edit(index: number): void {
    const color = this.colorsForm.at(index).value;
    const success = this.settingsService.editColor(index, color);
    if (success) {
      this.messageService.add({
        summary: 'Saved!',
        severity: 'success'
      });
    } else {
      this.messageService.add({
        summary: 'Error!',
        detail: 'Color is already present.',
        severity: 'error'
      });
    }
    this.cancelOperation(index, success);
  }

  cancel(index: number): void {
    // prevent "index out of bound"
    const oldColor = this.settingsService.colors[index];
    if (oldColor) {
      this.colorsForm.at(index).setValue(oldColor);
    }
    this.cancelOperation(index, false);
  }

  confirmDelete(event: Event, index: number) {
    this.confirmationService.confirm({
      target: event.target || undefined,
      message: 'Are you sure you want to delete it?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.delete(index);
      }
    });
  }

  delete(index: number): void {
    this.settingsService.deleteColor(index);
    this.colorsForm.removeAt(index);
    this.messageService.add({
      summary: 'Deleted!',
      severity: 'success'
    });
    this.cancelOperation(index, true);
  }

  addNew(): void {
    this.colorsForm.push(this.formBuilder.group({
      value: '#000',
      label: undefined
    }));
    this.addingNew = true;
  }
}
