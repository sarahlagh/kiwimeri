import { getCurrentProfile, store } from '@/core/db/store';
import { StoreTables } from '@/core/db/store-constants';

class ProfileService {
  public createProfile(profileName: string) {
    store.setRow(StoreTables.Profiles, profileName, {
      createdAt: Date.now()
    });
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
