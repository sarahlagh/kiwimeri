import { CollectionItemType } from '@/collection/collection';
import {
  exportService,
  ZipExportOptions,
  ZipFileTree,
  ZipMetadata
} from '@/common/services/export.service';
import { DEFAULT_NOTEBOOK_ID, getGlobalTrans, META_JSON } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import formatConverter from '@/format-conversion/format-converter.service';
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
        tags = ''
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
            expect(meta.updated).toBe(Date.now());
            expect(meta.created).toBe(Date.now());
            expect(meta.tags).toBeDefined();
          }

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
              expect(metaFile.created).toBe(Date.now());
              expect(metaFile.updated).toBe(Date.now());
              expect(metaFile.type).toBe(CollectionItemType.document);
              expect(metaFile.title).toBe('New document');
              expect(metaFile.tags).toBe(tags);
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
            expect(docMeta.created).toBe(Date.now());
            expect(docMeta.updated).toBe(Date.now());
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
        checkMetadata(
          zipContent,
          true,
          CollectionItemType.folder,
          true,
          'tag1,tag2'
        );
      });

      it(`should export a folder with several levels as a zip`, () => {
        const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        collectionService.setItemDisplayOpts(fId, {
          sort: { by: 'updated', descending: true },
          statsEnabled: false
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

        // check for display opts
        if (includeMetadata) {
          expect(meta).toBeDefined();
          expect(meta!.display_opts).toBeDefined();
          expect(meta!.display_opts!.sort).toBeDefined();
          expect(meta!.display_opts!.sort.by).toBe('updated');
          expect(meta!.display_opts!.sort.descending).toBe(true);
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
});
