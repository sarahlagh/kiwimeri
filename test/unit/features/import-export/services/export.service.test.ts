import { DEFAULT_NOTEBOOK_ID, getGlobalTrans, META_JSON } from '@/constants';
import { CollectionItemType } from '@/domain/collection/collection';
import { settingsService } from '@/domain/collection/collection-settings.service';
import collectionService from '@/domain/collection/collection.service';
import { docAnnotationsService } from '@/domain/collection/doc-annotations.service';
import notebooksService from '@/domain/collection/notebooks.service';
import {
  ZipExportOptions,
  ZipFileTree,
  ZipMetadata
} from '@/features/import-export/model/model-export';
import exportService from '@/features/import-export/services/export.service';

import formatConverter from '@/domain/format-conversion/format-converter.service';
import { strFromU8 } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('export service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const newDoc = (parent: string, content: string) => {
    const id = collectionService.addDocument(parent);
    collectionService.setItemLexicalContent(
      id,
      formatConverter.fromMarkdown(content).obj!
    );
    return id;
  };

  const includeMetadatas = [true, false];
  includeMetadatas.forEach(includeMetadata => {
    describe(`with includeMetadata=${includeMetadata}`, () => {
      const opts: ZipExportOptions = { includeMetadata };
      const checkMetadata = (
        zipContent: ZipFileTree,
        isRoot: boolean,
        metaType: CollectionItemType = CollectionItemType.folder,
        shouldBeDefined = true,
        tags?: string[]
      ) => {
        if (!opts.includeMetadata || !shouldBeDefined) {
          expect(zipContent[META_JSON]).not.toBeDefined();
        }
        if (opts.includeMetadata && shouldBeDefined) {
          expect(zipContent[META_JSON]).toBeDefined();
          const meta = JSON.parse(
            strFromU8(zipContent[META_JSON][0])
          ) as ZipMetadata;
          if (!isRoot) {
            expect(meta.type).toBe(metaType);
          } else {
            expect(meta.type).toBeUndefined();
          }
          if (metaType !== CollectionItemType.document) {
            expect(meta.format).toBe('markdown');
            expect(meta.title).toBeDefined();
          }
          if (metaType === CollectionItemType.notebook) {
            expect(meta.title).not.toBe(getGlobalTrans().homeTitle);
            expect(meta.title).not.toBe('');
          }
          if (metaType === CollectionItemType.folder) {
            expect(meta.updatedAt).toBe(Date.now());
            expect(meta.createdAt).toBe(Date.now());
          }
          expect(meta.tags).toBeUndefined();

          const filesInZip = Object.keys(zipContent).filter(
            key => key !== META_JSON && Array.isArray(zipContent[key])
          );
          if (filesInZip.length > 0) {
            expect(meta.files).toBeDefined();
          }
          expect(Object.keys(meta.files || [])).toHaveLength(filesInZip.length);
          if (metaType !== CollectionItemType.document) {
            filesInZip.forEach(fileInZip => {
              const metaFile = meta.files![fileInZip];
              expect(metaFile).toBeDefined();
              expect(metaFile.createdAt).toBe(Date.now());
              expect(metaFile.updatedAt).toBe(Date.now());
              expect(metaFile.type).toBe(CollectionItemType.document);
              expect(metaFile.title).toBe('New document');
              expect(metaFile.tags).toEqual(tags);
            });
          } else {
            const docs = filesInZip.filter(
              f => meta.files![f].type === CollectionItemType.document
            );
            expect(docs.length).toBe(filesInZip.length);
            // expect(docs.length).toBe(1);

            const docMeta = meta.files![docs[0]];
            expect(docMeta);
            expect(docMeta).toBeDefined();
            expect(docMeta.createdAt).toBe(Date.now());
            expect(docMeta.updatedAt).toBe(Date.now());
            expect(docMeta.type).toBe(CollectionItemType.document);
            expect(docMeta.title).toBe('New document');
            expect(docMeta.tags).toBe(tags);
          }
          return meta;
        }
      };

      it('should export a single document as a single file', () => {
        const id = newDoc(DEFAULT_NOTEBOOK_ID, 'this is the document content');

        const content = exportService.getSingleDocumentContent(id, opts);
        expect(content).toBe('this is the document content\n\n');
      });

      it('should export a folder and a document as a zip', () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        newDoc(fId, 'this is the document content');

        const zipContent = exportService.getFolderContent(fId, opts);

        expect(zipContent['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );

        checkMetadata(zipContent, true, CollectionItemType.folder);
      });

      it(`should export an empty folder as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        const zipContent = exportService.getFolderContent(fId, opts);
        expect(
          Object.keys(zipContent).filter(k => k !== META_JSON)
        ).toHaveLength(0);
        checkMetadata(zipContent, true);
      });

      it(`should export a folder with tags as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        const dId = newDoc(fId, 'this is the document content');
        collectionService.addItemTag(dId, 'tag1');
        collectionService.addItemTag(dId, 'tag2');

        const zipContent = exportService.getFolderContent(fId, opts);
        expect(zipContent['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );
        checkMetadata(zipContent, true, CollectionItemType.folder, true, [
          'tag1',
          'tag2'
        ]);
      });

      it(`should export a folder with several levels as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        settingsService.setFolderSettings(fId, {
          sort: { by: 'updatedAt', descending: true }
        });
        newDoc(fId, 'this is the document content');
        const fId2 = collectionService.addFolder(fId);
        newDoc(fId2, 'this is the document content');

        const zipContent = exportService.getFolderContent(fId, opts);
        expect(zipContent['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );
        expect(zipContent['New folder']).toBeDefined();
        expect(zipContent['New folder']['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New folder']['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );

        const meta = checkMetadata(zipContent, true);
        checkMetadata(zipContent['New folder'], false);

        // check for settings
        if (includeMetadata) {
          expect(meta).toBeDefined();
          expect(meta!.settings).toBeDefined();
          expect(meta!.settings!.sort).toBeDefined();
          expect(meta!.settings!.sort!.by).toBe('updatedAt');
          expect(meta!.settings!.sort!.descending).toBe(true);
        }
      });

      it(`should export a folder with several levels with folders and docs as first level as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        newDoc(fId, 'this is the document content');
        const fId2 = collectionService.addFolder(fId);
        const fId3 = collectionService.addFolder(fId2);
        newDoc(fId3, 'this is the document content');

        const zipContent = exportService.getFolderContent(fId, opts);
        expect(zipContent['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );
        expect(zipContent['New folder']).toBeDefined();
        expect(zipContent['New folder']['New folder']).toBeDefined();
        expect(
          zipContent['New folder']['New folder']['New document.md']
        ).toBeDefined();
        expect(
          strFromU8(
            zipContent['New folder']['New folder']['New document.md'][0]
          )
        ).toBe('this is the document content\n\n');

        checkMetadata(zipContent, true);
        checkMetadata(
          zipContent['New folder'],
          false,
          CollectionItemType.folder
        );
        checkMetadata(zipContent['New folder']['New folder'], false);
      });

      it(`should export a folder with several levels with folders as first level as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        const fId2 = collectionService.addFolder(fId);
        const fId3 = collectionService.addFolder(fId2);
        newDoc(fId3, 'this is the document content');

        const zipContent = exportService.getFolderContent(fId, opts);
        expect(zipContent['New folder']).toBeDefined();
        expect(zipContent['New folder']['New folder']).toBeDefined();
        expect(
          zipContent['New folder']['New folder']['New document.md']
        ).toBeDefined();
        expect(
          strFromU8(
            zipContent['New folder']['New folder']['New document.md'][0]
          )
        ).toBe('this is the document content\n\n');

        checkMetadata(zipContent, true, CollectionItemType.folder);
        checkMetadata(
          zipContent['New folder'],
          false,
          CollectionItemType.folder
        );
        checkMetadata(zipContent['New folder']['New folder'], false);
      });

      it(`should export a folder as a zip with duplicates inside`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        newDoc(fId, 'this is the document content');
        newDoc(fId, 'this is the document content');
        newDoc(fId, 'this is the document content');

        const zipContent = exportService.getFolderContent(fId, opts);
        expect(zipContent['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );

        expect(zipContent['New document (1).md']).toBeDefined();
        expect(strFromU8(zipContent['New document (1).md'][0])).toBe(
          'this is the document content\n\n'
        );

        expect(zipContent['New document (2).md']).toBeDefined();
        expect(strFromU8(zipContent['New document (2).md'][0])).toBe(
          'this is the document content\n\n'
        );

        checkMetadata(zipContent, true);
      });

      it(`should export a notebook as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        newDoc(fId, 'this is the document content');

        const zipContent = exportService.getFolderContent(
          DEFAULT_NOTEBOOK_ID,
          opts
        );
        expect(zipContent['New folder']).toBeDefined();
        expect(zipContent['New folder']['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New folder']['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );

        checkMetadata(zipContent, true, CollectionItemType.notebook);
        checkMetadata(zipContent['New folder'], false);
      });

      it(`should export a notebook with folders as first level as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        const fId2 = collectionService.addFolder(fId);
        newDoc(fId2, 'this is the document content');

        const zipContent = exportService.getFolderContent(
          DEFAULT_NOTEBOOK_ID,
          opts
        );
        expect(zipContent['New folder']).toBeDefined();
        expect(zipContent['New folder']['New folder']).toBeDefined();
        expect(
          zipContent['New folder']['New folder']['New document.md']
        ).toBeDefined();
        expect(
          strFromU8(
            zipContent['New folder']['New folder']['New document.md'][0]
          )
        ).toBe('this is the document content\n\n');

        // if first level doesn't have files (only folders), shouldn't include meta.json unless it's a notebook
        checkMetadata(zipContent, true, CollectionItemType.notebook);
        checkMetadata(
          zipContent['New folder'],
          false,
          CollectionItemType.folder
        );
        checkMetadata(zipContent['New folder']['New folder'], false);
      });

      it(`should export a notebook with folders and docs as first level as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        newDoc(fId, 'this is the document content');
        const fId2 = collectionService.addFolder(fId);
        newDoc(fId2, 'this is the document content');

        const zipContent = exportService.getFolderContent(
          DEFAULT_NOTEBOOK_ID,
          opts
        );
        expect(zipContent['New folder']).toBeDefined();
        expect(zipContent['New folder']['New document.md']).toBeDefined();
        expect(strFromU8(zipContent['New folder']['New document.md'][0])).toBe(
          'this is the document content\n\n'
        );

        expect(zipContent['New folder']['New folder']).toBeDefined();
        expect(
          zipContent['New folder']['New folder']['New document.md']
        ).toBeDefined();
        expect(
          strFromU8(
            zipContent['New folder']['New folder']['New document.md'][0]
          )
        ).toBe('this is the document content\n\n');

        checkMetadata(zipContent, true, CollectionItemType.notebook);
        checkMetadata(
          zipContent['New folder'],
          false,
          CollectionItemType.folder
        );
        checkMetadata(
          zipContent['New folder']['New folder'],
          false,
          CollectionItemType.folder
        );
      });

      it(`should export the space as a zip`, () => {
        const fId0 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        newDoc(fId0, 'this is the document content');
        const nId1 = notebooksService.addNotebook('New notebook');
        newDoc(nId1!, 'this is the document content');

        const zipContent = exportService.getSpaceContent(opts);

        expect(zipContent['Default']).toBeDefined();
        expect(zipContent['Default']['New folder']).toBeDefined();
        expect(
          zipContent['Default']['New folder']['New document.md']
        ).toBeDefined();

        expect(zipContent['New notebook']).toBeDefined();
        expect(zipContent['New notebook']['New document.md']).toBeDefined();
        expect(
          strFromU8(zipContent['New notebook']['New document.md'][0])
        ).toBe('this is the document content\n\n');

        checkMetadata(zipContent, true, CollectionItemType.notebook, false);
        checkMetadata(zipContent['Default'], true, CollectionItemType.notebook);
        checkMetadata(
          zipContent['New notebook'],
          true,
          CollectionItemType.notebook
        );
        checkMetadata(zipContent['Default']['New folder'], false);
      });
    });
  });

  describe('export settings', () => {
    it('should only export sort on folders / notebooks', () => {
      settingsService.setNotebookSettings(DEFAULT_NOTEBOOK_ID, {
        browserMode: 0,
        statsEnabled: true
      });
      const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemSettings(fId, {
        sort: { by: 'createdAt', descending: false },
        statsEnabled: true
      });
      const fTitle = collectionService.getItemTitle(fId);
      const dId = collectionService.addDocument(fId);
      const dTitle = collectionService.getItemTitle(dId);
      docAnnotationsService.addNote(dId);
      docAnnotationsService.setNotesSortOnDocument(dId, {
        by: 'order',
        descending: false
      });

      const zipContent = exportService.getFolderContent(DEFAULT_NOTEBOOK_ID, {
        includeMetadata: true
      });

      expect(zipContent[META_JSON]).toBeDefined();
      expect(zipContent[fTitle]).toBeDefined();
      expect(zipContent[fTitle][META_JSON]).toBeDefined();
      const notebookMeta = JSON.parse(
        strFromU8(zipContent[META_JSON][0])
      ) as ZipMetadata;
      const folderMeta = JSON.parse(
        strFromU8(zipContent[fTitle][META_JSON][0])
      ) as ZipMetadata;
      expect(notebookMeta.settings).toBeUndefined();
      expect(folderMeta.settings).toEqual({
        sort: { by: 'createdAt', descending: false }
      });
      expect(folderMeta.files).toBeDefined();
      expect(folderMeta.files![`${dTitle}.md`]).toBeDefined();
      expect(folderMeta.files![`${dTitle}.md`].settings).toBeUndefined();
    });
  });
});
