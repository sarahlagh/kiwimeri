import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import ConfirmMultipleImportModal, {
  ARIA_DESCRIPTIONS_PER_TYPE
} from '@/features/import-export/modals/ConfirmMultipleImportModal';

import {
  MultipleImportModalParams,
  ZipImportOptions,
  ZipMergeResult
} from '@/features/import-export/model/model-import';
import importService from '@/features/import-export/services/import.service';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { server } from 'vitest/browser';
import { TestingProvider } from '../../TestingProvider';
import {
  expectShowCreateNewFolderQuestion,
  expectShowEmptyZipWarning,
  expectShowMalformedZipWarning,
  expectShowMergeDuplicatesQuestion,
  expectShowMetadataInfo,
  expectShowNewFolderNameInput,
  expectShowNewNotebookNameInput,
  expectShowNotebooksWarning,
  expectShowSingleFolderDetectedQuestion,
  getModalTitle
} from './ConfirmMultipleImportModal.locators';

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length * 2);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

const readZip = async (
  parentDir: string,
  zipName: string,
  opts?: ZipImportOptions
) => {
  const zip = await server.commands.readFile(
    `test/unit/features/import-export/_data/${parentDir}/${zipName}`,
    { encoding: 'binary' }
  );
  const zipBuffer: ArrayBuffer = str2ab(zip);
  const unzipped = await importService.readZip(zipBuffer);
  return importService.parseZipData(zipName, unzipped, opts);
};

describe('ConfirmMultipleImportModal', () => {
  const renderModal = (params: any) => {
    const onClose = (confirm: boolean, zipMerge?: ZipMergeResult) => {};
    return render(
      <ConfirmMultipleImportModal
        parent={DEFAULT_NOTEBOOK_ID}
        params={params}
        onClose={onClose}
      />,
      { wrapper: TestingProvider }
    );
  };
  const checkRows = (
    rows: Element | null,
    rowsInfo: {
      itemType: CollectionItemTypeValues;
      title: string;
      status?: string;
    }[]
  ) => {
    rows?.childNodes.forEach((node, idx) => {
      checkRow(
        node,
        rowsInfo[idx].itemType,
        rowsInfo[idx].title,
        rowsInfo[idx].status
      );
    });
  };
  const checkRow = (
    node: ChildNode,
    itemType: CollectionItemTypeValues,
    title: string,
    status?: string
  ) => {
    expect(node.hasChildNodes()).toBe(true);
    const first = node.firstChild;
    expect((first as HTMLElement).outerHTML).toContain(
      `aria-description="${ARIA_DESCRIPTIONS_PER_TYPE.get(itemType)}"`
    );
    node.removeChild(first!);

    const el = node as HTMLElement;
    console.log('node=', el.outerHTML);
    // console.log('firstChild nodeName=', el?.nodeName);
    // console.log('firstChild outerHTML=', el?.outerHTML);
    // console.log('firstChild textContent=', el?.textContent);
    // console.log('shadow text=', el?.shadowRoot?.textContent);

    if (status) {
      expect(
        el.querySelector('ion-label[color="secondary"]')?.innerHTML
      ).toContain(title);
      expect(el.querySelector('ion-label[slot="end"]')?.innerHTML).toContain(
        status
      );
    } else {
      expect(el.querySelector('ion-label[color=""]')?.innerHTML).toContain(
        title
      );
      expect(node.lastChild).toBe(node.firstChild);
    }
  };

  describe('without duplicates', async () => {
    it('should render the modal for a simple zip without meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_without_meta', 'Simple.zip', {});

      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, true);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(1);

      checkRows(rows, [
        {
          itemType: CollectionItemType.document,
          title: 'Simple',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a simple zip without meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_without_meta', 'Simple.zip', {});

      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(2);

      checkRows(rows, [
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'Simple',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a simple zip with meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_with_meta', 'Simple.zip', {});
      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, true);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(1);

      checkRows(rows, [
        {
          itemType: CollectionItemType.document,
          title: 'Simple Original',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a simple zip with meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_with_meta', 'Simple.zip', {});
      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(2);

      checkRows(rows, [
        // new notebook had 'created' timestamp in past in its meta
        {
          itemType: CollectionItemType.notebook,
          title: 'New folder',
          status: '(new)'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        }
      ]);
    });

    it('should render the modal for a zip with single folder without meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_without_meta', 'SimpleLayer.zip', {});

      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, true);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(1);

      checkRows(rows, [
        {
          itemType: CollectionItemType.folder,
          title: 'Simple',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a zip with single folder without meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_without_meta', 'SimpleLayer.zip', {});

      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(2);

      checkRows(rows, [
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'SimpleLayer',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a zip with single folder with meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_with_meta', 'SimpleLayer.zip', {});
      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, true);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(1);

      checkRows(rows, [
        {
          itemType: CollectionItemType.folder,
          title: 'Simple Original',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a zip with single folder with meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_with_meta', 'SimpleLayer.zip', {});
      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(2);

      checkRows(rows, [
        // new notebook had 'created' timestamp in past in its meta
        {
          itemType: CollectionItemType.notebook,
          title: 'New folder',
          status: '(new)'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        }
      ]);
    });

    it('should render the modal for an empty zip, with createNotebook=false', async () => {
      const zipData = await readZip('zips_with_meta', 'Empty.zip', {});

      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Empty.zip in folder'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowEmptyZipWarning(screen, true);
      expectShowMalformedZipWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(false);
    });

    it('should render the modal for an empty zip, with createNotebook=true', async () => {
      const zipData = await readZip('zips_with_meta', 'Empty.zip', {});

      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Empty.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowEmptyZipWarning(screen, true);
      expectShowMalformedZipWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(false);
    });

    it('should render the modal for a malformed zip, with createNotebook=false', async () => {
      const zipData = await readZip('malformed', 'SpaceMalformed.zip', {});

      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SpaceMalformed.zip in folder'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, true);
      expectShowEmptyZipWarning(screen, false);
      expectShowMalformedZipWarning(screen, true);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);

      expect(rows?.childNodes).toHaveLength(9);
      const expectedRows = [
        { first: 'Incorrect Metadata', last: 'SimpleNotebook1/Sub/meta.json' },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandMissingType/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandNested/Other/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandNested/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandSub/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/IncorrectInFiles/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/OnlyPsInFiles/meta.json'
        },
        {
          first: 'Parsing Error',
          last: 'SimpleNotebook2/Quote.md'
        },
        {
          first: 'Parsing Error',
          last: 'SimpleNotebook2/PinMeta/meta.json'
        }
      ];
      rows?.childNodes.forEach((node, idx) => {
        const row = expectedRows[idx];
        const el = node as HTMLElement;
        let i = 0;
        el.querySelectorAll('ion-label').forEach(label => {
          if (i++ === 0) {
            expect(label.innerHTML).toContain(row.first);
          } else {
            expect(label.innerHTML).toContain(row.last);
          }
        });
      });
    });

    it('should render the modal for a malformed zip, with createNotebook=true', async () => {
      const zipData = await readZip('malformed', 'SpaceMalformed.zip', {});

      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SpaceMalformed.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, true);
      expectShowEmptyZipWarning(screen, false);
      expectShowMalformedZipWarning(screen, true);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, false);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);

      expect(rows?.childNodes).toHaveLength(9);
      const expectedRows = [
        { first: 'Incorrect Metadata', last: 'SimpleNotebook1/Sub/meta.json' },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandMissingType/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandNested/Other/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandNested/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandSub/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/IncorrectInFiles/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/OnlyPsInFiles/meta.json'
        },
        {
          first: 'Parsing Error',
          last: 'SimpleNotebook2/Quote.md'
        },
        {
          first: 'Parsing Error',
          last: 'SimpleNotebook2/PinMeta/meta.json'
        }
      ];

      rows?.childNodes.forEach((node, idx) => {
        const row = expectedRows[idx];
        const el = node as HTMLElement;
        let i = 0;
        el.querySelectorAll('ion-label').forEach(label => {
          if (i++ === 0) {
            expect(label.innerHTML).toContain(row.first);
          } else {
            expect(label.innerHTML).toContain(row.last);
          }
        });
      });
    });
  });

  describe('with duplicates', () => {
    let dId: string;
    let fId: string;
    let nId: string;
    beforeEach(() => {
      space.transaction(() => {
        dId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        nId = notebooksService.addNotebook('Simple');
        collectionService.setItemTitle(dId, 'Simple');
        collectionService.setItemTitle(fId, 'Simple');
      });
    });

    it('should render the modal for a simple zip without meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_without_meta', 'Simple.zip', {});

      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, true);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        {
          itemType: CollectionItemType.document,
          title: 'Simple'
        },
        {
          itemType: CollectionItemType.folder,
          title: 'Simple'
        },
        {
          itemType: CollectionItemType.document,
          title: 'Simple',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a simple zip without meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_without_meta', 'Simple.zip', {});

      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'Simple'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'Simple',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a simple zip with meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_with_meta', 'Simple.zip', {});

      collectionService.setItemTitle(dId, 'Simple Original');

      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, true);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        {
          itemType: CollectionItemType.document,
          title: 'Simple Original',
          status: '(new)'
        },
        {
          itemType: CollectionItemType.document,
          title: 'Simple Original'
        },
        {
          itemType: CollectionItemType.folder,
          title: 'Simple'
        }
      ]);
    });

    it('should render the modal for a simple zip with meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_with_meta', 'Simple.zip', {});
      collectionService.setItemTitle(nId, 'New folder');
      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        // new notebook had 'created' timestamp in past in its meta
        {
          itemType: CollectionItemType.notebook,
          title: 'New folder',
          status: '(new)'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'New folder'
        }
      ]);
    });

    it('should render the modal for a zip with single folder without meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_without_meta', 'SimpleLayer.zip', {});
      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, true);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        {
          itemType: CollectionItemType.document,
          title: 'Simple'
        },
        {
          itemType: CollectionItemType.folder,
          title: 'Simple'
        },
        {
          itemType: CollectionItemType.folder,
          title: 'Simple',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a zip with single folder without meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_without_meta', 'SimpleLayer.zip', {});
      collectionService.setItemTitle(nId, 'SimpleLayer');
      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, false);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'SimpleLayer'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'SimpleLayer',
          status: '(new)'
        }
      ]);
    });

    it('should render the modal for a zip with single folder with meta, with createNotebook=false', async () => {
      const zipData = await readZip('zips_with_meta', 'SimpleLayer.zip', {});
      collectionService.setItemTitle(fId, 'Simple Original');
      const params: MultipleImportModalParams = { zipData };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, true);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, false);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        {
          itemType: CollectionItemType.folder,
          title: 'Simple Original',
          status: '(new)'
        },
        {
          itemType: CollectionItemType.document,
          title: 'Simple'
        },
        {
          itemType: CollectionItemType.folder,
          title: 'Simple Original'
        }
      ]);
    });

    it('should render the modal for a zip with single folder with meta, with createNotebook=true', async () => {
      const zipData = await readZip('zips_with_meta', 'SimpleLayer.zip', {});
      collectionService.setItemTitle(nId, 'New folder');
      const params: MultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const screen = await renderModal(params);

      // check questions
      expect(getModalTitle(screen)).toBeInTheDocument();
      expect(getModalTitle(screen)).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(screen, true);
      expectShowNotebooksWarning(screen, false);
      expectShowCreateNewFolderQuestion(screen, false);
      expectShowSingleFolderDetectedQuestion(screen, false);
      expectShowNewFolderNameInput(screen, false);
      expectShowNewNotebookNameInput(screen, true);
      expectShowMergeDuplicatesQuestion(screen, true);

      // check that Simple and (new) must be in the same row
      const rows = document.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);
      expect(rows?.childElementCount).toBe(3);

      checkRows(rows, [
        // new notebook had 'created' timestamp in past in its meta
        {
          itemType: CollectionItemType.notebook,
          title: 'New folder',
          status: '(new)'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'Default'
        },
        {
          itemType: CollectionItemType.notebook,
          title: 'New folder'
        }
      ]);
    });
  });

  // TODO test the new name inputs
});
