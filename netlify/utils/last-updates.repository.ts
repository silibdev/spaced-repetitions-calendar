import { DB } from './db-connector';
import { getUpdatedAtFromRow, RepositoryResult } from './utils';

export const LastUpdatesRepository = {
  async getLastUpdates(userId: string): Promise<RepositoryResult<any>> {
    const listAndSettingsRows = await DB.query<{
      eventlist_updated_at: string | Date | null;
      settings_updated_at: string | Date | null;
    }>(
      `SELECT
         el.updated_at AS eventlist_updated_at,
         s.updated_at AS settings_updated_at
       FROM eventlist el
       LEFT JOIN settings s ON s."user" = el."user"
       WHERE el."user" = $1
       LIMIT 1`,
      [userId],
    );

    const firstRow = listAndSettingsRows[0];
    const eventListUpdate = getUpdatedAtFromRow({
      updated_at: firstRow?.eventlist_updated_at,
    });
    const settingsUpdate = getUpdatedAtFromRow({
      updated_at: firstRow?.settings_updated_at,
    });
    console.log({ eventListUpdate, settingsUpdate });

    const eventRows = await DB.query<{
      id: string;
      detail_updated_at: string | Date | null;
      desc_updated_at: string | Date | null;
    }>(
      `SELECT
         ed.id,
         ed.updated_at AS detail_updated_at,
         edesc.updated_at AS desc_updated_at
       FROM eventdetail ed
       LEFT JOIN eventdescription edesc ON edesc."user" = ed."user" AND edesc.id = ed.id
       WHERE ed."user" = $1`,
      [userId],
    );

    const detUpdates: any[] = [];
    const desUpdates: any[] = [];

    (eventRows || []).forEach((row) => {
      const id = row.id;
      desUpdates.push({
        id,
        updatedAt: getUpdatedAtFromRow({ updated_at: row.desc_updated_at }),
      });
      detUpdates.push({
        id,
        updatedAt: getUpdatedAtFromRow({ updated_at: row.detail_updated_at }),
      });
    });

    return {
      data: {
        eventList: eventListUpdate,
        eventDescriptions: desUpdates,
        eventDetails: detUpdates,
        settings: settingsUpdate,
      },
      updatedAt: '',
    };
  },
};
