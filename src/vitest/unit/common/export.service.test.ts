import { CollectionItemType } from '@/collection/collection';
import {
  exportService,
  ZipExportOptions,
  ZipFileTree,
  ZipMetadata
} from '@/common/services/export.service';
import { getGlobalTrans } from '@/config';
import { META_JSON, ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import formatterService from '@/format-conversion/formatter.service';
import { strFromU8 } from 'fflate';
import { it, vi } from 'vitest';

describe('export service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const newDoc = (
    parent: string,
    content: string,
    pages?: string[],
    notebook?: string
  ) => {
    const id = collectionService.addDocument(parent, notebook);
    collectionService.setItemLexicalContent(
      id,
      formatterService.getLexicalFromMarkdown(content)
    );
    if (pages) {
      pages.forEach(page => {
        const pId = collectionService.addPage(id, notebook);
        collectionService.setItemLexicalContent(
          pId,
          formatterService.getLexicalFromMarkdown(page)
        );
      });
    }
    return id;
  };

  const includeMetadatas = [true, false];
  includeMetadatas.forEach(includeMetadata => {
    const opts: ZipExportOptions[] = [];
    opts.push({
      includeMetadata,
      inlinePages: true
    });
    opts.push({
      includeMetadata,
      inlinePages: false
    });

    describe(`with includeMetadata=${includeMetadata}`, () => {
      opts.forEach(opts => {
        const checkMetadata = (
          zipContent: ZipFileTree,
          metaType:
            | CollectionItemType.folder
            | CollectionItemType.notebook = CollectionItemType.folder,
          shouldBeDefined = true,
          tags = ''
        ) => {
          if (opts.includeMetadata && !shouldBeDefined) {
            expect(zipContent[META_JSON]).not.toBeDefined();
          }
          if (opts.includeMetadata && shouldBeDefined) {
            expect(zipContent[META_JSON]).toBeDefined();
            const meta = JSON.parse(
              strFromU8(zipContent[META_JSON][0])
            ) as ZipMetadata;
            expect(meta.type).toBe(metaType);
            expect(meta.format).toBe('markdown');
            expect(meta.title).toBeDefined();
            if (metaType === CollectionItemType.notebook) {
              expect(meta.title).not.toBe(getGlobalTrans().homeTitle);
              expect(meta.title).not.toBe('');
            }
            if (metaType === CollectionItemType.folder) {
              expect(meta.updated).toBe(Date.now());
              expect(meta.created).toBe(Date.now());
              expect(meta.tags).toBeDefined();
            }

            console.debug('meta', meta);
            console.debug('zipContent', zipContent);

            const filesInZip = Object.keys(zipContent).filter(
              key => key !== META_JSON && Array.isArray(zipContent[key])
            );
            if (filesInZip.length > 0) {
              expect(meta.files).toBeDefined();
            }
            expect(Object.keys(meta.files || [])).toHaveLength(
              filesInZip.length
            );
            filesInZip.forEach(fileInZip => {
              const metaFile = meta.files![fileInZip];
              expect(metaFile).toBeDefined();
              expect(metaFile.created).toBe(Date.now());
              expect(metaFile.updated).toBe(Date.now());
              expect(metaFile.type).toBe(CollectionItemType.document);
              expect(metaFile.title).toBe('New document');
              expect(metaFile.tags).toBe(tags);
            });
          }
        };

        if (opts.inlinePages) {
          it('should export a single document with no pages as a single file if inlinePages=true', () => {
            const id = newDoc(ROOT_FOLDER, 'this is the document content');

            const content = exportService.getSingleDocumentContent(id, opts);
            expect(content).toBe('this is the document content\n\n');
          });

          it('should export a single document with pages as a single file if inlinePages=true', () => {
            const id = newDoc(ROOT_FOLDER, 'this is the document content', [
              'this is the page content'
            ]);

            const content = exportService.getSingleDocumentContent(id, opts);
            expect(content).toBe(
              'this is the document content\n\n' +
                formatterService.getPagesSeparator() +
                'this is the page content\n\n'
            );
          });

          it('should export a folder with pages as a zip if inlinePages=true', () => {
            const fId = collectionService.addFolder(ROOT_FOLDER);
            newDoc(fId, 'this is the document content', [
              'this is the page content'
            ]);

            const zipContent = exportService.getFolderContent(fId, opts);
            expect(zipContent['New document.md']).toBeDefined();
            expect(strFromU8(zipContent['New document.md'][0])).toBe(
              'this is the document content\n\n' +
                formatterService.getPagesSeparator() +
                'this is the page content\n\n'
            );

            checkMetadata(zipContent);
          });
        } else {
          it.todo(
            'should export a single document with no pages as a single file if inlinePages=false',
            () => {
              //
            }
          );

          it.todo(
            'should export a single document with pages as a zip if inlinePages=false',
            () => {
              //
            }
          );

          it.todo(
            'should export a folder with pages as a zip if inlinePages=false',
            () => {
              const fId = collectionService.addFolder(ROOT_FOLDER);
              newDoc(fId, 'this is the document content', [
                'this is the page content'
              ]);

              // TODO
            }
          );
        }

        it(`should export an empty folder as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
          const zipContent = exportService.getFolderContent(fId, opts);
          expect(
            Object.keys(zipContent).filter(k => k !== META_JSON)
          ).toHaveLength(0);
          checkMetadata(zipContent);
        });

        it(`should export a folder with tags as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
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
            CollectionItemType.folder,
            true,
            'tag1,tag2'
          );
        });

        it(`should export a folder with several levels as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
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
          expect(
            strFromU8(zipContent['New folder']['New document.md'][0])
          ).toBe('this is the document content\n\n');

          checkMetadata(zipContent);
          checkMetadata(zipContent['New folder']);
        });

        it(`should export a folder with several levels with folders and docs as first level as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
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

          checkMetadata(zipContent);
          checkMetadata(zipContent['New folder'], CollectionItemType.folder);
          checkMetadata(zipContent['New folder']['New folder']);
        });

        it(`should export a folder with several levels with folders as first level as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
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

          checkMetadata(zipContent, CollectionItemType.folder);
          checkMetadata(zipContent['New folder'], CollectionItemType.folder);
          checkMetadata(zipContent['New folder']['New folder']);
        });

        it(`should export a folder as a zip with duplicates inside with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
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

          checkMetadata(zipContent);
        });

        it(`should export a notebook as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
          newDoc(fId, 'this is the document content');

          const zipContent = exportService.getFolderContent(ROOT_FOLDER, opts);
          expect(zipContent['New folder']).toBeDefined();
          expect(zipContent['New folder']['New document.md']).toBeDefined();
          expect(
            strFromU8(zipContent['New folder']['New document.md'][0])
          ).toBe('this is the document content\n\n');

          checkMetadata(zipContent, CollectionItemType.notebook);
          checkMetadata(zipContent['New folder']);
        });

        it(`should export a notebook with folders as first level as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
          const fId2 = collectionService.addFolder(fId);
          newDoc(fId2, 'this is the document content');

          const zipContent = exportService.getFolderContent(ROOT_FOLDER, opts);
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
          checkMetadata(zipContent, CollectionItemType.notebook);
          checkMetadata(zipContent['New folder'], CollectionItemType.folder);
          checkMetadata(zipContent['New folder']['New folder']);
        });

        it(`should export a notebook with folders and docs as first level as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
          newDoc(fId, 'this is the document content');
          const fId2 = collectionService.addFolder(fId);
          newDoc(fId2, 'this is the document content');

          const zipContent = exportService.getFolderContent(ROOT_FOLDER, opts);
          expect(zipContent['New folder']).toBeDefined();
          expect(zipContent['New folder']['New document.md']).toBeDefined();
          expect(
            strFromU8(zipContent['New folder']['New document.md'][0])
          ).toBe('this is the document content\n\n');

          expect(zipContent['New folder']['New folder']).toBeDefined();
          expect(
            zipContent['New folder']['New folder']['New document.md']
          ).toBeDefined();
          expect(
            strFromU8(
              zipContent['New folder']['New folder']['New document.md'][0]
            )
          ).toBe('this is the document content\n\n');

          checkMetadata(zipContent, CollectionItemType.notebook);
          checkMetadata(zipContent['New folder'], CollectionItemType.folder);
          checkMetadata(
            zipContent['New folder']['New folder'],
            CollectionItemType.folder
          );
        });

        it(`should export the space as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId0 = collectionService.addFolder(ROOT_FOLDER);
          newDoc(fId0, 'this is the document content');
          const nId1 = notebooksService.addNotebook('New notebook');
          newDoc(ROOT_FOLDER, 'this is the document content', [], nId1);

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

          checkMetadata(zipContent, CollectionItemType.notebook, false);
          checkMetadata(zipContent['Default'], CollectionItemType.notebook);
          checkMetadata(
            zipContent['New notebook'],
            CollectionItemType.notebook
          );
          checkMetadata(zipContent['Default']['New folder']);
        });
      });
    });
  });
});
