import storageService from '@/db/storage.service';

export const getStore = () => storageService.getStore();
export const getSpace = () => storageService.getSpace();
export const getStoreQueries = () => storageService.getStoreQueries();
export const getSpaceQueries = () => storageService.getSpaceQueries();
