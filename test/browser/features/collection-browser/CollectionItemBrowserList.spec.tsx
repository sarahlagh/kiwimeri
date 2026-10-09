import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  CONFLICT_STR,
  DEFAULT_NOTEBOOK_ID,
  ROOT_COLLECTION,
  tt
} from '@/constants';
import { settingsService } from '@/domain/collection/collection-settings.service';
import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { CollectionItemBrowserList } from '@/features/collection-browser';
import { browserModes } from '@/features/collection-browser/hooks/useCollectionItemBrowserListResults';
import '@/features/collection-notes-ui/components/NotesBrowser.scss';
import { Id, Ids } from 'tinybase/with-schemas';
import { TestingProvider } from '../../TestingProvider';
import {
  getFooter,
  getHeader,
  getHeaderForConflictsMode,
  getHeaderForLastOpenedAtMode,
  getHeaderForUpdatedAtMode,
  getListItems,
  getListItemWithText,
  getMainList,
  getSwitchModeBtn
} from './CollectionItemBrowserList.locators';

/// setup mocks
import { DOCUMENT_ROUTE, FOLDER_ROUTE } from '@/app/routes';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { conflictsService } from '@/domain/space-merging/conflicts.service';
import * as reactRouter from 'react-router';
import { NavigateOptions } from 'react-router';

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

let notId: string;
let folId: string;
let annotId: string;
const documents: Ids = [];

const BROWSER_MODE_IDX = browserModes.indexOf('browser');
const UPDATED_AT_MODE_IDX = browserModes.indexOf('updatedAt');
const LAST_OPENED_AT_MODE_IDX = browserModes.indexOf('lastOpenedAt');

describe('CollectionItemBrowserList', () => {
  beforeEach(() => {
    navigateToList.length = 0;
    documents.length = 0;

    documents.push(collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    const docId = collectionService.addDocument(folId);
    collectionService.setItemTitle(docId, 'Doc Under Folder With Annot');
    documents.push(docId);
    annotId = annotsService.addNote(docId);

    notId = collectionService.addNotebook(ROOT_COLLECTION, 'test');
    documents.push(collectionService.addDocument(notId));
    collectionService.setItemTitle(documents[2], 'Doc In Other Notebook');

    documents.push(collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    collectionService.setItemTitle(documents[3], 'Other Doc');
  });

  test('renders an empty browser when the parent does not exist', async () => {
    const screen = await render(
      <CollectionItemBrowserList parent={'does_not_exist'} />,
      {
        wrapper: TestingProvider
      }
    );
    await expect.element(screen.baseElement).toBeInTheDocument();

    await expect.element(getHeader(screen)).toBeInTheDocument();
    await expect.element(getHeader(screen)).toBeEmptyDOMElement();
    await expect.element(getFooter(screen)).toBeInTheDocument();
    await expect.element(getMainList(screen)).toBeInTheDocument();
    await expect.element(getListItems(screen)).toHaveLength(0);
  });

  test('renders an empty browser when parent is not a notebook or folder', async () => {
    const screen = await render(
      <CollectionItemBrowserList parent={documents[0]} />,
      {
        wrapper: TestingProvider
      }
    );
    await expect.element(screen.baseElement).toBeInTheDocument();
    await expect.element(getHeader(screen)).toBeInTheDocument();
    await expect.element(getFooter(screen)).toBeInTheDocument();
    await expect.element(getMainList(screen)).toBeInTheDocument();
    await expect.element(getListItems(screen)).toHaveLength(0);
  });

  test('renders an empty item browser', async () => {
    const folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    const screen = await render(<CollectionItemBrowserList parent={folId} />, {
      wrapper: TestingProvider
    });
    await expect.element(screen.baseElement).toBeInTheDocument();
    await expect.element(screen.baseElement).toBeInTheDocument();
    await expect.element(getHeader(screen)).toBeInTheDocument();
    await expect.element(getFooter(screen)).toBeInTheDocument();
    await expect.element(getMainList(screen)).toBeInTheDocument();
    await expect.element(getListItems(screen)).toHaveLength(0);
  });

  describe('different browser modes', () => {
    test('mode=browser only shows folders and documents directly under parent', async () => {
      settingsService.setNotebookDefaultBrowserMode(
        DEFAULT_NOTEBOOK_ID,
        BROWSER_MODE_IDX
      );
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(screen.baseElement).toBeInTheDocument();
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getHeader(screen)).toBeEmptyDOMElement();
      await expect.element(getFooter(screen)).toBeInTheDocument();
      await expect.element(getMainList(screen)).toBeInTheDocument();

      const listitems = getListItems(screen);
      await expect.element(listitems).toHaveLength(3);
      await expect
        .element(screen.getByText(tt('newFolderTitle')))
        .toBeInTheDocument();
      await expect
        .element(screen.getByText(tt('newDocTitle')))
        .toBeInTheDocument();
      await expect.element(screen.getByText('Other Doc')).toBeInTheDocument();
    });

    test('mode=browser is the default', async () => {
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      // empty header means browser mode + no breadcrumb
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getHeader(screen)).toBeEmptyDOMElement();
    });

    test('in browser mode clicking on a document navigates to it', async () => {
      settingsService.setNotebookDefaultBrowserMode(
        DEFAULT_NOTEBOOK_ID,
        BROWSER_MODE_IDX
      );
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );

      const docRow = getListItemWithText(screen, tt('newDocTitle'));
      await expect.element(docRow).toBeInTheDocument();
      await (docRow.element() as HTMLIonItemElement).click();

      expect(navigateToList).toHaveLength(1);
      expect(navigateToList[0]).toBe(
        `${DOCUMENT_ROUTE}?folder=${DEFAULT_NOTEBOOK_ID}&document=${documents[0]}`
      );
    });

    test('in browser mode clicking on a folder navigates to it', async () => {
      settingsService.setNotebookDefaultBrowserMode(
        DEFAULT_NOTEBOOK_ID,
        BROWSER_MODE_IDX
      );
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );

      const folderRow = getListItemWithText(screen, tt('newFolderTitle'));
      await expect.element(folderRow).toBeInTheDocument();
      await (folderRow.element() as HTMLIonItemElement).click();

      expect(navigateToList).toHaveLength(1);
      expect(navigateToList[0]).toBe(`${FOLDER_ROUTE}?folder=${folId}`);
    });

    test('mode=updatedAt shows the last updated documents within the notebook', async () => {
      settingsService.setNotebookDefaultBrowserMode(
        DEFAULT_NOTEBOOK_ID,
        UPDATED_AT_MODE_IDX
      );
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(screen.baseElement).toBeInTheDocument();
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getHeader(screen)).not.toBeEmptyDOMElement();
      await expect.element(getFooter(screen)).toBeInTheDocument();
      await expect.element(getMainList(screen)).toBeInTheDocument();

      await expect
        .element(getHeaderForUpdatedAtMode(screen))
        .toBeInTheDocument();

      const listitems = getListItems(screen);
      await expect.element(listitems).toHaveLength(documents.length - 1); // minus the one in the other notebook

      await expect
        .element(getListItemWithText(screen, 'Doc In Other Notebook'))
        .not.toBeInTheDocument();
      await expect
        .element(getListItemWithText(screen, 'Doc Under Folder With Annot'))
        .toBeInTheDocument();
      await expect
        .element(getListItemWithText(screen, tt('newDocTitle')))
        .toBeInTheDocument();
    });

    test('mode=lastOpenedAt shows the last consulted documents within the notebook', async () => {
      settingsService.setNotebookDefaultBrowserMode(
        DEFAULT_NOTEBOOK_ID,
        LAST_OPENED_AT_MODE_IDX
      );
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(screen.baseElement).toBeInTheDocument();
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getHeader(screen)).not.toBeEmptyDOMElement();
      await expect.element(getFooter(screen)).toBeInTheDocument();
      await expect.element(getMainList(screen)).toBeInTheDocument();

      await expect
        .element(getHeaderForLastOpenedAtMode(screen))
        .toBeInTheDocument();

      const listitems = getListItems(screen);
      await expect.element(listitems).toHaveLength(documents.length - 1); // minus the one in the other notebook

      await expect
        .element(getListItemWithText(screen, 'Doc In Other Notebook'))
        .not.toBeInTheDocument();
      await expect
        .element(getListItemWithText(screen, 'Doc Under Folder With Annot'))
        .toBeInTheDocument();
      await expect
        .element(getListItemWithText(screen, tt('newDocTitle')))
        .toBeInTheDocument();
    });

    test('mode btn switches between modes (conflicts excepted) in a loop', async () => {
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );

      const toggleModeBtn = getSwitchModeBtn(screen);
      await expect.element(toggleModeBtn).toBeInTheDocument();

      // empty header means browser mode + no breadcrumb
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getHeader(screen)).toBeEmptyDOMElement();

      await toggleModeBtn.click();

      await expect
        .element(getHeaderForUpdatedAtMode(screen))
        .toBeInTheDocument();

      await toggleModeBtn.click();

      await expect
        .element(getHeaderForLastOpenedAtMode(screen))
        .toBeInTheDocument();

      await toggleModeBtn.click();

      await expect.element(getHeader(screen)).toBeEmptyDOMElement();
    });
  });

  let conflict1Id: Id;
  let conflict2Id: Id;
  describe('when there are conflicts', () => {
    beforeEach(() => {
      conflictsService.initConflictQueries();
      conflict1Id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      space.setCell(
        SpaceTables.Collection,
        conflict1Id,
        'conflictId',
        documents[0]
      );

      conflict2Id = annotsService.addNote(documents[1]);
      space.setCell(
        SpaceTables.Annotations,
        conflict2Id,
        'conflictId',
        annotId
      );

      const conflict3Id = collectionService.addDocument(notId);
      collectionService.setItemTitle(conflict3Id, 'Doc In Other Notebook');
      space.setCell(
        SpaceTables.Collection,
        conflict3Id,
        'conflictId',
        documents[2]
      );
    });

    afterEach(() => {
      conflictsService.closeConflictQueries();
    });

    test('conflicts mode is automatically toggled on as soon as there are conflicts and cannot be changed', async () => {
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getFooter(screen)).toBeInTheDocument();
      await expect.element(getMainList(screen)).toBeInTheDocument();

      // conflicts mode has been turned on
      await expect
        .element(getHeaderForConflictsMode(screen))
        .toBeInTheDocument();

      // can't switch
      const btn = getSwitchModeBtn(screen);
      await expect.element(btn).toBeInTheDocument();
      await expect.element(btn).toBeDisabled();
    });

    test('conflicts mode only shows documents with conflicts within the space', async () => {
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getFooter(screen)).toBeInTheDocument();
      await expect.element(getMainList(screen)).toBeInTheDocument();

      // conflicts mode has been turned on
      await expect
        .element(getHeaderForConflictsMode(screen))
        .toBeInTheDocument();

      const listitems = getListItems(screen);
      await expect.element(listitems).toHaveLength(5);

      // only documents in conflict are shown
      await expect
        .element(screen.getByText(tt('newDocTitle'), { exact: true }))
        .toBeInTheDocument();
      await expect
        .element(
          screen.getByText(CONFLICT_STR + tt('newDocTitle'), {
            exact: true
          })
        )
        .toBeInTheDocument();
      await expect
        .element(
          screen.getByText('Doc Under Folder With Annot', { exact: true })
        )
        .toBeInTheDocument();
      await expect
        .element(screen.getByText('Doc In Other Notebook', { exact: true }))
        .toBeInTheDocument();
      await expect
        .element(
          screen.getByText(CONFLICT_STR + 'Doc In Other Notebook', {
            exact: true
          })
        )
        .toBeInTheDocument();

      // folders and documents not in conflict are not shown
      await expect
        .element(screen.getByText(tt('newFolderTitle')))
        .not.toBeInTheDocument();
      await expect
        .element(screen.getByText('Other Doc'))
        .not.toBeInTheDocument();
    });

    test('in conflicts mode both documents and conflicts are clickable', async () => {
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(getHeader(screen)).toBeInTheDocument();
      await expect.element(getFooter(screen)).toBeInTheDocument();
      await expect.element(getMainList(screen)).toBeInTheDocument();

      const docRow = getListItemWithText(screen, tt('newDocTitle'));
      await expect.element(docRow).toHaveLength(2); // FIXME even with exact: true, still matches the conflict

      const btns = docRow.elements() as HTMLIonItemElement[];
      await btns[0].click();

      expect(navigateToList).toHaveLength(1);
      expect(navigateToList[0]).toBe(
        `${DOCUMENT_ROUTE}?folder=${DEFAULT_NOTEBOOK_ID}&document=${documents[0]}`
      );

      await btns[1].click();

      expect(navigateToList).toHaveLength(2);
      expect(navigateToList[1]).toBe(
        `${DOCUMENT_ROUTE}?folder=${DEFAULT_NOTEBOOK_ID}&document=${conflict1Id}`
      );
    });

    test('resolving item conflicts updates the browser', async () => {
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(getListItems(screen)).toHaveLength(5);

      collectionService.deleteItem(conflict1Id);

      await expect.element(getListItems(screen)).toHaveLength(3);
      await expect
        .element(screen.getByText(tt('newDocTitle'), { exact: true }))
        .not.toBeInTheDocument();
      await expect
        .element(
          screen.getByText(CONFLICT_STR + tt('newDocTitle'), {
            exact: true
          })
        )
        .not.toBeInTheDocument();
    });

    test('resolving annotation conflicts updates the browser', async () => {
      const screen = await render(
        <CollectionItemBrowserList parent={DEFAULT_NOTEBOOK_ID} />,
        {
          wrapper: TestingProvider
        }
      );
      await expect.element(getListItems(screen)).toHaveLength(5);

      annotsService.delete(conflict2Id);

      await expect.element(getListItems(screen)).toHaveLength(4);
      await expect
        .element(
          screen.getByText('Doc Under Folder With Annot', { exact: true })
        )
        .not.toBeInTheDocument();
    });
  });

  // TODO popover for item actions
  // TODO sorting, searching
  // TODO footer actions: add doc, add folder, import / export, go to folder...
  // TODO breadcrumb behavior
});
