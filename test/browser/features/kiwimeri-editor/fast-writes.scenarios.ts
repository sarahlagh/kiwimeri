import { $createHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { $createHeadingNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  ElementNode,
  LexicalEditor,
  RootNode
} from 'lexical';

export type FastWriteScenario = {
  initial: string;
  next: string;
  desc: string;
  mutate: ((root: RootNode, editor: LexicalEditor) => void)[];
  isFullSnapshot?: boolean;
};

const paragraphTests: FastWriteScenario[] = [
  {
    initial: 'test',
    next: 'test 1',
    desc: 'insert text',
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        paragraph.clear().append($createTextNode('test 1'));
      }
    ]
  },
  {
    initial: 'line 1',
    next: 'line 1\n\nline 2',
    desc: 'add paragraph',
    mutate: [
      root => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('line 2');
        paragraph.append(text);
        root.append(paragraph);
      }
    ]
  },
  {
    initial: 'line 1\n\nline2',
    next: 'line 1',
    desc: 'remove paragraph',
    isFullSnapshot: true,
    mutate: [
      root => {
        const paragraph = root.getChildAtIndex(1);
        paragraph?.remove();
      }
    ]
  },
  {
    initial: 'line **with bold** leaf',
    next: 'line  leaf',
    desc: 'remove leaf inside paragraph',
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const bold = paragraph.getChildAtIndex(1);
        bold?.remove();
      }
    ]
  }
];

const headingTests: FastWriteScenario[] = [
  {
    initial: 'header',
    next: '# header',
    desc: 'turn paragraph to heading',
    isFullSnapshot: true, // TODO could optimize here
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const heading = $createHeadingNode('h1');
        // Move existing content rather than recreating text.
        paragraph?.getChildren().forEach(node => {
          heading.append(node);
        });
        paragraph.replace(heading);
      }
    ]
  },
  {
    initial: '# header\n\ntext',
    next: 'header\n\ntext',
    desc: 'turn heading to paragraph',
    isFullSnapshot: true, // TODO could optimize here
    mutate: [
      root => {
        const heading = root.getFirstChildOrThrow() as ElementNode;
        const paragraph = $createParagraphNode();
        // Move existing content rather than recreating text.
        heading?.getChildren().forEach(node => {
          paragraph.append(node);
        });
        heading.replace(paragraph);
      }
    ]
  },
  {
    initial: '# header\n\ntext',
    next: 'text',
    desc: 'remove heading',
    isFullSnapshot: true,
    mutate: [
      root => {
        const heading = root.getFirstChildOrThrow() as ElementNode;
        heading.remove();
      }
    ]
  }
];

const hruleTests: FastWriteScenario[] = [
  {
    initial: 'test',
    next: 'test\n\n---\n\n',
    desc: 'add horizontal rule',
    mutate: [
      root => {
        root.append($createHorizontalRuleNode());
      }
    ]
  },
  {
    initial: 'test\n\n---\n\n',
    next: 'test',
    desc: 'remove horizontal rule',
    isFullSnapshot: true,
    mutate: [
      root => {
        const hrule = root.getChildAtIndex(1);
        hrule?.remove();
      }
    ]
  }
];

// TODO lists
// TODO quotes
// TODO links
// TODO text align?
// TODO multiple mutations

export const fastWriteScenarios: FastWriteScenario[] = [
  {
    initial: 'test',
    next: 'test',
    desc: 'nothing scenario',
    mutate: [() => {}]
  },
  ...paragraphTests,
  ...headingTests,
  ...hruleTests
];
