import { DOCUMENT_ROUTE } from '@/app/routes';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { store } from '@/core/db/store';
import collectionService from '@/domain/collection/collection.service';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { resumeService } from '@/domain/collection/resume-state.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { WritingSession } from '@/features/timed-writing';
import { dateToStr } from '@/shared/misc/date-utils';
import {
  expectLexicalStatesToBeEqual,
  fromSimpleHTML,
  getNewParsedContent
} from '@@/_setup/test.utils';
import { TestingProvider } from '@@/browser/TestingProvider';
import * as reactRouter from 'react-router';
import { NavigateOptions } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
import { getContentEditor } from '../rich-text-editor/RichTextEditor.locators';
import {
  getDiscardBtn,
  getIndicatorIcon,
  getListItemWithText,
  getMainList,
  getModalCloseBtn,
  getModalMergeBtn,
  getModalSaveBtn,
  getProgressBar,
  getSaveBtn,
  getSelectDurationRadio,
  getSelectSessionModeCheck,
  getStartWritingBtn,
  getWordCountLabel
} from './WritingSession.locators';

vi.mock('react-router', { spy: true });

const navigateToList: string[] = [];

const mockNavigateFunction: reactRouter.NavigateFunction = (
  to: reactRouter.To | number,
  options?: NavigateOptions
) => {
  if (typeof to === 'string') {
    navigateToList.push(to);
  }
};

vi.mocked(reactRouter.useNavigate).mockImplementation(
  () => mockNavigateFunction
);

/// test suite

describe('WritingSession', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date'
      ]
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    navigateToList.length = 0;
  });

  describe('StartPanel', () => {
    test('opens a WritingSession on the StartPanel', async () => {
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      expect(screen.baseElement).toBeDefined();
      await expect
        .element(screen.getByText('Choose a session length'))
        .toBeInTheDocument();
      await expect.element(getStartWritingBtn(screen)).toBeInTheDocument();
      const check = getSelectSessionModeCheck(screen);
      await expect.element(check).toBeInTheDocument();
      await expect.element(check).not.toBeChecked();
    });

    test('use the last selected mode in the StartPanel', async () => {
      deviceSettings.set('defaultTimedMode', 'less-dangerous');

      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });

      const modeCheck = getSelectSessionModeCheck(screen);
      await expect.element(modeCheck).toBeInTheDocument();
      await expect.element(modeCheck).toBeChecked();
    });

    test('use the last selected duration in the StartPanel', async () => {
      deviceSettings.set('defaultTimedDuration', 20);

      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });

      await expect
        .element(getSelectDurationRadio(screen, 5))
        .toBeInTheDocument();
      await expect.element(getSelectDurationRadio(screen, 5)).not.toBeChecked();
      await expect
        .element(getSelectDurationRadio(screen, 10))
        .toBeInTheDocument();
      await expect
        .element(getSelectDurationRadio(screen, 10))
        .not.toBeChecked();
      await expect
        .element(getSelectDurationRadio(screen, 15))
        .toBeInTheDocument();
      await expect
        .element(getSelectDurationRadio(screen, 15))
        .not.toBeChecked();
      await expect
        .element(getSelectDurationRadio(screen, 20))
        .toBeInTheDocument();
      await expect.element(getSelectDurationRadio(screen, 20)).toBeChecked();
      await expect
        .element(getSelectDurationRadio(screen, 25))
        .toBeInTheDocument();
      await expect
        .element(getSelectDurationRadio(screen, 25))
        .not.toBeChecked();
    });

    test('does not save new defaults until start of session', async () => {
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });

      const newDuration = getSelectDurationRadio(screen, 5);
      await expect.element(newDuration).toBeInTheDocument();
      await expect.element(newDuration).not.toBeChecked();
      await newDuration.click();
      await expect.element(newDuration).toBeChecked();

      const modeCheck = getSelectSessionModeCheck(screen);
      await expect.element(modeCheck).toBeInTheDocument();
      await expect.element(modeCheck).not.toBeChecked();
      await modeCheck.click();
      await expect.element(modeCheck).toBeChecked();

      await screen.unmount();
      expect(deviceSettings.get('defaultTimedMode')).toBe('dangerous');
      expect(deviceSettings.get('defaultTimedDuration')).toBe(10);
    });
  });

  describe('OngoingSession', () => {
    test('on Start Writing click start a session', async () => {
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await expect.element(getContentEditor(screen)).toBeInTheDocument();
      await expect
        .element(screen.getByText('Choose a session length'))
        .not.toBeInTheDocument();
    });

    test('on new session save new defaults', async () => {
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });

      const newDuration = getSelectDurationRadio(screen, 5);
      await expect.element(newDuration).toBeInTheDocument();
      await expect.element(newDuration).not.toBeChecked();
      await newDuration.click();
      await expect.element(newDuration).toBeChecked();

      const modeCheck = getSelectSessionModeCheck(screen);
      await expect.element(modeCheck).toBeInTheDocument();
      await expect.element(modeCheck).not.toBeChecked();
      await modeCheck.click();
      await expect.element(modeCheck).toBeChecked();

      await getStartWritingBtn(screen).click();
      await expect.element(getContentEditor(screen)).toBeInTheDocument();

      expect(deviceSettings.get('defaultTimedMode')).toBe('less-dangerous');
      expect(deviceSettings.get('defaultTimedDuration')).toBe(5);
    });

    test('on new session timer does not start until user starts typing', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await expect.element(getContentEditor(screen)).toBeInTheDocument();
      vi.advanceTimersByTime(65000);
      await expect.element(getContentEditor(screen)).toBeInTheDocument();
      await expect.element(getProgressBar(screen)).not.toBeInTheDocument();
    });

    test('timer starts when user starts typing', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      const textbox = getContentEditor(screen);
      await expect.element(textbox).toBeInTheDocument();

      await expect.element(getProgressBar(screen)).not.toBeInTheDocument();
      await textbox.fill('abc');
      await expect.element(getProgressBar(screen)).toBeInTheDocument();
    });

    test('progress bar is updated during session', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc');
      const progressBar = getProgressBar(screen);

      await expect.element(progressBar).toHaveValue(0);

      vi.advanceTimersByTime(30000);

      await expect.element(progressBar).toHaveValue(0.5);
    });

    test('in less dangerous mode session nothing happens if user stops typing', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc');

      vi.advanceTimersByTime(30000);

      await expect(getContentEditor(screen)).toBeInTheDocument();
    });

    test('can discard any time during session', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc');
      vi.advanceTimersByTime(30000);

      await expect.element(getContentEditor(screen)).toBeInTheDocument();
      const discardBtn = getDiscardBtn(screen);
      await expect.element(discardBtn).toBeInTheDocument();

      await discardBtn.click();

      // back on start panel
      await expect
        .element(screen.getByText('Choose a session length'))
        .toBeInTheDocument();
      expect(store.getValue('tempDoc')).toBeUndefined();
    });

    test('ongoing session only stops after selected duration', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc');
      const progressBar = getProgressBar(screen);
      const textbox = getContentEditor(screen);
      await expect.element(getSaveBtn(screen)).not.toBeInTheDocument();

      vi.advanceTimersByTime(30000);
      await expect.element(textbox).toBeInTheDocument();
      await expect.element(progressBar).toBeInTheDocument();
      vi.advanceTimersByTime(30000);
      await expect.element(textbox).toBeInTheDocument();
      await expect.element(progressBar).not.toBeInTheDocument();
      await expect.element(getSaveBtn(screen)).toBeInTheDocument();
    });

    test('indicator gets color when user is typing', async () => {
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      deviceSettings.set('defaultTimedDuration', 1);
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      const textbox = getContentEditor(screen);
      const indicatorIcon = getIndicatorIcon(screen);
      await textbox.fill('abc');
      await expect.element(indicatorIcon).toBeInTheDocument();
      await userEvent.type(textbox, 'e');
      await expect.element(indicatorIcon).toHaveAttribute('color', 'primary');
      vi.advanceTimersByTime(250);
      await expect
        .element(indicatorIcon)
        .not.toHaveAttribute('color', 'primary');
    });

    test('can type without losing focus', async () => {
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      deviceSettings.set('defaultTimedDuration', 1);
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      const textbox = getContentEditor(screen);
      await textbox.fill('abc');
      await userEvent.type(textbox, 'e');
      await expect.element(textbox).toHaveFocus();
    });
  });

  describe('Dangerous Mode', () => {
    test('after 2 seconds of idle show warning', async () => {
      deviceSettings.set('defaultTimedMode', 'dangerous');
      deviceSettings.set('defaultTimedDuration', 1);
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      const textbox = getContentEditor(screen);
      const progressBar = getProgressBar(screen);
      await textbox.fill('abc');

      await expect.element(progressBar).toBeInTheDocument();
      await expect.element(progressBar).not.toHaveAttribute('color', 'danger');
      vi.advanceTimersByTime(2000);
      await expect.element(progressBar).toHaveAttribute('color', 'danger');
    });

    test('can resume typing between 2 and 5 seconds without failing and reset', async () => {
      deviceSettings.set('defaultTimedMode', 'dangerous');
      deviceSettings.set('defaultTimedDuration', 1);
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      const textbox = getContentEditor(screen);
      const progressBar = getProgressBar(screen);
      await textbox.fill('abc');
      vi.advanceTimersByTime(2000);
      await expect.element(progressBar).toHaveAttribute('color', 'danger');
      vi.advanceTimersByTime(2000);
      await expect.element(progressBar).toHaveAttribute('color', 'danger');
      await textbox.fill('abcdef');
      await expect.element(progressBar).not.toHaveAttribute('color', 'danger');
      vi.advanceTimersByTime(4000);
      await expect.element(progressBar).toHaveAttribute('color', 'danger');
    });

    test('after 5 seconds of idle fail session', async () => {
      deviceSettings.set('defaultTimedMode', 'dangerous');
      deviceSettings.set('defaultTimedDuration', 1);
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      const textbox = getContentEditor(screen);
      const progressBar = getProgressBar(screen);
      await textbox.fill('abc');
      vi.advanceTimersByTime(2000);
      await expect.element(progressBar).toHaveAttribute('color', 'danger');
      vi.advanceTimersByTime(3000);

      // session failed
      await expect.element(textbox).not.toBeInTheDocument();
      await expect.element(progressBar).not.toBeInTheDocument();

      // back on start panel
      await expect
        .element(screen.getByText('Choose a session length'))
        .toBeInTheDocument();
      expect(store.getValue('tempDoc')).toBeUndefined();
    });
  });

  describe('End of session', () => {
    test('on success show word count and save button', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      await expect.element(getSaveBtn(screen)).not.toBeInTheDocument();
      await expect
        .element(screen.getByText('words', { exact: false }))
        .not.toBeInTheDocument();
      const progressBar = getProgressBar(screen);
      const textbox = getContentEditor(screen);
      vi.advanceTimersByTime(65000);
      await expect.element(textbox).toBeInTheDocument();
      await expect.element(progressBar).not.toBeInTheDocument();

      await expect.element(textbox).toHaveTextContent('abc def');
      await expect.element(getSaveBtn(screen)).toBeInTheDocument();
      await expect.element(getWordCountLabel(screen, 2)).toBeInTheDocument();
    });

    test('on success draft is temporarily saved before user makes a choice', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      vi.advanceTimersByTime(65000);

      await expect.element(getWordCountLabel(screen, 2)).toBeInTheDocument();
      expect(store.getValue('tempDoc')).toBeDefined();
      expectLexicalStatesToBeEqual(
        store.getValue('tempDoc') as string,
        getNewParsedContent('abc def')
      );
    });

    test('on success can still edit draft before saving', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      const textbox = getContentEditor(screen);
      vi.advanceTimersByTime(65000);
      await expect.element(textbox).toBeInTheDocument();

      await textbox.fill('abc def ghi');
      await expect.element(textbox).toHaveTextContent('abc def ghi');

      expect(store.getValue('tempDoc')).toBeDefined();
      expectLexicalStatesToBeEqual(
        store.getValue('tempDoc') as string,
        getNewParsedContent('abc def ghi')
      );

      await userEvent.type(textbox, 'e');
      await expect.element(textbox).toHaveFocus();
    });

    test('in save modal chose can chose to create a new document under current folder', async () => {
      const folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const docId = collectionService.addDocument(folId);
      resumeService.setLastFolder(folId);

      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      vi.advanceTimersByTime(65000);

      const saveBtn = getSaveBtn(screen);
      await expect.element(saveBtn).toBeInTheDocument();
      await saveBtn.click();

      await expect
        .element(screen.getByText('Choose where to save your work'))
        .toBeInTheDocument();

      await expect.element(getMainList(screen)).toBeInTheDocument();
      await expect
        .element(getListItemWithText(screen, 'New document'))
        .toBeInTheDocument();
      await expect
        .element(
          getListItemWithText(screen, 'timed session ' + dateToStr('iso'))
        )
        .toBeInTheDocument();

      const modalSaveBtn = getModalSaveBtn(screen);
      await expect.element(modalSaveBtn).toBeInTheDocument();
      await modalSaveBtn.click();

      expect(store.getValue('tempDoc')).toBeUndefined();

      const docs = fetchItemsQuery.getResults(
        { parentId: folId },
        'createdAt',
        true
      );
      expect(docs).toHaveLength(2);
      expect(docs[0].previewText).toBe('abc def');
      expect(docs[1].id).toBe(docId);

      expect(navigateToList).toHaveLength(1);
      expect(navigateToList[0]).toBe(
        `${DOCUMENT_ROUTE}?folder=${folId}&document=${docs[0].id}`
      );
    });

    test('in save modal can chose to create a new document under another folder', async () => {
      const folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const docId = collectionService.addDocument(folId);

      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      vi.advanceTimersByTime(65000);
      await getSaveBtn(screen).click();

      await expect
        .element(screen.getByText('Choose where to save your work'))
        .toBeInTheDocument();

      await expect.element(getMainList(screen)).toBeInTheDocument();
      const folderItem = getListItemWithText(screen, 'New folder');
      const tempItem = getListItemWithText(
        screen,
        'timed session ' + dateToStr('iso')
      );
      await expect.element(folderItem).toBeInTheDocument();
      await expect.element(tempItem).toBeInTheDocument();

      await (folderItem.element() as HTMLIonItemElement).click();
      await expect.element(folderItem).not.toBeInTheDocument();
      await expect.element(tempItem).toBeInTheDocument();
      await expect
        .element(getListItemWithText(screen, 'New document'))
        .toBeInTheDocument();

      const modalSaveBtn = getModalSaveBtn(screen);
      await expect.element(modalSaveBtn).toBeInTheDocument();
      await modalSaveBtn.click();

      expect(store.getValue('tempDoc')).toBeUndefined();

      const docs = fetchItemsQuery.getResults(
        { parentId: folId },
        'createdAt',
        true
      );
      expect(docs).toHaveLength(2);
      expect(docs[0].previewText).toBe('abc def');
      expect(docs[1].id).toBe(docId);

      expect(navigateToList).toHaveLength(1);
      expect(navigateToList[0]).toBe(
        `${DOCUMENT_ROUTE}?folder=${folId}&document=${docs[0].id}`
      );
    });

    test('in save modal can chose to append to an existing document', async () => {
      const folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const docId = collectionService.addDocument(folId);
      collectionService.setItemLexicalContent(
        docId,
        getNewParsedContent('hello world'),
        true
      );
      resumeService.setLastFolder(folId);

      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      vi.advanceTimersByTime(65000);

      const saveBtn = getSaveBtn(screen);
      await expect.element(saveBtn).toBeInTheDocument();
      await saveBtn.click();

      await expect
        .element(screen.getByText('Choose where to save your work'))
        .toBeInTheDocument();

      await expect.element(getMainList(screen)).toBeInTheDocument();
      const existingDocItem = getListItemWithText(screen, 'New document');
      const tempDocItem = getListItemWithText(
        screen,
        'timed session ' + dateToStr('iso')
      );
      await expect.element(existingDocItem).toBeInTheDocument();
      await expect.element(tempDocItem).toBeInTheDocument();

      await (existingDocItem.element() as HTMLIonItemElement).click();
      await expect.element(tempDocItem).not.toBeInTheDocument();

      const mergeBtn = getModalMergeBtn(screen);
      await expect.element(getModalSaveBtn(screen)).not.toBeInTheDocument();
      await expect.element(mergeBtn).toBeInTheDocument();
      await mergeBtn.click();

      expect(store.getValue('tempDoc')).toBeUndefined();

      const docs = fetchItemsQuery.getResults(
        { parentId: folId },
        'createdAt',
        true
      );
      expect(docs).toHaveLength(1);
      expect(docs[0].previewText).toBe('hello world abc def');
      const content = collectionService.getDocumentContent(docs[0].id);
      expectLexicalStatesToBeEqual(
        content,
        fromSimpleHTML('<p>hello world</p><p>abc def</p>').obj!
      );

      expect(navigateToList).toHaveLength(1);
      expect(navigateToList[0]).toBe(
        `${DOCUMENT_ROUTE}?folder=${folId}&document=${docs[0].id}`
      );
    });

    test('in save modal do nothing if close', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      vi.advanceTimersByTime(65000);
      await getSaveBtn(screen).click();

      await expect
        .element(screen.getByText('Choose where to save your work'))
        .toBeInTheDocument();

      await expect.element(getMainList(screen)).toBeInTheDocument();

      const modalCloseBtn = getModalCloseBtn(screen);
      await expect.element(modalCloseBtn).toBeInTheDocument();
      await modalCloseBtn.click();

      expect(store.getValue('tempDoc')).toBeDefined();
      expect(navigateToList).toHaveLength(0);
    });

    test('can go back to end of session after navigating away', async () => {
      {
        deviceSettings.set('defaultTimedDuration', 1);
        deviceSettings.set('defaultTimedMode', 'less-dangerous');
        const screen = await render(<WritingSession />, {
          wrapper: TestingProvider
        });
        await getStartWritingBtn(screen).click();
        await getContentEditor(screen).fill('abc def');
        vi.advanceTimersByTime(65000);
        await getSaveBtn(screen).click();
        await expect.element(getMainList(screen)).toBeInTheDocument();
        await getModalCloseBtn(screen).click();

        expect(store.getValue('tempDoc')).toBeDefined();
        await screen.unmount();
      }
      {
        // mount a second time
        const screen = await render(<WritingSession />, {
          wrapper: TestingProvider
        });
        const textbox = getContentEditor(screen);
        await expect.element(textbox).toBeInTheDocument();
        await expect.element(textbox).toHaveTextContent('abc def');
        await expect
          .element(screen.getByText('Choose a session length'))
          .not.toBeInTheDocument();
        await expect.element(getSaveBtn(screen)).toBeInTheDocument();
        await expect.element(getWordCountLabel(screen, 2)).toBeInTheDocument();
      }
    });

    test('always go back to start panel after user choice', async () => {
      {
        deviceSettings.set('defaultTimedDuration', 1);
        deviceSettings.set('defaultTimedMode', 'less-dangerous');
        const screen = await render(<WritingSession />, {
          wrapper: TestingProvider
        });
        await getStartWritingBtn(screen).click();
        await getContentEditor(screen).fill('abc def');
        vi.advanceTimersByTime(65000);
        await getSaveBtn(screen).click();
        await expect.element(getMainList(screen)).toBeInTheDocument();
        await getModalSaveBtn(screen).click();

        expect(store.getValue('tempDoc')).toBeUndefined();
        expect(navigateToList).toHaveLength(1);

        await screen.unmount();
      }
      {
        // mount a second time
        const screen = await render(<WritingSession />, {
          wrapper: TestingProvider
        });
        // back to start panel
        await expect
          .element(screen.getByText('Choose a session length'))
          .toBeInTheDocument();
      }
    });

    test('on success can still discard draft', async () => {
      deviceSettings.set('defaultTimedDuration', 1);
      deviceSettings.set('defaultTimedMode', 'less-dangerous');
      const screen = await render(<WritingSession />, {
        wrapper: TestingProvider
      });
      await getStartWritingBtn(screen).click();
      await getContentEditor(screen).fill('abc def');
      vi.advanceTimersByTime(65000);

      expect(store.getValue('tempDoc')).toBeDefined();
      expectLexicalStatesToBeEqual(
        store.getValue('tempDoc') as string,
        getNewParsedContent('abc def')
      );

      await getDiscardBtn(screen).click();

      // back on start panel
      await expect
        .element(screen.getByText('Choose a session length'))
        .toBeInTheDocument();
      expect(store.getValue('tempDoc')).toBeUndefined();
    });
  });
});
