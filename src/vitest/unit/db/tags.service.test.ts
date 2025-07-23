import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/localChanges.service';
import tagsService from '@/db/tags.service';
import { it } from 'vitest';

describe('tags service', () => {
  it('should do nothing if there are no tags', () => {
    tagsService.reBuildTags();
    expect(tagsService.getTags()).toStrictEqual([]);
  });

  it('should create an internal map of tags', () => {
    const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    tagsService.addItemTag(id1, 'tag11');
    tagsService.addItemTag(id1, 'tag12');
    tagsService.addItemTag(id1, 'tag13');

    const id2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    tagsService.addItemTag(id2, 'tag21');
    tagsService.addItemTag(id2, 'tag12');

    const id3 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    tagsService.addItemTag(id3, 'tag31');

    collectionService.addFolder(DEFAULT_NOTEBOOK_ID);

    expect(tagsService.getTags()).toStrictEqual([
      'tag11',
      'tag12',
      'tag13',
      'tag21',
      'tag31'
    ]);

    expect(tagsService.getItemsPerTag('tag11')).toStrictEqual([id1]);
    expect(tagsService.getItemsPerTag('tag12')).toStrictEqual([id1, id2]);
    expect(tagsService.getItemsPerTag('tag13')).toStrictEqual([id1]);
    expect(tagsService.getItemsPerTag('tag21')).toStrictEqual([id2]);
    expect(tagsService.getItemsPerTag('tag31')).toStrictEqual([id3]);
  });

  it('should rename a tag globally', () => {
    const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    tagsService.addItemTag(id1, 'tag1');
    tagsService.addItemTag(id1, 'tag2');
    const id2 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    tagsService.addItemTag(id2, 'tag2');
    tagsService.addItemTag(id2, 'tag3');
    localChangesService.clear();

    tagsService.renameTag('tag2', 'tag4');

    expect([...collectionService.getItemTags(id1)]).toStrictEqual([
      'tag1',
      'tag4'
    ]);
    expect([...collectionService.getItemTags(id2)]).toStrictEqual([
      'tag3',
      'tag4'
    ]);

    expect(tagsService.getItemsPerTag('tag1')).toStrictEqual([id1]);
    expect(tagsService.getItemsPerTag('tag2')).toStrictEqual([]);
    expect(tagsService.getItemsPerTag('tag3')).toStrictEqual([id2]);
    expect(tagsService.getItemsPerTag('tag4')).toStrictEqual([id1, id2]);

    expect(localChangesService.getLocalChanges()).toHaveLength(2);
  });

  it(`should do nothing on rename tag if tag doesn't exist`, () => {
    const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    tagsService.addItemTag(id1, 'tag1');
    tagsService.addItemTag(id1, 'tag2');
    const id2 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    tagsService.addItemTag(id2, 'tag2');
    tagsService.addItemTag(id2, 'tag3');

    tagsService.renameTag('tag60', 'tag40');

    expect([...collectionService.getItemTags(id1)]).toStrictEqual([
      'tag1',
      'tag2'
    ]);
    expect([...collectionService.getItemTags(id2)]).toStrictEqual([
      'tag2',
      'tag3'
    ]);

    expect(tagsService.getItemsPerTag('tag1')).toStrictEqual([id1]);
    expect(tagsService.getItemsPerTag('tag2')).toStrictEqual([id1, id2]);
    expect(tagsService.getItemsPerTag('tag3')).toStrictEqual([id2]);
  });
});
