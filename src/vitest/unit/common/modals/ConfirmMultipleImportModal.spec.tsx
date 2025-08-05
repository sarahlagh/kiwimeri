import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import ConfirmMultipleImportModal, {
  ConfirmMultipleImportModalParams
} from '@/common/modals/ConfirmMultipleImportModal';
import {
  importService,
  ZipImportOptions,
  ZipMergeResult
} from '@/common/services/import.service';
import { ARIA_DESCRIPTIONS_PER_TYPE, DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import { TestingProvider } from '@/vitest/setup/test.react.utils';
import { render } from '@testing-library/react';
import { readFile } from 'fs/promises';
import { describe, expect, it } from 'vitest';

const readZip = async (
  parentDir: string,
  zipName: string,
  opts?: ZipImportOptions
) => {
  const zip = await readFile(`${__dirname}/${parentDir}/${zipName}`);
  const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
  const unzipped = await importService.readZip(zipBuffer);
  return importService.parseZipData(zipName, unzipped, opts);
};

describe('ConfirmMultipleImportModal', () => {
  const renderModal = (params: ConfirmMultipleImportModalParams) => {
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
    expect(node.firstChild).toHaveTextContent(new RegExp(`${title}$`));
    if (status) {
      expect(node.lastChild).toHaveTextContent(status);
    } else {
      expect(node.lastChild).toBe(node.firstChild);
    }
  };
  const expectTestId = (testId: string, yes: boolean, queryByTestId: any) => {
    if (yes) {
      expect(queryByTestId(testId)).toBeInTheDocument();
    } else {
      expect(queryByTestId(testId)).not.toBeInTheDocument();
    }
  };
  const expectShowMetadataInfo = (yes: boolean, queryByTestId: any) => {
    expectTestId('item-metadata-info', yes, queryByTestId);
  };
  const expectShowEmptyZipWarning = (yes: boolean, queryByTestId: any) => {
    expectTestId('item-archive-empty-warning', yes, queryByTestId);
  };
  const expectShowMalformedZipWarning = (yes: boolean, queryByTestId: any) => {
    expectTestId('item-archive-malformed-warning', yes, queryByTestId);
  };
  const expectShowCreateNewFolderQuestion = (
    yes: boolean,
    queryByTestId: any
  ) => {
    expectTestId('item-question-create-new-folder', yes, queryByTestId);
  };
  const expectShowSingleFolderDetectedQuestion = (
    yes: boolean,
    queryByTestId: any
  ) => {
    expectTestId('item-question-single-folder-detected', yes, queryByTestId);
  };
  const expectShowMergeDuplicatesQuestion = (
    yes: boolean,
    queryByTestId: any
  ) => {
    expectTestId('item-question-merge-duplicates', yes, queryByTestId);
  };
  const expectShowNewFolderNameInput = (yes: boolean, queryByTestId: any) => {
    expectTestId('item-new-folder-name-input', yes, queryByTestId);
  };
  const expectShowNewNotebookNameInput = (yes: boolean, queryByTestId: any) => {
    expectTestId('item-new-notebook-name-input', yes, queryByTestId);
  };

  describe('without duplicates', () => {
    it('should render the modal for a simple zip without meta, with createNotebook=false', async () => {
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'Simple.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(true, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'Simple.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'Simple.zip',
        {}
      );
      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(true, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'Simple.zip',
        {}
      );
      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId, getByDisplayValue } =
        renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'SimpleLayer.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(true, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'SimpleLayer.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'SimpleLayer.zip',
        {}
      );
      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(true, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'SimpleLayer.zip',
        {}
      );
      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip('../_data/zips_with_meta', 'Empty.zip', {});

      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Empty.zip in folder'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowEmptyZipWarning(true, queryByTestId);
      expectShowMalformedZipWarning(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(false);
    });

    it('should render the modal for an empty zip, with createNotebook=true', async () => {
      const zipData = await readZip('../_data/zips_with_meta', 'Empty.zip', {});

      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Empty.zip in a new Notebook'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowEmptyZipWarning(true, queryByTestId);
      expectShowMalformedZipWarning(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(false);
    });

    it('should render the modal for a malformed zip, with createNotebook=false', async () => {
      const zipData = await readZip(
        '../_data/malformed',
        'SpaceMalformed.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SpaceMalformed.zip in folder'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowEmptyZipWarning(false, queryByTestId);
      expectShowMalformedZipWarning(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);

      expect(rows?.childNodes).toHaveLength(7);
      const expectedRows = [
        { first: 'Incorrect Metadata', last: 'SimpleNotebook1/Sub/meta.json' },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandMissingType/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandNested/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandSub/Other/'
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
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/PinMeta/meta.json'
        }
      ];
      rows?.childNodes.forEach((node, idx) => {
        const row = expectedRows[idx];
        expect(node.hasChildNodes()).toBe(true);
        expect(node.firstChild).toHaveTextContent(row.first);
        expect(node.lastChild).toHaveTextContent(row.last);
      });
    });

    it('should render the modal for a malformed zip, with createNotebook=true', async () => {
      const zipData = await readZip(
        '../_data/malformed',
        'SpaceMalformed.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SpaceMalformed.zip in a new Notebook'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowEmptyZipWarning(false, queryByTestId);
      expectShowMalformedZipWarning(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(false, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
      expect(rows?.hasChildNodes()).toBe(true);

      expect(rows?.childNodes).toHaveLength(7);
      const expectedRows = [
        { first: 'Incorrect Metadata', last: 'SimpleNotebook1/Sub/meta.json' },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandMissingType/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandNested/meta.json'
        },
        {
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/DandSub/Other/'
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
          first: 'Incorrect Metadata',
          last: 'SimpleNotebook2/PinMeta/meta.json'
        }
      ];
      rows?.childNodes.forEach((node, idx) => {
        const row = expectedRows[idx];
        expect(node.hasChildNodes()).toBe(true);
        expect(node.firstChild).toHaveTextContent(row.first);
        expect(node.lastChild).toHaveTextContent(row.last);
      });
    });
  });

  describe('with duplicates', () => {
    let dId: string;
    let fId: string;
    let nId: string;
    beforeEach(() => {
      storageService.getSpace().transaction(() => {
        dId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        nId = notebooksService.addNotebook('Simple');
        collectionService.setItemTitle(dId, 'Simple');
        collectionService.setItemTitle(fId, 'Simple');
      });
    });

    it('should render the modal for a simple zip without meta, with createNotebook=false', async () => {
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'Simple.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(true, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'Simple.zip',
        {}
      );

      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'Simple.zip',
        {}
      );

      collectionService.setItemTitle(dId, 'Simple Original');

      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in folder'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(true, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'Simple.zip',
        {}
      );
      collectionService.setItemTitle(nId, 'New folder');
      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import Simple.zip in a new Notebook'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'SimpleLayer.zip',
        {}
      );
      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(true, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_without_meta',
        'SimpleLayer.zip',
        {}
      );
      collectionService.setItemTitle(nId, 'SimpleLayer');
      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(false, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'SimpleLayer.zip',
        {}
      );
      collectionService.setItemTitle(fId, 'Simple Original');
      const params: ConfirmMultipleImportModalParams = { zipData };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in folder'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(true, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(false, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
      const zipData = await readZip(
        '../_data/zips_with_meta',
        'SimpleLayer.zip',
        {}
      );
      collectionService.setItemTitle(nId, 'New folder');
      const params: ConfirmMultipleImportModalParams = {
        zipData,
        createNotebook: true
      };
      const { container, queryByTestId } = renderModal(params);

      // check questions
      expect(queryByTestId('modal-title')).toBeInTheDocument();
      expect(queryByTestId('modal-title')).toHaveTextContent(
        'Import SimpleLayer.zip in a new Notebook'
      );

      expectShowMetadataInfo(true, queryByTestId);
      expectShowCreateNewFolderQuestion(false, queryByTestId);
      expectShowSingleFolderDetectedQuestion(false, queryByTestId);
      expectShowNewFolderNameInput(false, queryByTestId);
      expectShowNewNotebookNameInput(true, queryByTestId);
      expectShowMergeDuplicatesQuestion(true, queryByTestId);

      // check that Simple and (new) must be in the same row
      const rows = container.querySelector('#preview-list');
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
