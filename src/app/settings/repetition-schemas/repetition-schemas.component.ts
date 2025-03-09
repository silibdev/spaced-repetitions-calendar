import { Component, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SettingsService } from '../../home/services/settings.service';

@Component({
  selector: 'app-repetition-schemas',
  templateUrl: './repetition-schemas.component.html',
  styleUrls: ['./repetition-schemas.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class RepetitionSchemasComponent implements OnInit {
  repSchemasForm: UntypedFormArray;
  addingNew = false;

  constructor(
    private settingsService: SettingsService,
    private formBuilder: UntypedFormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.repSchemasForm = formBuilder.array(
      this.settingsService.repetitionSchemaOpts.map((rs) => [
        {
          value: rs.value,
          disabled: true,
        },
      ]),
    );
  }

  ngOnInit(): void {}

  enableEdit(index: number): void {
    this.repSchemasForm.at(index).enable();
  }

  private cancelOperation(index: number, success: boolean): void {
    this.repSchemasForm.at(index).disable();
    if (index + 1 === this.repSchemasForm.length && this.addingNew) {
      this.addingNew = false;
      if (!success) {
        this.repSchemasForm.removeAt(index);
      }
    }
  }

  edit(index: number): void {
    const repSchema = this.repSchemasForm.at(index).value;
    const success = this.settingsService.editRepetitionSchema(index, repSchema);
    if (success) {
      this.messageService.add({
        summary: 'Saved!',
        severity: 'success',
      });
    } else {
      this.messageService.add({
        summary: 'Error!',
        detail: 'Schema is already present.',
        severity: 'error',
      });
    }
    this.cancelOperation(index, success);
  }

  cancel(index: number): void {
    // prevent "index out of bound"
    const oldSchema = this.settingsService.repetitionSchemaOpts[index]?.value;
    if (oldSchema) {
      this.repSchemasForm.at(index).setValue(oldSchema);
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
      },
    });
  }

  delete(index: number): void {
    this.settingsService.deleteRepetitionSchema(index);
    this.repSchemasForm.removeAt(index);
    this.messageService.add({
      summary: 'Deleted!',
      severity: 'success',
    });
    this.cancelOperation(index, true);
  }

  addNew(): void {
    this.repSchemasForm.push(this.formBuilder.control(undefined));
    this.addingNew = true;
  }
}
