import {
  CollectionItem,
  CollectionItemDisplayOpts,
  CollectionItemType,
  setFieldMeta
} from '@/collection/collection';
import {
  minimizeContentForStorage,
  unminimizeContentFromStorage
} from '@/common/wysiwyg/compress-file-content';
import { space } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService, {
  INITIAL_CONTENT_START
} from '@/db/collection.service';
import userSettingsService from '@/db/user-settings.service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { DocAnnotationRow } from '@/domain/document-annotations/model';
import { statsService } from '@/domain/stats/stats-service';
import { PLAIN_TEXT_FORMATTER } from '@/format-conversion/lex-conversion/formatters/plain-text-formatter';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';

class PageMigrationService {
  public explodeToDocuments(
    docId: string,
    createNewGroup: boolean,
    useHeadings: boolean
  ) {
    const pages = collectionService.getDocumentPages(docId, {
      by: 'order',
      descending: false
    });
    if (pages.length === 0) return;
    let parent = collectionService.getItemParent(docId);

    if (createNewGroup) {
      const title = collectionService.getItemTitle(docId);
      let opts: CollectionItemDisplayOpts = {
        sort: {
          by: 'order',
          descending: false
        },
        statsEnabled: userSettingsService.getDefaultDisplayOpts().statsEnabled
      };

      // if document had sort, use it
      const str = space.getCell('collection', docId, 'display_opts');
      if (str) {
        const itemOpts = this.parseDisplayOpts(str as string);
        if (itemOpts) {
          opts = itemOpts;
        }
      }

      const { item } = collectionService.getNewFolderObj(parent);
      item.title = title;
      item.display_opts = JSON.stringify(opts);
      item.display_opts_meta = setFieldMeta(item.display_opts, Date.now());
      parent = collectionService.saveItem(item);
      collectionService.setItemParent(docId, parent);
    }

    const title = collectionService.getItemTitle(docId);
    const now = Date.now();
    const newDocs: CollectionItem[] = [];
    pages.forEach((p, idx) => {
      const pageObj = collectionService.getItem(p.id);
      const newDoc = { ...pageObj };
      newDoc.type = CollectionItemType.document;
      newDoc.parent = parent;
      let pageTitle = `${title} (${idx + 1})`;
      if (useHeadings) {
        const resp = this.popHeading(pageObj.content);
        if (resp !== null && resp.heading.length > 0) {
          pageTitle = resp.heading;
          newDoc.content = resp.content;
          newDoc.content_meta = setFieldMeta(resp.content, now);
        }
      }
      newDoc.title = pageTitle;
      newDoc.title_meta = setFieldMeta(pageTitle, now);
      newDoc.order = idx + 1;
      newDocs.push(newDoc);
    });
    collectionService.saveItems(newDocs, parent, true);

    // update initial doc
    if (useHeadings) {
      // same for doc
      const resp = this.popHeading(
        space.getCell('collection', docId, 'content')
      );
      if (resp !== null && resp.heading.length > 0) {
        space.setPartialRow('collection', docId, {
          title: resp.heading,
          title_meta: setFieldMeta(resp.heading, now),
          content: resp.content,
          content_meta: setFieldMeta(resp.content, now)
        });
      }
    }

    space.setCell('collection', docId, 'order', 0);
    historyService.saveWholeDocumentVersion(docId, true);
    newDocs.forEach(doc => {
      historyService.saveWholeDocumentVersion(doc.id!, true);
    });
  }

  private popHeading(content?: string) {
    if (!content) return null;
    const unminimized = content.startsWith(INITIAL_CONTENT_START)
      ? content
      : unminimizeContentFromStorage(content);
    const editorState = JSON.parse(
      unminimized
    ) as SerializedEditorState<SerializedLexicalNode>;
    if (editorState.root.children && editorState.root.children.length > 0) {
      const firstBlock = editorState.root.children[0];
      if (firstBlock.type === 'heading') {
        // use heading as title
        const md = PLAIN_TEXT_FORMATTER.parseSimpleLexNode(
          editorState.root.children[0],
          { inline: true }
        ).trim();
        editorState.root.children.shift();
        return {
          heading: md,
          content: minimizeContentForStorage(editorState)
        };
      }
    }
    return null;
  }

  public explodeToNotes(docId: string) {
    const pages = collectionService.getDocumentPages(docId, {
      by: 'order',
      descending: false
    });
    if (pages.length === 0) return;
    const newNotes: DocAnnotationRow[] = [];
    pages.forEach(p => {
      const pageObj = collectionService.getItem(p.id);
      const item: DocAnnotationRow = {
        type: 'note',
        itemId: docId,
        content: pageObj.content as string,
        content_meta: pageObj.content_meta as string,
        createdAt: pageObj.created,
        updatedAt: pageObj.updated,
        plainText: searchAncestryService.getItemPreview(p.id),
        order: pageObj.order,
        order_meta: pageObj.order_meta
      };
      newNotes.push(item);
    });
    docAnnotationsService.saveNotes(docId, newNotes);
    // if document had sort, set noteSort
    const str = space.getCell('collection', docId, 'display_opts');
    if (str) {
      const itemOpts = this.parseDisplayOpts(str as string);
      if (
        itemOpts &&
        (itemOpts.sort.by === 'created' || itemOpts.sort.by === 'order')
      ) {
        itemOpts.documentSort = {
          by: itemOpts.sort.by === 'created' ? 'createdAt' : 'order',
          descending: itemOpts.sort.descending
        };
        collectionService.setItemDisplayOpts(docId, itemOpts);
      }
    }

    // cleanup
    const docVersions = historyService.getVersions(docId);
    space.transaction(() => {
      pages.forEach(p => {
        const stats = statsService.getDataPoints(p.id);
        space.delRow('stats', p.id);
        stats.forEach(dp => {
          const rowId = `${p.id}-${dp.date}`;
          space.delRow('stats', rowId);
        });
        historyService.hardDeleteVersions(p.id);
        space.delRow('collection', p.id);
        space.delRow('document_resume_state', p.id);
      });
      docVersions.forEach(v => {
        space.delCell('history', v.id, 'pageVersionsArrayJson');
      });
    });
    historyService.saveWholeDocumentVersion(docId, true);
  }

  private parseDisplayOpts(str: string | null) {
    const obj = str ? JSON.parse(str) : null;
    if (obj && 'sort' in obj) {
      return obj as CollectionItemDisplayOpts;
    }
    return null;
  }
}

export default new PageMigrationService();
