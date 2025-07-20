import {
  exportService,
  ZipExportOptions,
  ZipFileTree
} from '@/common/services/export.service';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
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

  const newDoc = (parent: string, content: string, pages?: string[]) => {
    const id = collectionService.addDocument(parent);
    collectionService.setItemLexicalContent(
      id,
      formatterService.getLexicalFromMarkdown(content)
    );
    if (pages) {
      pages.forEach(page => {
        const pId = collectionService.addPage(id);
        collectionService.setItemLexicalContent(
          pId,
          formatterService.getLexicalFromMarkdown(page)
        );
      });
    }
    return id;
  };

  const includeMetadatas = [false];
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
        const checkMetadata = (zipContent: ZipFileTree) => {
          if (opts.includeMetadata) {
            expect(zipContent['meta.json']).toBeDefined();
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
          expect(zipContent).toEqual({});
          checkMetadata(zipContent);
        });

        it(`should export a folder as a zip with inlinePages=${opts.inlinePages}`, () => {
          const fId = collectionService.addFolder(ROOT_FOLDER);
          newDoc(fId, 'this is the document content');

          const zipContent = exportService.getFolderContent(fId, opts);
          expect(zipContent['New document.md']).toBeDefined();
          expect(strFromU8(zipContent['New document.md'][0])).toBe(
            'this is the document content\n\n'
          );
          checkMetadata(zipContent);
        });

        it(`should export several levels as a zip with inlinePages=${opts.inlinePages}`, () => {
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
        });

        // TODO if first level doesn't have files (only folders), shouldn't include meta.json
      });
    });
  });
});
