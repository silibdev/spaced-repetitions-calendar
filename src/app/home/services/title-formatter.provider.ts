import { CalendarEventTitleFormatter } from 'angular-calendar';
import { Provider } from '@angular/core';
import { SpacedRepModel } from '../models/spaced-rep.model';

class TitleFormatter extends CalendarEventTitleFormatter {
  private static getTitle(event: SpacedRepModel): string {
    return `${event.title} - ${event.description}`;
  }

  override month(event: SpacedRepModel, title: string): string {
    return TitleFormatter.getTitle(event);
  }

  override week(event: SpacedRepModel, title: string): string {
    return TitleFormatter.getTitle(event);
  }

  override day(event: SpacedRepModel, title: string): string {
    return TitleFormatter.getTitle(event);
  }
}

export const TitleFormatterProvider: Provider = {
  provide: CalendarEventTitleFormatter,
  useClass: TitleFormatter
}
