import storageService from '@/db/storage.service';

export const getStore = () => storageService.getStore();
export const getSpace = () => storageService.getSpace();
export const getStoreMetrics = () => storageService.getStoreMetrics();
export const getSpaceMetrics = () => storageService.getSpaceMetrics();
export const getStoreQueries = () => storageService.getStoreQueries();
export const getSpaceQueries = () => storageService.getSpaceQueries();
