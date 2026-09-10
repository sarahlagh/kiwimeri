import { appConfig } from '@/config';
import { getCurrentProfile, store } from '@/core/db/store';
import { StoreTables } from '@/core/db/store-constants';
import { plt } from '@/core/infra/platform';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';

class ProfileService {
  public createProfile(profileName: string) {
    store.setRow(StoreTables.Profiles, profileName, {
      createdAt: Date.now()
    });
    const wasDeleted = schedule.hasTask(TaskNames.DELETE_NATIVE_BACKUPS, {
      profileName
    });
    if (wasDeleted) {
      schedule.cancel(wasDeleted);
    }
  }

  public deleteProfile(profileName: string) {
    const current = getCurrentProfile();
    if (profileName === current || profileName === 'default') return;
    store.delRow(StoreTables.Profiles, profileName);
    // delete the db too!!
    setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).indexedDB) return; // if indexedDB is not defined, don't bother
      await this.deleteDatabase(`kiwimeri-space-${profileName}`);
      await this.deleteDatabase(
        `kiwimeri-space-document-content-${profileName}`
      );
      await this.deleteDatabase(`kiwimeri-space-archive-${profileName}`);
    });
    // schedule in a day: hard deletion of the profile backups
    // leaves a day to recreate the profile without losing data
    if (plt.hasNativeSupport()) {
      schedule.in(
        appConfig.DELETE_NATIVE_BACKUPS_DELAY,
        TaskNames.DELETE_NATIVE_BACKUPS,
        {
          profileName
        }
      );
    }
  }

  private deleteDatabase(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error(`Failed to delete ${name}`));

      request.onblocked = () =>
        reject(new Error(`Deletion of ${name} is blocked`));
    });
  }
}

export const profileService = new ProfileService();
