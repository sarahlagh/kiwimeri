import { DEFAULT_NOTEBOOK_ID, getGlobalTrans } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import { docAnnotationsService } from '@/domain/collection/doc-annotations.service';
import notebooksService from '@/domain/collection/notebooks.service';
import { LocalChangeResult } from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import { userPreferenceDefinitions } from '@/domain/user-preferences/user-preferences';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import LocalChangesCard, {
  onRouteEnter,
  onRouteLeave
} from '@/features/synchronization-ui/local-changes-ui/LocalChangesCard';
import { getNewContent } from '@@/_setup/test.utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { render, RenderResult } from 'vitest-browser-react';
import { TestingProvider } from '../../TestingProvider';
import {
  getCardLocalDate,
  getCardLocalRemote,
  getCardTitle,
  getListItem
} from './LocalChangesCard.locators';

describe('LocalChangesCard', () => {
  beforeEach(() => {
    onRouteEnter();
  });
  afterEach(() => {
    onRouteLeave();
  });

  test('renders an empty card', async () => {
    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expect.element(getCardTitle(screen, 0)).toBeInTheDocument();
    await expect.element(getCardLocalDate(screen)).toBeInTheDocument();
    await expect
      .element(getCardLocalRemote(screen, 'never'))
      .toBeInTheDocument();
  });

  async function expectChangeInList(
    screen: RenderResult,
    localChanges: LocalChangeResult[]
  ) {
    await expect.element(getCardTitle(screen, 1)).toBeInTheDocument();
    await expect
      .element(getListItem(screen, localChanges[0].id))
      .toBeInTheDocument();
  }

  test('renders a card with "add document" local changes', async () => {
    collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      getGlobalTrans().newDocTitle
    );
  });

  test('renders a card with "update document" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();
    collectionService.setItemLexicalContent(
      docId,
      JSON.parse(getNewContent('test'))
    );
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      getGlobalTrans().newDocTitle
    );
  });

  test('renders a card with "delete document" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();
    collectionService.deleteItem(docId);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'deleted item'
    );
  });

  test('renders a card with "add folder" local changes', async () => {
    collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      getGlobalTrans().newFolderTitle
    );
  });

  test('renders a card with "update folder" local changes', async () => {
    const itemId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();
    collectionService.setItemTitle(itemId, 'new title');
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'new title'
    );
  });

  test('renders a card with "delete folder" local changes', async () => {
    const itemId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();
    collectionService.deleteItem(itemId);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'deleted item'
    );
  });

  test('renders a card with "add notebook" local changes', async () => {
    notebooksService.addNotebook('new notebook');
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'new notebook'
    );
  });

  test('renders a card with "update notebook" local changes', async () => {
    const itemId = notebooksService.addNotebook('new notebook');
    localChangesService.clear();
    collectionService.setItemTitle(itemId, 'new title');
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'new title'
    );
  });

  test('renders a card with "delete notebook" local changes', async () => {
    const itemId = notebooksService.addNotebook('new notebook');
    localChangesService.clear();
    collectionService.deleteItem(itemId);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'deleted item'
    );
  });

  test('renders a card with "add note" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();
    const noteId = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(
      noteId,
      JSON.parse(getNewContent('test content'))
    );

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'test content'
    );
  });

  test('renders a card with "update note" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const noteId = docAnnotationsService.addNote(docId);
    localChangesService.clear();
    docAnnotationsService.edit(
      noteId,
      JSON.parse(getNewContent('test updated content'))
    );

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'test updated content'.substring(0, 15)
    );
  });

  test('renders a card with "delete note" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const noteId = docAnnotationsService.addNote(docId);
    localChangesService.clear();
    docAnnotationsService.delete(noteId);

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'deleted item'
    );
  });

  test('renders a card with "update user pref" local changes', async () => {
    userPrefs.set(
      'statsEnabled',
      !userPreferenceDefinitions['statsEnabled'].default
    );
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'Space setting modified: Track text statistics'
    );
  });
});
