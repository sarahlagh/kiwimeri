class SyncService {
  // public async push() {
  //   const content = this.getSpace().getJson();
  //   const lastModified = await remotesService
  //     .getCurrentProvider()
  //     .push(content);
  //   this.getStore().transaction(() => {
  //     this.setLastLocalChange(lastModified);
  //     remotesService.setLastRemoteChange(lastModified as number);
  //   });
  // }
  // public async pull() {
  //   const resp = await remotesService.getCurrentProvider().pull();
  //   if (resp && resp.content) {
  //     this.getSpace().setContent(resp.content);
  //     this.getStore().transaction(() => {
  //       this.setLastLocalChange(resp.lastRemoteChange!);
  //       remotesService.setLastRemoteChange(resp.lastRemoteChange!);
  //     });
  //   }
  // }
  // public useCurrentHasLocalChanges() {
  //   const lastRemoteChange =
  //     (useCell(
  //       this.stateTable,
  //       'default-pcloud',
  //       'lastRemoteChange',
  //       storageService.getStore() as unknown as Store
  //     )?.valueOf() as number) || 0;
  //   const lastLocalChange = storageService.useLastLocalChange();
  //   return lastLocalChange > lastRemoteChange;
  // }
}

export const syncService = new SyncService();
