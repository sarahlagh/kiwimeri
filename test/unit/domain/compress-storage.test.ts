import {
  minimizeAnnotForStorage,
  unminimizeAnnotFromStorage
} from '@/domain/collection/compress-annotations';
import {
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/domain/collection/compress-collection';
import {
  oneDocument,
  oneFolder,
  oneNote,
  oneNotebook
} from '@@/_setup/test.utils';
import { describe, expect, it } from 'vitest';

describe('collection item compression', () => {
  [
    {
      name: 'empty array',
      data: []
    },
    {
      name: 'array of items',
      data: [oneDocument(), oneFolder(), oneNotebook()]
    },
    {
      name: 'items with tags',
      data: [{ ...oneDocument(), tags: ['tag1', 'tag2'] }]
    }
  ].forEach(({ data, name }) => {
    it(`should minimize then restore ${name}`, () => {
      const minimized = minimizeItemsForStorage(data);
      console.log('minimized json', minimized);
      if (data.length > 0) {
        expect(minimized[0].p).toBe(data[0].parentId);
      }

      const restored = unminimizeItemsFromStorage(minimized);
      expect(restored).toStrictEqual(data);
    });
  });
});

describe('annot compression', () => {
  [
    {
      name: 'empty array',
      data: []
    },
    {
      name: 'array of annots',
      data: [oneNote('1')]
    }
  ].forEach(({ data, name }) => {
    it(`should minimize then restore ${name}`, () => {
      const minimized = minimizeAnnotForStorage(data);
      console.log('minimized json', minimized);
      if (data.length > 0) {
        expect(minimized[0].p).toBe(data[0].parentId);
      }

      const restored = unminimizeAnnotFromStorage(minimized);
      expect(restored).toStrictEqual(data);
    });
  });
});
