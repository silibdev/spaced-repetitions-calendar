import { Directive } from '@angular/core';
import { Dialog } from 'primeng/dialog';

@Directive({
  selector: 'p-dialog[appMaximized]'
})
export class DialogMaximizedDirective {

  constructor(
    private dialog: Dialog
  ) {
    const oldOnAnimationStart = this.dialog.onAnimationStart.bind(this.dialog);
    this.dialog.onAnimationStart = (event: any) => {
      this.dialog.maximized = true;
      oldOnAnimationStart(event);
    }
  }

}
