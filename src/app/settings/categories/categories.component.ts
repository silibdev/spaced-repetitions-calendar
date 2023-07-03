import { Component, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder } from '@angular/forms';
import { SettingsService } from '../../home/services/settings.service';
import { MessageService } from 'primeng/api';
import { Category } from '../../home/models/settings.model';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {

//Array of group label-value
  categoriesForm: UntypedFormArray;
  addingNew = false;

  constructor(
    private settingsService: SettingsService,
    private formBuilder: UntypedFormBuilder,
    private messageService: MessageService
  ) {
    this.categoriesForm = formBuilder.array(this.settingsService.categories.map(category =>
      this.formBuilder.group({
        label: category.label,
        value: category.value
      })
    ));
    this.categoriesForm.disable();
  }

  ngOnInit(): void {
  }

  enableEdit(index: number): void {
    this.categoriesForm.at(index).enable();
  }

  private cancelOperation(index: number, success: boolean): void {
    this.categoriesForm.at(index).disable();
    if ((index + 1) === this.categoriesForm.length && this.addingNew) {
      this.addingNew = false;
      if (!success) {
        this.categoriesForm.removeAt(index);
      }
    }
  }

  edit(index: number): void {
    const category: Category = this.categoriesForm.at(index).value;
    const success = this.settingsService.editCategory(index, category);
    if (success) {
      this.messageService.add({
        summary: 'Saved!',
        severity: 'success'
      });
    } else {
      this.messageService.add({
        summary: 'Error!',
        detail: 'Category is already present.',
        severity: 'error'
      });
    }
    this.cancelOperation(index, success);
  }

  cancel(index: number): void {
    // prevent "index out of bound"
    const category = this.settingsService.categories[index];
    if (category) {
      this.categoriesForm.at(index).setValue(category);
    }
    this.cancelOperation(index, false);
  }

  addNew(): void {
    this.categoriesForm.push(this.formBuilder.group({
      value: 'cod' + Date.now(),
      label: 'New category'
    }));
    this.addingNew = true;
  }
}
