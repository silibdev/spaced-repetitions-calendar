 import { Component, OnInit } from '@angular/core';
import fileDownload from 'js-file-download';
import { FileUpload } from 'primeng/fileupload';


@Component({
  selector: 'app-import-export',
  templateUrl: './import-export.component.html',
  styleUrls: ['./import-export.component.scss']
})
export class ImportExportComponent implements OnInit {

  error?: string;

  constructor() {
  }

  ngOnInit(): void {
  }

  export(): void {
    const backup = JSON.stringify(localStorage, null, 2)
    fileDownload(backup, `backup-${new Date().toISOString()}.txt`)
  }

  backupSelected(event: any, fileUpload: FileUpload): void {
    const backup: File = event.files[0];

    this.error = undefined;
    backup.text().then( content => {
      fileUpload.clear();
      try {
        JSON.parse(content);
        const newBackup = new File([backup], 'Restore: ' + backup.name);
        fileUpload.files = [newBackup];
      } catch (e) {
        this.error = 'File is not correct';
      }
    });
  }

  restore(event: any): void {
    const backup: File = event.files[0];

    backup.text().then( content => {
      localStorage.clear();
      const newStore = JSON.parse(content);
      for (const key in newStore) {
        localStorage.setItem(key, newStore[key]);
      }

      alert('Restore completed successfully!');
      location.reload();
    })
  }
}
