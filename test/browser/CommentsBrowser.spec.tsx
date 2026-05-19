import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/db/collection.service';
import { commentsService } from '@/domain/comments/comments.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { CommentsBrowser } from '@/features/comments-ui';
import fetchCommentsQuery from '@/features/comments-ui/queries/fetchCommentsQuery';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { getNewContent } from '../_setup/test.utils';
import {
  getAddBtn,
  getCommentPreview,
  getContentEditor,
  getCreateACommentNote,
  getCreatedAtCommentInfo,
  getDeleteCommentBtn,
  getSelectACommentNote,
  getSortFilterBtn,
  getSortSwitchDirectionBtn,
  getSwitchCommentInfoBtn,
  getToggleActionsBtn,
  getUpdatedAtCommentInfo
} from './CommentsBrowser.locators';

import '@/features/comments-ui/components/CommentsBrowser.scss';
import BottomSheet from '@/shared/containers/BottomSheet';
import { TestingProvider } from './TestingProvider';

describe('CommentsBrowser', () => {
  test('renders an empty comments browser', async () => {
    const screen = await render(<CommentsBrowser id="0" />, {
      wrapper: TestingProvider
    });
    await expect.element(getSelectACommentNote(screen)).toBeInTheDocument();
    await expect.element(getCreateACommentNote(screen)).toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();
  });

  test('creates a comment from an empty browser', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);

    const screen = await render(<CommentsBrowser id={docId} />, {
      wrapper: TestingProvider
    });
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getCommentPreview(screen, '')).not.toBeInTheDocument();
    await expect.element(getContentEditor(screen)).not.toBeInTheDocument();

    await getAddBtn(screen).click();

    await expect.element(getCommentPreview(screen, '')).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();

    expect(fetchCommentsQuery.getResults({ itemId: docId })).toHaveLength(1);
    expect(
      resumeService.getResumeState(docId)?.lastSelectedCommentId
    ).toBeDefined();
  });

  test('renders a non-empty comments browser', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId);
    commentsService.editComment(comment1, JSON.parse(getNewContent('test 1')));
    const comment2 = commentsService.addComment(docId);
    commentsService.editComment(comment2, JSON.parse(getNewContent('test 2')));

    const screen = await render(<CommentsBrowser id={docId} />, {
      wrapper: TestingProvider
    });
    await expect.element(getSelectACommentNote(screen)).toBeInTheDocument();
    await expect.element(getCreateACommentNote(screen)).not.toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();

    await expect
      .element(getCommentPreview(screen, 'test 1'))
      .toBeInTheDocument();
    await expect
      .element(getCommentPreview(screen, 'test 2'))
      .toBeInTheDocument();

    await expect.element(getContentEditor(screen)).not.toBeInTheDocument();
  });

  test('opens the last selected comment on render', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId);
    commentsService.editComment(comment1, JSON.parse(getNewContent('test 1')));
    const comment2 = commentsService.addComment(docId);
    commentsService.editComment(comment2, JSON.parse(getNewContent('test 2')));
    resumeService.setLastSelectedComment(docId, comment1);

    const screen = await render(<CommentsBrowser id={docId} />, {
      wrapper: TestingProvider
    });
    await expect.element(getSelectACommentNote(screen)).not.toBeInTheDocument();
    await expect.element(getCreateACommentNote(screen)).not.toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();

    await expect
      .element(getCommentPreview(screen, 'test 1'))
      .toBeInTheDocument();
    await expect
      .element(getCommentPreview(screen, 'test 2'))
      .toBeInTheDocument();

    await expect
      .element(getCommentPreview(screen, 'test 1'))
      .toHaveAttribute('disabled');
    await expect
      .element(getCommentPreview(screen, 'test 2'))
      .not.toHaveAttribute('disabled');

    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');
  });

  test('select another existing comment', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId);
    commentsService.editComment(comment1, JSON.parse(getNewContent('test 1')));
    const comment2 = commentsService.addComment(docId);
    commentsService.editComment(comment2, JSON.parse(getNewContent('test 2')));
    resumeService.setLastSelectedComment(docId, comment1);

    const screen = await render(<CommentsBrowser id={docId} />, {
      wrapper: TestingProvider
    });

    await expect
      .element(getCommentPreview(screen, 'test 1'))
      .toBeInTheDocument();
    await expect
      .element(getCommentPreview(screen, 'test 2'))
      .toBeInTheDocument();
    await expect
      .element(getCommentPreview(screen, 'test 1'))
      .toHaveAttribute('disabled');
    await expect
      .element(getCommentPreview(screen, 'test 2'))
      .not.toHaveAttribute('disabled');
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');

    await getCommentPreview(screen, 'test 2').element().click();

    await expect
      .element(getCommentPreview(screen, 'test 1'))
      .not.toHaveAttribute('disabled');
    await expect
      .element(getCommentPreview(screen, 'test 2'))
      .toHaveAttribute('disabled');
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 2');
  });

  test('toggle comment info', async () => {
    vi.useFakeTimers();
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId);
    vi.advanceTimersByTime(100);
    commentsService.editComment(comment1, JSON.parse(getNewContent('test 1')));
    resumeService.setLastSelectedComment(docId, comment1);
    vi.useRealTimers();
    const commentInfo = commentsService.getCommentInfo(comment1);

    const screen = await render(
      <BottomSheet>
        <CommentsBrowser id={docId} />
      </BottomSheet>,
      {
        wrapper: TestingProvider
      }
    );
    await expect.element(getSelectACommentNote(screen)).not.toBeInTheDocument();
    await expect.element(getCreateACommentNote(screen)).not.toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');

    await expect.element(getToggleActionsBtn(screen)).toBeInTheDocument();
    await expect
      .element(getSwitchCommentInfoBtn(screen))
      .not.toBeInTheDocument();
    await expect
      .element(getCreatedAtCommentInfo(screen, commentInfo.createdAt))
      .not.toBeInTheDocument();

    await getToggleActionsBtn(screen).click();

    await expect.element(getSwitchCommentInfoBtn(screen)).toBeInTheDocument();
    await expect
      .element(getCreatedAtCommentInfo(screen, commentInfo.createdAt))
      .toBeInTheDocument();
    await expect
      .element(getUpdatedAtCommentInfo(screen, commentInfo.updatedAt))
      .not.toBeInTheDocument();

    await getSwitchCommentInfoBtn(screen).click();
    await expect
      .element(getCreatedAtCommentInfo(screen, commentInfo.createdAt))
      .not.toBeInTheDocument();
    await expect
      .element(getUpdatedAtCommentInfo(screen, commentInfo.updatedAt))
      .toBeInTheDocument();
  });

  test('delete the selected comment', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId);
    commentsService.editComment(comment1, JSON.parse(getNewContent('test 1')));
    const comment2 = commentsService.addComment(docId);
    commentsService.editComment(comment2, JSON.parse(getNewContent('test 2')));
    resumeService.setLastSelectedComment(docId, comment1);

    const screen = await render(
      <BottomSheet>
        <CommentsBrowser id={docId} />
      </BottomSheet>,
      {
        wrapper: TestingProvider
      }
    );
    await expect.element(getSelectACommentNote(screen)).not.toBeInTheDocument();
    await expect.element(getCreateACommentNote(screen)).not.toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');

    await expect.element(getToggleActionsBtn(screen)).toBeInTheDocument();
    await expect.element(getDeleteCommentBtn(screen)).not.toBeInTheDocument();

    await getToggleActionsBtn(screen).click();
    await expect.element(getDeleteCommentBtn(screen)).toBeInTheDocument();

    await getDeleteCommentBtn(screen).click();

    await expect
      .element(screen.locator.getByText('Are you sure?'))
      .toBeInTheDocument();
    const confirmButton = screen.locator.getByRole('button', {
      name: 'Confirm'
    });
    await expect.element(confirmButton).toBeInTheDocument();

    await confirmButton.click();

    // comment deleted
    await expect.element(getSelectACommentNote(screen)).toBeInTheDocument();
    await expect
      .element(getCommentPreview(screen, 'test 1'))
      .not.toBeInTheDocument();
    await expect
      .element(getCommentPreview(screen, 'test 2'))
      .toBeInTheDocument();

    expect(commentsService.getCommentContent(comment1)).toBeUndefined();
  });

  test('change comments sort order', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId, 0);
    commentsService.editComment(comment1, JSON.parse(getNewContent('test 1')));
    const comment2 = commentsService.addComment(docId, 3);
    commentsService.editComment(comment2, JSON.parse(getNewContent('test 2')));
    const comment3 = commentsService.addComment(docId, 1);
    commentsService.editComment(comment3, JSON.parse(getNewContent('test 3')));

    const screen = await render(<CommentsBrowser id={docId} />, {
      wrapper: TestingProvider
    });

    // test sort order
    const itemsBefore = document.querySelectorAll('ion-item');
    expect(itemsBefore[0]).toHaveTextContent('test 1');
    expect(itemsBefore[1]).toHaveTextContent('test 2');
    expect(itemsBefore[2]).toHaveTextContent('test 3');

    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();
    await getSortFilterBtn(screen).click();

    await expect.element(getSortSwitchDirectionBtn(screen)).toBeInTheDocument();

    // open the select
    const selectedSort = screen.locator.getByPlaceholder('Creation Date');
    await expect.element(selectedSort).toBeInTheDocument();
    await selectedSort.click();

    const confirmButton = screen.locator.getByRole('button', {
      name: 'Ok'
    });
    await expect.element(confirmButton).toBeInTheDocument();

    const radioCreationDate = screen.locator.getByRole('radio', {
      name: 'Creation Date'
    });
    const radioManual = screen.locator.getByRole('radio', { name: 'Manual' });
    await expect.element(radioCreationDate).toBeInTheDocument();
    await expect.element(radioManual).toBeInTheDocument();

    await expect
      .element(radioCreationDate)
      .toHaveAttribute('aria-checked', 'true');
    await expect.element(radioManual).toHaveAttribute('aria-checked', 'false');

    // change sort
    await radioManual.click();
    await confirmButton.click();

    await expect.element(selectedSort).not.toBeInTheDocument();
    await expect
      .element(screen.locator.getByPlaceholder('Manual'))
      .toBeInTheDocument();

    // check sort order changed
    const itemsAfter = document.querySelectorAll('ion-item');
    expect(itemsAfter[0]).toHaveTextContent('test 1');
    expect(itemsAfter[1]).toHaveTextContent('test 3');
    expect(itemsAfter[2]).toHaveTextContent('test 2');
  });

  test.todo('drag is disabled when sort is not manual', async () => {});
  test.todo('drag enabled when sort is manual', async () => {});
});
