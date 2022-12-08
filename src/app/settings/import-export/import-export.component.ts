import { Component, OnInit } from '@angular/core';
import fileDownload from 'js-file-download';
import { FileUpload } from 'primeng/fileupload';
import { AuthService } from '../../home/services/auth.service';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { SpacedRepService } from '../../home/services/spaced-rep.service';
import { ConfirmationService } from 'primeng/api';


@Component({
  selector: 'app-import-export',
  templateUrl: './import-export.component.html',
  styleUrls: ['./import-export.component.scss'],
  providers: [ConfirmationService]
})
export class ImportExportComponent implements OnInit {

  error?: string;

  isNotLoggedIn$: Observable<boolean>;
  isLoggedIn$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private spacedRepService: SpacedRepService,
    private confirmationService: ConfirmationService
  ) {
    this.isNotLoggedIn$ = this.authService.getUser$().pipe(map(user => !user?.token), shareReplay());
    this.isLoggedIn$ = this.authService.getUser$().pipe(map(user => !!user?.token), shareReplay());
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
    });
  }

  deleteAllData(): void {
    this.spacedRepService.deleteAllData().pipe(
      tap(() => location.reload())
    ).subscribe();
  }

  confirmRemoteDataDeletion() {
    this.confirmationService.confirm({
      header: 'Attention: this action is NOT reversible',
      message: 'Are you sure you want to delete all your data from your account and log out?',
      accept: () => this.deleteAllData()
    });
  }

  confirmLocalDataDeletion() {
    this.confirmationService.confirm({
      header: 'Attention: this action is NOT reversible',
      message: 'Are you sure you want to delete all your data?',
      accept: () => this.spacedRepService.desyncLocal().subscribe(() => location.reload())
    });
  }

  confirmDataImport(event: any) {
    this.confirmationService.confirm({
      header: 'Attention: this action is NOT reversible',
      message: 'Are you sure you want to import the data? It will replace all current data!',
      accept: () => alert('Function not implemented yet')
    });
  }
}
