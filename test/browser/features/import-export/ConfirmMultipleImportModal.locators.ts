import { expect } from 'vitest';
import { RenderResult } from 'vitest-browser-react';

export function getModalTitle(screen: RenderResult) {
  return screen.locator.getByTestId('modal-title');
}

const expectTestId = (screen: RenderResult, testId: string, yes: boolean) => {
  if (yes) {
    expect(screen.locator.getByTestId(testId)).toBeInTheDocument();
  } else {
    expect(screen.locator.getByTestId(testId)).not.toBeInTheDocument();
  }
};
export const expectShowMetadataInfo = (screen: RenderResult, yes: boolean) => {
  expectTestId(screen, 'item-metadata-info', yes);
};
export const expectShowNotebooksWarning = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-notebooks-warning', yes);
};
export const expectShowEmptyZipWarning = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-archive-empty-warning', yes);
};
export const expectShowMalformedZipWarning = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-archive-malformed-warning', yes);
};
export const expectShowCreateNewFolderQuestion = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-question-create-new-folder', yes);
};
export const expectShowSingleFolderDetectedQuestion = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-question-single-folder-detected', yes);
};
export const expectShowMergeDuplicatesQuestion = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-question-merge-duplicates', yes);
};
export const expectShowNewFolderNameInput = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-new-folder-name-input', yes);
};
export const expectShowNewNotebookNameInput = (
  screen: RenderResult,
  yes: boolean
) => {
  expectTestId(screen, 'item-new-notebook-name-input', yes);
};
