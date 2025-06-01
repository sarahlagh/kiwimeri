import { CollectionItemType, parseFieldMeta } from '@/collection/collection';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { it, vi } from 'vitest';
import {
  BROWSABLE_ITEM_TYPES,
  GET_NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS,
  getCollectionItem,
  getLocalItemField,
  markAsConflict,
  UPDATABLE_FIELDS
} from '../../setup/test.utils';

const shortContent = JSON.parse(
  '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is a short content","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'
);

const loremIpsum = JSON.parse(
  '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"\\"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum\\"","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'
);

describe('collection service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  BROWSABLE_ITEM_TYPES.forEach(({ type, typeVal, addMethod, defaultTitle }) => {
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
        let meta = parseFieldMeta(item.title_meta);
        expect(meta.u).toBe(item.updated);
        // content
        if (typeVal === CollectionItemType.document) {
          expect(item.content).not.toHaveLength(0);
          meta = parseFieldMeta(item.content_meta!);
          expect(meta.u).toBe(item.updated);
        }
        if (typeVal === CollectionItemType.folder) {
          expect(item.content).toBeUndefined();
          expect(item.content_meta).toBeUndefined();
        }
        // parent
        expect(item.parent).toBe(ROOT_FOLDER);
        meta = parseFieldMeta(item.parent_meta);
        expect(meta.u).toBe(item.updated);
        // deleted
        expect(item.deleted).toBe(false);
        meta = parseFieldMeta(item.deleted_meta);
        expect(meta.u).toBe(item.updated);
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

      GET_NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS(type).forEach(
        ({ field }) => {
          it(`should update the ${field} of a ${type}`, () => {
            const id = collectionService[addMethod](ROOT_FOLDER);
            vi.advanceTimersByTime(100);
            collectionService.setItemField(id, field, 'new value');
            const item = getCollectionItem(id);
            expect(item[field]).toBe('new value');
            expect(item.created).toBeLessThan(item.updated);
            const meta = parseFieldMeta(item[`${field}_meta`]!);
            expect(meta.u).toBe(item.updated);
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
            const meta = parseFieldMeta(item[`${field}_meta`]!);
            expect(meta.u).toBe(item.updated);

            const folderO = getCollectionItem(folderIdO);
            const folder1 = getCollectionItem(folderId1);
            const folder2 = getCollectionItem(folderId2);
            const folder3 = getCollectionItem(folderId3);

            expect(folderO.updated).toBe(now); // this one is untouched
            expect(parseFieldMeta(folderO.parent_meta).u).toBe(now);
            expect(folder1.updated).toBe(now + 100);
            expect(parseFieldMeta(folder1.parent_meta).u).toBe(now);
            expect(folder2.updated).toBe(now + 100);
            expect(parseFieldMeta(folder2.parent_meta).u).toBe(now);
            expect(folder3.updated).toBe(now + 100);
            expect(parseFieldMeta(folder3.parent_meta).u).toBe(now);
          });
        }
      );

      it(`should update the parent of a ${type}`, () => {
        const folderId = collectionService.addFolder(ROOT_FOLDER);
        const id = collectionService[addMethod](ROOT_FOLDER);
        vi.advanceTimersByTime(100);
        collectionService.setItemParent(id, folderId);
        const item = getCollectionItem(id);
        expect(item.parent).toBe(folderId);
        expect(item.created).toBe(item.updated); // parent change doesn't update ts
        const meta = parseFieldMeta(item.parent_meta);
        expect(meta.u).toBeGreaterThan(item.updated);
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
        const meta = parseFieldMeta(item.parent_meta);
        expect(meta.u).toBeGreaterThan(item.updated);

        const folderO = getCollectionItem(folderIdO);
        const folder1 = getCollectionItem(folderId1);
        const folder2 = getCollectionItem(folderId2);
        const folder3 = getCollectionItem(folderId3);

        expect(folderO.updated).toBe(now); // all are untouched
        expect(parseFieldMeta(folderO.parent_meta).u).toBe(now);
        expect(folder1.updated).toBe(now);
        expect(parseFieldMeta(folder1.parent_meta).u).toBe(now);
        expect(folder2.updated).toBe(now);
        expect(parseFieldMeta(folder2.parent_meta).u).toBe(now);
        expect(folder3.updated).toBe(now);
        expect(parseFieldMeta(folder3.parent_meta).u).toBe(now);
      });

      it(`should update the notebook of a ${type}`, () => {
        const notebookId = notebooksService.addNotebook('non default')!;
        const id = collectionService[addMethod](ROOT_FOLDER);
        vi.advanceTimersByTime(100);
        collectionService.setItemParent(id, ROOT_FOLDER, notebookId);
        const item = getCollectionItem(id);
        expect(item.notebook).toBe(notebookId);
        expect(item.created).toBe(item.updated); // parent change doesn't update ts
        const meta = parseFieldMeta(item.notebook_meta);
        expect(meta.u).toBeGreaterThan(item.updated);
      });

      it(`should update the notebook of a ${type} and leave all parents timestamp untouched`, () => {
        const now = Date.now();
        const notebookId = notebooksService.addNotebook('non default')!;
        const folderId1 = collectionService.addFolder(ROOT_FOLDER);
        const folderId2 = collectionService.addFolder(folderId1);
        const folderId3 = collectionService.addFolder(folderId2);
        const id = collectionService[addMethod](folderId3);
        vi.advanceTimersByTime(100);
        // can't update notebook without parent // TODO enforce at service level
        collectionService.setItemParent(id, ROOT_FOLDER, notebookId);
        const item = getCollectionItem(id);
        expect(item.notebook).toBe(notebookId);
        expect(item.created).toBe(item.updated);
        const meta = parseFieldMeta(item.notebook_meta);
        expect(meta.u).toBeGreaterThan(item.updated);

        const folder1 = getCollectionItem(folderId1);
        const folder2 = getCollectionItem(folderId2);
        const folder3 = getCollectionItem(folderId3);

        // all are untouched
        expect(folder1.updated).toBe(now);
        expect(parseFieldMeta(folder1.notebook_meta).u).toBe(now);
        expect(folder2.updated).toBe(now);
        expect(parseFieldMeta(folder2.notebook_meta).u).toBe(now);
        expect(folder3.updated).toBe(now);
        expect(parseFieldMeta(folder3.notebook_meta).u).toBe(now);
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
        expect(parseFieldMeta(folderO.parent_meta).u).toBe(now);
        expect(folder1.updated).toBe(now + 100);
        expect(parseFieldMeta(folder1.parent_meta).u).toBe(now);
        expect(folder2.updated).toBe(now + 100);
        expect(parseFieldMeta(folder2.parent_meta).u).toBe(now);
        expect(folder3.updated).toBe(now + 100);
        expect(parseFieldMeta(folder3.parent_meta).u).toBe(now);
      });

      it(`should add a single tag to a ${type} without changing the rest`, () => {
        const id = collectionService[addMethod](ROOT_FOLDER);

        expect([...collectionService.getItemTags(id)]).toStrictEqual([]);
        collectionService.addItemTag(id, 'tag1');

        expect([...collectionService.getItemTags(id)]).toStrictEqual(['tag1']);
        collectionService.addItemTag(id, 'tag2');

        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag2'
        ]);
      });

      it(`should add multiple tags to a ${type} without changing the rest`, () => {
        const id = collectionService[addMethod](ROOT_FOLDER);

        expect([...collectionService.getItemTags(id)]).toStrictEqual([]);
        collectionService.addItemTags(id, ['tag1', 'tag2']);
        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag2'
        ]);
        collectionService.addItemTags(id, ['tag1', 'tag3']);

        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag2',
          'tag3'
        ]);
      });

      it(`should set multiple tags to a ${type}, overwriting the rest`, () => {
        const id = collectionService[addMethod](ROOT_FOLDER);

        expect([...collectionService.getItemTags(id)]).toStrictEqual([]);
        collectionService.setItemTags(id, ['tag1', 'tag2']);
        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag2'
        ]);
        collectionService.setItemTags(id, ['tag1', 'tag3']);

        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag3'
        ]);
      });

      it(`should delete a single tag from a ${type} without changing the rest`, () => {
        const id = collectionService[addMethod](ROOT_FOLDER);
        collectionService.addItemTag(id, 'tag1');
        collectionService.addItemTag(id, 'tag2');
        collectionService.addItemTag(id, 'tag3');

        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag2',
          'tag3'
        ]);
        collectionService.delItemTag(id, 'tag2');

        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag3'
        ]);
      });

      it(`should rename a single tag from a ${type} without changing the rest`, () => {
        const id = collectionService[addMethod](ROOT_FOLDER);
        collectionService.addItemTag(id, 'tag1');
        collectionService.addItemTag(id, 'tag2');
        collectionService.addItemTag(id, 'tag3');

        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag2',
          'tag3'
        ]);
        collectionService.renameItemTag(id, 'tag2', 'tag4');

        expect([...collectionService.getItemTags(id)]).toStrictEqual([
          'tag1',
          'tag3',
          'tag4'
        ]);
      });

      if (type === 'document') {
        it(`should update the preview of a document at the same time as its content`, () => {
          const id = collectionService.addDocument(ROOT_FOLDER);
          expect(getCollectionItem(id).preview).toBe('');

          collectionService.setItemLexicalContent(id, shortContent);
          expect(getCollectionItem(id).preview).toBe('This is a short content');

          collectionService.setItemLexicalContent(id, loremIpsum);
          expect(getCollectionItem(id).preview).toBe(
            '"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor '
          );
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

        it(`should delete all pages of a document when deleting the document`, () => {
          const id = collectionService.addDocument(ROOT_FOLDER);
          const pageId1 = collectionService.addPage(id);
          const pageId2 = collectionService.addPage(id);
          const pageId3 = collectionService.addPage(id);

          collectionService.deleteItem(id);
          expect(collectionService.itemExists(id)).toBe(false);
          expect(collectionService.itemExists(pageId1)).toBe(false);
          expect(collectionService.itemExists(pageId2)).toBe(false);
          expect(collectionService.itemExists(pageId3)).toBe(false);
        });
      }

      if (type === 'folder') {
        it(`should delete an existing folder and delete items in it without orphaning them`, () => {
          // create a non empty folder
          const folderId = collectionService.addFolder(ROOT_FOLDER);
          const id = collectionService.addDocument(folderId);
          const id2 = collectionService.addDocument(folderId);

          collectionService.deleteItem(folderId);
          expect(collectionService.itemExists(folderId)).toBe(false);
          expect(collectionService.itemExists(id)).toBe(false);
          expect(collectionService.itemExists(id2)).toBe(false);
        });

        it(`should delete an existing folder and move items in it to the parent folder without orphaning them`, () => {
          // create a non empty folder
          const folderId = collectionService.addFolder(ROOT_FOLDER);
          const id = collectionService.addDocument(folderId);
          const id2 = collectionService.addDocument(folderId);

          collectionService.deleteItem(folderId, true);
          expect(collectionService.itemExists(folderId)).toBe(false);
          expect(collectionService.itemExists(id)).toBe(true);
          expect(collectionService.getItemParent(id)).toBe(ROOT_FOLDER);
          expect(collectionService.itemExists(id2)).toBe(true);
          expect(collectionService.getItemParent(id2)).toBe(ROOT_FOLDER);
        });
      }
    });
  });

  describe(`operations on a page`, () => {
    it('should add a page to a document', () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      act(() => {
        const pageId = collectionService.addPage(docId);
        expect(getLocalItemField(pageId, 'type')).toBe(CollectionItemType.page);
      });

      const { result } = renderHook(() =>
        collectionService.useDocumentPages(docId)
      );
      expect(result.current).toHaveLength(1);
    });

    it(`should update the parent (document) of a page`, () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      const docId2 = collectionService.addDocument(ROOT_FOLDER);
      const id = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      collectionService.setItemParent(id, docId2);
      const item = getCollectionItem(id);
      expect(item.parent).toBe(docId2);
      expect(item.created).toBeLessThan(item.updated); // parent change does update ts
      const meta = parseFieldMeta(item.parent_meta);
      expect(meta.u).toBe(item.updated);
    });

    it(`should update the parent (document) of a page and recursively update all parents timestamp`, () => {
      const now = Date.now();
      const folderIdO = collectionService.addFolder(ROOT_FOLDER);
      const folderId1 = collectionService.addFolder(ROOT_FOLDER);
      const folderId2 = collectionService.addFolder(folderId1);
      const folderId3 = collectionService.addFolder(folderId2);
      const docId = collectionService.addDocument(folderId3);
      const docId2 = collectionService.addDocument(folderIdO);
      const id = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      collectionService.setItemParent(id, docId2);
      const item = getCollectionItem(id);
      expect(item.parent).toBe(docId2);
      expect(item.created).toBeLessThan(item.updated);
      const meta = parseFieldMeta(item.parent_meta);
      expect(meta.u).toBe(item.updated);

      const folderO = getCollectionItem(folderIdO);
      const folder1 = getCollectionItem(folderId1);
      const folder2 = getCollectionItem(folderId2);
      const folder3 = getCollectionItem(folderId3);

      // TODO: could also want to update old doc parents...
      expect(folderO.updated).toBe(now + 100);
      expect(parseFieldMeta(folderO.parent_meta).u).toBe(now);
      expect(folder1.updated).toBe(now);
      expect(parseFieldMeta(folder1.parent_meta).u).toBe(now);
      expect(folder2.updated).toBe(now);
      expect(parseFieldMeta(folder2.parent_meta).u).toBe(now);
      expect(folder3.updated).toBe(now);
      expect(parseFieldMeta(folder3.parent_meta).u).toBe(now);
    });

    it(`should update the content of a page`, () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      const id = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      collectionService.setItemLexicalContent(id, shortContent);
      const item = getCollectionItem(id);
      expect(item.content).toBe(minimizeContentForStorage(shortContent));
      expect(item.created).toBeLessThan(item.updated);
      const meta = parseFieldMeta(item.content_meta!);
      expect(meta.u).toBe(item.updated);
    });

    it(`should update the content of a page and update all parents timestamp too`, () => {
      const now = Date.now();
      const folderId1 = collectionService.addFolder(ROOT_FOLDER);
      const folderId2 = collectionService.addFolder(folderId1);
      const folderId3 = collectionService.addFolder(folderId2);
      const docId = collectionService.addDocument(folderId3);
      const id = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      collectionService.setItemLexicalContent(id, shortContent);
      const item = getCollectionItem(id);
      expect(item.content).toBe(minimizeContentForStorage(shortContent));
      expect(item.created).toBeLessThan(item.updated);
      const meta = parseFieldMeta(item.content_meta!);
      expect(meta.u).toBe(item.updated);

      const folder1 = getCollectionItem(folderId1);
      const folder2 = getCollectionItem(folderId2);
      const folder3 = getCollectionItem(folderId3);

      expect(folder1.updated).toBe(now + 100);
      expect(folder2.updated).toBe(now + 100);
      expect(folder3.updated).toBe(now + 100);
    });

    it(`should update the preview of a page at the same time as its content`, () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      const id = collectionService.addPage(docId);
      expect(getCollectionItem(id).preview).toBe('');

      collectionService.setItemLexicalContent(id, shortContent);
      expect(getCollectionItem(id).preview).toBe('This is a short content');

      collectionService.setItemLexicalContent(id, loremIpsum);
      expect(getCollectionItem(id).preview).toBe(
        '"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor '
      );
    });

    it(`should delete an existing page`, () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      const id = collectionService.addPage(docId);
      const id2 = collectionService.addPage(docId);

      vi.advanceTimersByTime(100);
      collectionService.deleteItem(id!);

      expect(collectionService.itemExists(docId)).toBe(true);
      expect(collectionService.itemExists(id)).toBe(false);

      const { result } = renderHook(() =>
        collectionService.useDocumentPages(docId)
      );
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe(id2);
    });

    it(`should delete an existing page and recursively update all parents timestamp`, () => {
      const now = Date.now();
      const folderId1 = collectionService.addFolder(ROOT_FOLDER);
      const folderId2 = collectionService.addFolder(folderId1);
      const folderId3 = collectionService.addFolder(folderId2);
      const docId = collectionService.addDocument(folderId3);
      const id = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      collectionService.deleteItem(id);
      expect(collectionService.itemExists(id)).toBe(false);

      const folder1 = getCollectionItem(folderId1);
      const folder2 = getCollectionItem(folderId2);
      const folder3 = getCollectionItem(folderId3);

      expect(folder1.updated).toBe(now + 100);
      expect(folder2.updated).toBe(now + 100);
      expect(folder3.updated).toBe(now + 100);
    });
  });
});
