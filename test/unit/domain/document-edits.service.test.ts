import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import collectionService, {
  initialContent
} from '@/domain/collection/collection.service';
import { LexicalDiff } from '@/domain/document-edits/document-edits';
import { writer } from '@/domain/document-edits/document-edits.service';
import { ensurePersistentId } from '@/features/document-editor/wysiwyg-editor/lexical/block-state';
import { lexicalConfig } from '@/features/document-editor/wysiwyg-editor/lexical/lexical-config';
import { createHeadlessEditor } from '@lexical/headless';
import {
  EditorState,
  LexicalEditor,
  ParagraphNode,
  SerializedEditorState,
  SerializedLexicalNode
} from 'lexical';

const pId1 = 'ogTWaDysy5vMC_rm';
const pId2 = '9xVbfxtKZlMSGxMU';
let editor: LexicalEditor;
const singleParagraphRoot = JSON.stringify({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '3',
            type: 'text',
            version: 1
          }
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        $: {
          persistentId: pId1
        },
        textFormat: 0,
        textStyle: ''
      }
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1
  }
});

const twoParagraphsRoot = JSON.stringify({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '2',
            type: 'text',
            version: 1
          }
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        $: { persistentId: pId1 },
        textFormat: 0,
        textStyle: ''
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '3',
            type: 'text',
            version: 1
          }
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        $: { persistentId: pId2 },
        textFormat: 0,
        textStyle: ''
      }
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1
  }
});

class FakeState {
  constructor(private state: SerializedEditorState) {}
  toJSON() {
    return this.state;
  }
}

describe(`document fast-write edits service`, () => {
  beforeAll(() => {
    schedule['enabled'] = false;
    editor = createHeadlessEditor({
      nodes: lexicalConfig.nodes,
      onError: () => {}
    });
    editor.registerNodeTransform(ParagraphNode, node => {
      ensurePersistentId(node);
    });
  });

  describe('from single block paragraph', () => {
    beforeEach(() => {
      const state = editor.parseEditorState(singleParagraphRoot);
      editor.update(() => {
        editor.setEditorState(state);
      });
    });

    it('should edit a single paragraph node in-place', () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      editor.read(() => {
        const expected = JSON.parse(singleParagraphRoot);
        expected.root.children[0].children[0].text = '31';

        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          editor.getEditorState(),
          [
            {
              block: expected.root.children[0] as SerializedLexicalNode,
              idx: 0
            }
          ],
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });

    it('should add a single paragraph node at the end', () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      editor.read(() => {
        const expected = JSON.parse(singleParagraphRoot);
        const newParagraph = {
          children: [],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          $: { persistentId: 'zcTZ0pSmX4b688Gh' },
          textFormat: 0,
          textStyle: ''
        };
        expected.root.children.push(newParagraph);

        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          editor.getEditorState(),
          [
            {
              block: newParagraph,
              idx: 1
            },
            {
              block: {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: '3',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                $: { persistentId: pId1 },
                textFormat: 0,
                textStyle: ''
              },
              idx: 0
            }
          ] as any,
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });

    it('should insert a single paragraph node at the beginning', () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      editor.read(() => {
        const expected = JSON.parse(
          singleParagraphRoot
        ) as SerializedEditorState;
        const newParagraph = {
          children: [],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          $: { persistentId: 'zcTZ0pSmX4b688Gh' },
          textFormat: 0,
          textStyle: ''
        };
        expected.root.children.splice(0, 0, newParagraph);

        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          editor.getEditorState(),
          [
            {
              block: {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: '3',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                $: { persistentId: pId1 },
                textFormat: 0,
                textStyle: ''
              },
              idx: 1
            },
            {
              block: {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                $: { persistentId: 'zcTZ0pSmX4b688Gh' },
                textFormat: 0,
                textStyle: ''
              },
              idx: 0
            }
          ] as any,
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });
  });

  describe('from two blocks paragraph', () => {
    beforeEach(() => {
      const state = editor.parseEditorState(twoParagraphsRoot);
      editor.update(() => {
        editor.setEditorState(state);
      });
    });

    it('should edit a single paragraph node in-place', () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const expected = JSON.parse(twoParagraphsRoot);
      collectionService.setItemLexicalContent(docId, expected);
      editor.read(() => {
        expected.root.children[1].children[0].text = '31';

        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          editor.getEditorState(),
          [
            {
              block: {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: '31',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                $: {
                  persistentId: pId2
                },
                textFormat: 0,
                textStyle: ''
              },
              idx: 1
            }
          ] as any,
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });

    it('should delete a single paragraph - trigger full snapshot', () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const expected = JSON.parse(twoParagraphsRoot) as SerializedEditorState;
      collectionService.setItemLexicalContent(docId, expected);
      editor.read(() => {
        expected.root.children.pop();

        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          new FakeState(expected) as unknown as EditorState,
          [],
          true
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });
  });

  describe('with lists', () => {
    beforeEach(() => {
      const state = editor.parseEditorState(initialContent());
      editor.update(() => {
        editor.setEditorState(state);
      });
    });

    test('should turn a paragraph into a list block', () => {
      const edits: LexicalDiff[] = [
        {
          block: {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'paragraph',
                type: 'text',
                version: 1
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
            textFormat: 0,
            textStyle: ''
          } as SerializedLexicalNode,
          idx: 0
        },
        {
          block: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 1
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'list',
            version: 1,
            listType: 'bullet',
            start: 1,
            tag: 'ul'
          } as SerializedLexicalNode,
          idx: 0
        }
      ];

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const expected = JSON.parse(
        '{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"paragraph","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
      ) as SerializedEditorState;
      collectionService.setItemLexicalContent(docId, expected);
      editor.read(() => {
        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          new FakeState(expected) as unknown as EditorState,
          edits,
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });

    test('should add a listitem to a list block', () => {
      const edits: any[] = [
        {
          block: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 1
              },
              {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 2
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'list',
            version: 1,
            listType: 'bullet',
            start: 1,
            tag: 'ul'
          } as SerializedLexicalNode,
          idx: 0
        },
        {
          block: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 1
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'direction',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 2
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'list',
            version: 1,
            listType: 'bullet',
            start: 1,
            tag: 'ul'
          } as SerializedLexicalNode,
          idx: 0
        }
      ];

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const expected = JSON.parse(
        '{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"paragraph","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"direction","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":2}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
      ) as SerializedEditorState;
      collectionService.setItemLexicalContent(docId, expected);
      editor.read(() => {
        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          new FakeState(expected) as unknown as EditorState,
          edits,
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });

    test('should insert a listitem into a list block', () => {
      const edits: any[] = [
        {
          block: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 1
              },
              {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 2
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'direction',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 3
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'list',
            version: 1,
            listType: 'bullet',
            start: 1,
            tag: 'ul'
          },
          idx: 0
        },
        {
          block: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 1
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'normal',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 2
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'direction',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 3
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'list',
            version: 1,
            listType: 'bullet',
            start: 1,
            tag: 'ul'
          },
          idx: 0
        }
      ];

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const expected = JSON.parse(
        '{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"paragraph","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"normal","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":2},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"direction","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":3}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
      ) as SerializedEditorState;
      collectionService.setItemLexicalContent(docId, expected);
      editor.read(() => {
        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          new FakeState(expected) as unknown as EditorState,
          edits,
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });

    test('should remove listitems from a list block', () => {
      const edits: any[] = [
        {
          block: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 1
              },
              {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 2
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'direction',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 3
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'list',
            version: 1,
            listType: 'bullet',
            start: 1,
            tag: 'ul'
          },
          idx: 0
        },
        {
          block: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 1
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'normal',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 2
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'direction',
                    type: 'text',
                    version: 1
                  }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: 3
              }
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'list',
            version: 1,
            listType: 'bullet',
            start: 1,
            tag: 'ul'
          },
          idx: 0
        }
      ];

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const expected = JSON.parse(
        '{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"paragraph","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"normal","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":2},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"direction","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":3}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
      ) as SerializedEditorState;
      collectionService.setItemLexicalContent(docId, expected);
      editor.read(() => {
        writer.fastWrite(
          SpaceTables.Collection,
          docId,
          new FakeState(expected) as unknown as EditorState,
          edits,
          false
        );

        const content = writer.reconcile(SpaceTables.Collection, docId);

        expect(JSON.parse(content)).toEqual(expected);
      });
    });
  });
});
