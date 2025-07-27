import ConfirmMultipleImportModal, {
  ConfirmMultipleImportModalParams
} from '@/common/modals/ConfirmMultipleImportModal';
import {
  importService,
  ZipImportOptions,
  ZipMergeResult
} from '@/common/services/import.service';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { TestingProvider } from '@/vitest/setup/test.react.utils';
import { render } from '@testing-library/react';
import { readFile } from 'fs/promises';
import { describe, expect, it } from 'vitest';

const readZip = async (
  parentDir: string,
  zipName: string,
  opts?: ZipImportOptions,
  parent = DEFAULT_NOTEBOOK_ID
) => {
  const zip = await readFile(`${__dirname}/${parentDir}/${zipName}`);
  const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
  const unzipped = await importService.readZip(zipBuffer);
  return importService.parseZipData(zipName, unzipped, opts);
};

describe('ConfirmMultipleImportModal', () => {
  it('should render the modal with createNotebook=false', async () => {
    const zipData = await readZip('../zips_without_meta', 'Simple.zip', {});

    const params: ConfirmMultipleImportModalParams = { zipData };
    const onClose = (confirm: boolean, zipMerge?: ZipMergeResult) => {
      console.log('confirm', confirm, 'zipMerge', zipMerge);
    };

    const { queryByTestId, getByText } = render(
      <ConfirmMultipleImportModal
        parent={DEFAULT_NOTEBOOK_ID}
        params={params}
        onClose={onClose}
      />,
      { wrapper: TestingProvider }
    );

    // check questions
    expect(queryByTestId('modal-title')).toBeInTheDocument();
    expect(queryByTestId('modal-title')).toHaveTextContent(
      'Import zip content in folder'
    );
    expect(queryByTestId('item-metadata-info')).not.toBeInTheDocument();
    expect(
      queryByTestId('item-metadata-warning-folder-at-root')
    ).not.toBeInTheDocument();
    expect(
      queryByTestId('item-question-create-new-folder')
    ).toBeInTheDocument();
    expect(
      queryByTestId('item-question-single-folder-detected')
    ).not.toBeInTheDocument();
    expect(
      queryByTestId('item-question-merge-duplicates')
    ).not.toBeInTheDocument();

    // TODO check items shown
    // TODO check that (new) must be in the same row
    expect(getByText('Simple')).toBeInTheDocument();
  });
});
