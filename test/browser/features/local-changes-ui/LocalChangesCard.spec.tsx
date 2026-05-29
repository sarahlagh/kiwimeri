import { DEFAULT_NOTEBOOK_ID, getGlobalTrans } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import userSettingsService from '@/db/user-settings.service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeResult } from '@/domain/local-changes/model';
import LocalChangesCard, {
  onRouteEnter,
  onRouteLeave
} from '@/features/local-changes-ui/components/LocalChangesCard';
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

  test('renders a card with value local changes', async () => {
    userSettingsService.setHistoryMaxVersions(300);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);

    const screen = await render(<LocalChangesCard />, {
      wrapper: TestingProvider
    });
    await expectChangeInList(screen, localChanges);
    expect(getListItem(screen, localChanges[0].id)).toHaveTextContent(
      'space option modified'
    );
  });

  test('renders a card with "add comment" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();
    const commentId = docAnnotationsService.addComment(docId);
    docAnnotationsService.editComment(
      commentId,
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

  test('renders a card with "update comment" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const commentId = docAnnotationsService.addComment(docId);
    localChangesService.clear();
    docAnnotationsService.editComment(
      commentId,
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

  test('renders a card with "delete comment" local changes', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const commentId = docAnnotationsService.addComment(docId);
    localChangesService.clear();
    docAnnotationsService.deleteComment(commentId);

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
});
