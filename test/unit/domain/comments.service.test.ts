import TinybaseProvider from '@/app/providers/TinybaseProvider';
import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import collectionService from '@/db/collection.service';
import { commentsService } from '@/domain/comments/comments.service';
import { CommentRow } from '@/domain/comments/model';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import useCommentSort from '@/features/comments-ui/hooks/useCommentSort';
import fetchCommentsQuery from '@/features/comments-ui/queries/fetchCommentsQuery';
import { getNewContent } from '@@/_setup/test.utils';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

function getDocUpdatedTs(docId: string) {
  return space.getCell('collection', docId, 'updated') as number;
}

function expectedLC(commentId: string, type: LocalChangeType, updated: number) {
  return {
    id: localChangesService['getLocalChangeId']({
      on: 'comments',
      change: type,
      itemId: commentId
    }),
    on: 'comments',
    itemId: commentId,
    change: type,
    createdAt: updated
  };
}

describe('comments service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add a comment to a document', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const commentId = commentsService.addComment(docId);
    const comments = fetchCommentsQuery.getResults({ itemId: docId });
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe(commentId);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
    expect(commentsService.getCommentInfo(commentId)).toEqual({
      createdAt: updated + 100,
      updatedAt: updated + 100,
      itemId: docId
    });
    expect(localChangesService.getLocalChanges()).toContainEqual(
      expectedLC(commentId, LocalChangeType.add, updated + 100)
    );
  });

  it('should add comments in bulk to a document', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const comments: CommentRow[] = [];
    comments.push(commentsService.newCommentObj(docId).item);
    comments.push(commentsService.newCommentObj(docId + 'diff').item);
    commentsService.saveComments(docId, comments);

    const commentResults = fetchCommentsQuery.getResults({ itemId: docId });
    expect(commentResults).toHaveLength(2);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    for (const r of commentResults) {
      expect(localChangesService.getLocalChanges()).toContainEqual(
        expectedLC(r.id, LocalChangeType.add, r.createdAt)
      );
    }
  });

  it('should edit a comment', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const commentId = commentsService.addComment(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const content = getNewContent('this is the content');
    commentsService.editComment(commentId, JSON.parse(content));

    const comment = space.getRow('comments', commentId);
    expect(unminimizeContentFromStorage(comment.content)).toBe(content);
    expect(commentsService.getCommentContent(commentId)).toBe(comment.content);
    expect(comment.plainText).toBe('this is the content');
    expect(comment.updatedAt).toBeGreaterThan(updated);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    expect(localChangesService.getLocalChanges()).toContainEqual(
      expectedLC(commentId, LocalChangeType.add, comment.updatedAt)
    );
  });

  it('should delete a comment', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const commentId = commentsService.addComment(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    commentsService.deleteComment(commentId);
    expect(fetchCommentsQuery.getResults({ itemId: docId })).toHaveLength(0);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should sort by createdAt by default', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    {
      const { result, unmount } = renderHook(() => useCommentSort(docId));
      expect(result.current).toEqual({
        by: 'createdAt',
        descending: false
      });
      unmount();
    }
  });

  it('should sort by order on demand', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    commentsService.setCommentSort(docId, {
      by: 'order',
      descending: false
    });
    {
      const { result, unmount } = renderHook(() => useCommentSort(docId), {
        wrapper: TinybaseProvider
      });
      expect(result.current).toEqual({
        by: 'order',
        descending: false
      });
      unmount();
    }
  });

  it('should reorder comments', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId);
    const comment2 = commentsService.addComment(docId);
    const comment3 = commentsService.addComment(docId);
    const comment4 = commentsService.addComment(docId);
    const comment5 = commentsService.addComment(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    let results = fetchCommentsQuery.getResults(
      { itemId: docId },
      'order',
      false
    );
    expect(results.map(r => r.id)).toEqual([
      comment1,
      comment2,
      comment3,
      comment4,
      comment5
    ]);

    commentsService.reorderComments(results, 2, 1);

    results = fetchCommentsQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([
      comment1,
      comment3,
      comment2,
      comment4,
      comment5
    ]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    vi.advanceTimersByTime(100);

    commentsService.reorderComments(results, 3, 4);

    results = fetchCommentsQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([
      comment1,
      comment3,
      comment2,
      comment5,
      comment4
    ]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should reorder new comments', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const comment1 = commentsService.addComment(docId);
    const comment2 = commentsService.addComment(docId);
    const comment3 = commentsService.addComment(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    let results = fetchCommentsQuery.getResults(
      { itemId: docId },
      'order',
      false
    );
    commentsService.reorderComments(results, 2, 1);

    results = fetchCommentsQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([comment1, comment3, comment2]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    vi.advanceTimersByTime(100);

    // now add new comments!
    const comment4 = commentsService.addComment(docId);
    const comment5 = commentsService.addComment(docId);
    results = fetchCommentsQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([
      comment4,
      comment5,
      comment1,
      comment3,
      comment2
    ]);
    expect(results.map(r => r.order)).toEqual([-1, -1, 0, 1, 2]);

    commentsService.reorderComments(results, 0, 3);

    results = fetchCommentsQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([
      comment5,
      comment1,
      comment3,
      comment4,
      comment2
    ]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should add comments with correct order anyway', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    function getResults() {
      return fetchCommentsQuery.getResults({ itemId: docId }, 'order', false);
    }
    let results = getResults();
    const comment1 = commentsService.addComment(docId, results.length);
    results = getResults();
    const comment2 = commentsService.addComment(docId, results.length);
    results = getResults();
    const comment3 = commentsService.addComment(docId, results.length);
    results = getResults();
    const comment4 = commentsService.addComment(docId, results.length);
    results = getResults();
    const comment5 = commentsService.addComment(docId, results.length);
    vi.advanceTimersByTime(100);

    results = getResults();
    expect(results.map(r => r.id)).toEqual([
      comment1,
      comment2,
      comment3,
      comment4,
      comment5
    ]);

    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
  });
});
