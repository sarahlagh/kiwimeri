import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { it, vi } from 'vitest';

describe('collection history service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchAncestryService.start(DEFAULT_SPACE_ID);
    historyService.start(DEFAULT_SPACE_ID);
    historyService['debounce'] = 50;
  });
  afterEach(() => {
    vi.useRealTimers();
    searchAncestryService.stop();
  });

  it(`should add document version`, () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const results = historyService.getVersions(docId);
    console.log('results', results);

    expect(results[0].versionData).toBeDefined();
    expect(results[0].versionPreview).toBeDefined();
  });

  it(`should add page version`, () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const pageId = collectionService.addPage(docId);

    let results = historyService.getVersions(pageId);
    console.log('results', results);
    expect(results[0].versionData).toBeDefined();
    expect(results[0].versionPreview).toBeDefined();
    expect(results[0].pageVersions).toBeUndefined();
    const pageVersionId = results[0].id;

    results = historyService.getVersions(docId);
    console.log('results', results);
    expect(results[0].versionData).toBeDefined();
    expect(results[0].versionPreview).toBeDefined();
    expect(results[0].pageVersions).toBeDefined();
    expect(results[0].pageVersions).toBe(JSON.stringify([pageVersionId]));
  });
});
