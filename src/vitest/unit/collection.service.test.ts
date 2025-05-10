import { fastHash } from '@/common/utils';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import { it, vi } from 'vitest';
import {
  getCollectionItem,
  ITEM_TYPES,
  markAsConflict,
  NON_PARENT_UPDATABLE_FIELDS,
  UPDATABLE_FIELDS
} from '../setup/test.utils';

describe('collection service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  ITEM_TYPES.forEach(({ type, typeVal, addMethod, defaultTitle }) => {
    describe(`operations on a ${type}`, () => {
      it(`should create a new ${type} with default fields`, () => {
        const now = Date.now();
        const id = collectionService[addMethod](ROOT_FOLDER);
        expect(collectionService.itemExists(id)).toBeTruthy();
        const item = getCollectionItem(id);
        expect(item.type).toBe(typeVal);
        expect(item.created).toBe(now);
        expect(item.updated).toBe(now);
        expect(item.conflict).toBeUndefined();
        // title
        expect(item.title).toBe(defaultTitle);
        let meta = JSON.parse(item.title_meta);
        expect(meta.updated).toBe(item.updated);
        expect(meta.hash).toBe(fastHash(item.title));
        // content
        if (typeVal === 'd') {
          expect(item.content).not.toHaveLength(0);
          meta = JSON.parse(item.content_meta!);
          expect(meta.updated).toBe(item.updated);
          expect(meta.hash).toBe(fastHash(item.content!));
        }
        if (typeVal === 'f') {
          expect(item.content).toBeUndefined();
          expect(item.content_meta).toBeUndefined();
        }
        // parent
        expect(item.parent).toBe(ROOT_FOLDER);
        meta = JSON.parse(item.parent_meta);
        expect(meta.updated).toBe(item.updated);
        expect(meta.hash).toBe(fastHash(item.parent));
        // deleted
        expect(item.deleted).toBe(false);
        meta = JSON.parse(item.deleted_meta);
        expect(meta.updated).toBe(item.updated);
        expect(meta.hash).toBe(fastHash(item.deleted + ''));
      });

      it(`should create a new ${type} inside an existing folder`, () => {
        const folderId = collectionService.addFolder(ROOT_FOLDER);
        vi.advanceTimersByTime(100);

        const id = collectionService[addMethod](folderId);
        expect(collectionService.itemExists(id)).toBeTruthy();
        const folder = getCollectionItem(folderId);
        const item = getCollectionItem(id);
        expect(item.parent).toBe(folderId);
        expect(item.created).toBeGreaterThan(folder.created);
      });

      NON_PARENT_UPDATABLE_FIELDS.forEach(({ field }) => {
        if (field !== 'content' || type !== 'folder') {
          it(`should update the ${field} of a ${type}`, () => {
            const id = collectionService[addMethod](ROOT_FOLDER);
            vi.advanceTimersByTime(100);
            collectionService.setItemField(id, field, 'new value');
            const item = getCollectionItem(id);
            expect(item[field]).toBe('new value');
            expect(item.created).toBeLessThan(item.updated);
            const meta = JSON.parse(item[`${field}_meta`]!);
            expect(meta.updated).toBe(item.updated);
            expect(meta.hash).toBe(fastHash(item[field] + ''));
          });

          it(`should update the ${field} of a ${type} and recursively update all parents timestamp`, () => {
            const now = Date.now();
            const folderIdO = collectionService.addFolder(ROOT_FOLDER);
            const folderId1 = collectionService.addFolder(ROOT_FOLDER);
            const folderId2 = collectionService.addFolder(folderId1);
            const folderId3 = collectionService.addFolder(folderId2);
            const id = collectionService[addMethod](folderId3);
            vi.advanceTimersByTime(100);
            collectionService.setItemField(id, field, 'new value');
            const item = getCollectionItem(id);
            expect(item[field]).toBe('new value');
            expect(item.created).toBeLessThan(item.updated);
            const meta = JSON.parse(item[`${field}_meta`]!);
            expect(meta.updated).toBe(item.updated);
            expect(meta.hash).toBe(fastHash(item[field] + ''));

            const folderO = getCollectionItem(folderIdO);
            const folder1 = getCollectionItem(folderId1);
            const folder2 = getCollectionItem(folderId2);
            const folder3 = getCollectionItem(folderId3);

            expect(folderO.updated).toBe(now); // this one is untouched
            expect(JSON.parse(folderO.parent_meta).updated).toBe(now);
            expect(folder1.updated).toBe(now + 100);
            expect(JSON.parse(folder1.parent_meta).updated).toBe(now);
            expect(folder2.updated).toBe(now + 100);
            expect(JSON.parse(folder2.parent_meta).updated).toBe(now);
            expect(folder3.updated).toBe(now + 100);
            expect(JSON.parse(folder3.parent_meta).updated).toBe(now);
          });
        }
      });

      it(`should update the parent of a ${type}`, () => {
        const folderId = collectionService.addFolder(ROOT_FOLDER);
        const id = collectionService[addMethod](ROOT_FOLDER);
        vi.advanceTimersByTime(100);
        collectionService.setItemParent(id, folderId);
        const item = getCollectionItem(id);
        expect(item.parent).toBe(folderId);
        expect(item.created).toBe(item.updated); // parent change doesn't update ts
        const meta = JSON.parse(item.parent_meta);
        expect(meta.updated).toBeGreaterThan(item.updated);
        expect(meta.hash).toBe(fastHash(item.parent));
      });

      it(`should update the parent of a ${type} and leave all parents timestamp untouched`, () => {
        const now = Date.now();
        const folderIdO = collectionService.addFolder(ROOT_FOLDER);
        const folderId1 = collectionService.addFolder(ROOT_FOLDER);
        const folderId2 = collectionService.addFolder(folderId1);
        const folderId3 = collectionService.addFolder(folderId2);
        const id = collectionService[addMethod](folderId3);
        vi.advanceTimersByTime(100);
        collectionService.setItemParent(id, folderId2);
        const item = getCollectionItem(id);
        expect(item.parent).toBe(folderId2);
        expect(item.created).toBe(item.updated);
        const meta = JSON.parse(item.parent_meta);
        expect(meta.updated).toBeGreaterThan(item.updated);
        expect(meta.hash).toBe(fastHash(item.parent));

        const folderO = getCollectionItem(folderIdO);
        const folder1 = getCollectionItem(folderId1);
        const folder2 = getCollectionItem(folderId2);
        const folder3 = getCollectionItem(folderId3);

        expect(folderO.updated).toBe(now); // all are untouched
        expect(JSON.parse(folderO.parent_meta).updated).toBe(now);
        expect(folder1.updated).toBe(now);
        expect(JSON.parse(folder1.parent_meta).updated).toBe(now);
        expect(folder2.updated).toBe(now);
        expect(JSON.parse(folder2.parent_meta).updated).toBe(now);
        expect(folder3.updated).toBe(now);
        expect(JSON.parse(folder3.parent_meta).updated).toBe(now);
      });

      it(`should delete an existing ${type}`, () => {
        const id = collectionService[addMethod](ROOT_FOLDER);
        vi.advanceTimersByTime(100);
        collectionService.deleteItem(id);
        const item = getCollectionItem(id);
        expect(item.title).toBeUndefined();
        expect(collectionService.itemExists(id)).toBe(false);
      });

      it(`should delete an existing ${type} and recursively update all parents timestamp`, () => {
        const now = Date.now();
        const folderIdO = collectionService.addFolder(ROOT_FOLDER);
        const folderId1 = collectionService.addFolder(ROOT_FOLDER);
        const folderId2 = collectionService.addFolder(folderId1);
        const folderId3 = collectionService.addFolder(folderId2);
        const id = collectionService[addMethod](folderId3);
        vi.advanceTimersByTime(100);
        collectionService.deleteItem(id);
        const item = getCollectionItem(id);
        expect(item.title).toBeUndefined();
        expect(collectionService.itemExists(id)).toBe(false);

        const folderO = getCollectionItem(folderIdO);
        const folder1 = getCollectionItem(folderId1);
        const folder2 = getCollectionItem(folderId2);
        const folder3 = getCollectionItem(folderId3);

        expect(folderO.updated).toBe(now); // this one is untouched
        expect(JSON.parse(folderO.parent_meta).updated).toBe(now);
        expect(folder1.updated).toBe(now + 100);
        expect(JSON.parse(folder1.parent_meta).updated).toBe(now);
        expect(folder2.updated).toBe(now + 100);
        expect(JSON.parse(folder2.parent_meta).updated).toBe(now);
        expect(folder3.updated).toBe(now + 100);
        expect(JSON.parse(folder3.parent_meta).updated).toBe(now);
      });
    });
  });

  UPDATABLE_FIELDS.forEach(({ field }) => {
    it(`should reset conflict on a document on update of ${field}`, () => {
      const id = collectionService.addDocument(ROOT_FOLDER);
      const id2 = collectionService.addDocument(ROOT_FOLDER);
      markAsConflict(id, id2);
      expect(getCollectionItem(id).conflict).toBeDefined();

      collectionService.setItemField(id, field, 'new value');
      expect(getCollectionItem(id).conflict).toBeUndefined();
    });
  });

  it.todo(
    `should delete an existing folder with items in it without orphaning them`,
    () => {
      //
    }
  );
});
