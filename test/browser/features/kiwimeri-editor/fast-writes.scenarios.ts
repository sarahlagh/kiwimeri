import { $createLinkNode, AutoLinkNode } from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode
} from '@lexical/list';
import { $createHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $createHeadingNode,
  $createQuoteNode,
  QuoteNode
} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isLineBreakNode,
  ElementNode,
  RootNode
} from 'lexical';

export type FastWriteScenario = {
  initial: string;
  next: string;
  desc: string;
  mutate: ((root: RootNode) => void)[];
  isFullSnapshot?: number;
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
        root.append(paragraph);
      },
      root => {
        const paragraph = root.getChildAtIndex(1) as ElementNode;
        const text = $createTextNode('line 2');
        paragraph?.append(text);
      }
    ]
  },
  {
    initial: 'line 1',
    next: 'line 1\n\nline 2',
    desc: 'add paragraph as one mutation',
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
    isFullSnapshot: 0,
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
  },
  {
    initial: 'line1',
    next: 'line1\nline2',
    desc: 'add linebreak',
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const linebreak = $createLineBreakNode();
        paragraph.append(linebreak);
      },
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        paragraph.append($createTextNode('line2'));
      }
    ]
  }
];

const headingTests: FastWriteScenario[] = [
  {
    initial: 'header',
    next: '# header',
    desc: 'turn paragraph into heading',
    isFullSnapshot: 0, // TODO could optimize here
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
    desc: 'turn heading into paragraph',
    isFullSnapshot: 0, // TODO could optimize here
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
    isFullSnapshot: 0,
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
    isFullSnapshot: 0,
    mutate: [
      root => {
        const hrule = root.getChildAtIndex(1);
        hrule?.remove();
      }
    ]
  }
];

const listsTests: FastWriteScenario[] = [
  {
    initial: 'item',
    next: '- item',
    desc: 'turn paragraph into list',
    isFullSnapshot: 0, // TODO could optimize here
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const list = $createListNode('bullet');
        const listitem = $createListItemNode();
        list.append(listitem);
        paragraph?.getChildren().forEach(node => {
          listitem.append(node);
        });
        paragraph.replace(list);
      }
    ]
  },
  {
    initial: '- item',
    next: 'item',
    desc: 'turn list into paragraph',
    isFullSnapshot: 0, // TODO could optimize here
    mutate: [
      root => {
        const list = root.getFirstChildOrThrow() as ElementNode;
        const paragraph = $createParagraphNode();
        list?.getAllTextNodes().forEach(node => {
          paragraph.append(node);
        });
        list.replace(paragraph);
      }
    ]
  },
  {
    initial: 'text',
    next: 'text\n\n- item',
    desc: 'add list',
    mutate: [
      root => {
        const list = $createListNode('bullet');
        const listitem = $createListItemNode();
        list.append(listitem);
        root.append(list);
      },
      root => {
        const list = root.getChildAtIndex(1) as ListNode;
        const listitem = list.getChildAtIndex(0) as ListItemNode;
        listitem.append($createTextNode('item'));
      }
    ]
  },
  {
    initial: 'text',
    next: 'text\n\n- item',
    desc: 'add list as one mutation',
    mutate: [
      root => {
        const list = $createListNode('bullet');
        const listitem = $createListItemNode();
        listitem.append($createTextNode('item'));
        list.append(listitem);
        root.append(list);
      }
    ]
  },
  {
    initial: '- item',
    next: '- item\n- item',
    desc: 'add listitem into list',
    mutate: [
      root => {
        const list = root.getFirstChildOrThrow() as ListNode;
        const listitem = $createListItemNode();
        list.append(listitem);
      },
      root => {
        const list = root.getFirstChildOrThrow() as ListNode;
        const listitem = list.getChildAtIndex(1)! as ListItemNode;
        listitem.append($createTextNode('item'));
      }
    ]
  },
  {
    initial: '- item1\n- item3',
    next: '- item1\n- item2\n- item3',
    desc: 'insert listitem in list',
    mutate: [
      root => {
        const list = root.getFirstChildOrThrow() as ListNode;
        const listitem = $createListItemNode();
        list.getChildAtIndex(0)!.insertAfter(listitem);
      },
      root => {
        const list = root.getFirstChildOrThrow() as ListNode;
        const listitem = list.getChildAtIndex(1)! as ListItemNode;
        listitem.append($createTextNode('item2'));
      }
    ]
  },
  {
    initial: '- item1\n- item2\n\ntext',
    next: 'text',
    desc: 'remove list',
    isFullSnapshot: 0,
    mutate: [
      root => {
        const list = root.getFirstChildOrThrow() as ListNode;
        list.remove();
      }
    ]
  }
];

const quotesTests: FastWriteScenario[] = [
  {
    initial: 'item',
    next: '> item',
    desc: 'turn paragraph into quote',
    isFullSnapshot: 0, // TODO could optimize here
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const quote = $createQuoteNode();
        paragraph?.getChildren().forEach(node => {
          quote.append(node);
        });
        paragraph.replace(quote);
      }
    ]
  },
  {
    initial: 'item1\nitem2',
    next: '> item1\n> item2',
    desc: 'turn multiline paragraph into quote',
    isFullSnapshot: 0, // TODO could optimize here
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const quotes: ElementNode[] = [];
        paragraph?.getChildren().forEach(node => {
          if ($isLineBreakNode(node)) return;
          const quote = $createQuoteNode();
          quote.append(node);
          quotes.push(quote);
        });
        paragraph.replace(quotes[0]);
        quotes[0].insertAfter(quotes[1]);
      }
    ]
  },
  {
    initial: '> item',
    next: 'item',
    desc: 'turn quote into paragraph',
    isFullSnapshot: 0, // TODO could optimize here
    mutate: [
      root => {
        const quote = root.getFirstChildOrThrow() as ElementNode;
        const paragraph = $createParagraphNode();
        quote?.getChildren().forEach(node => {
          paragraph.append(node);
        });
        quote.replace(paragraph);
      }
    ]
  },
  {
    initial: '> item1',
    next: '> item1\n  item2',
    desc: 'insert linebreak in quote',
    mutate: [
      root => {
        const quote = root.getFirstChildOrThrow() as ElementNode;
        quote.append($createLineBreakNode());
      },
      root => {
        const quote = root.getFirstChildOrThrow() as ElementNode;
        quote.append($createTextNode('item2'));
      }
    ]
  },
  {
    initial: '> item1',
    next: '> item1\n> item2',
    desc: 'insert new quote line',
    mutate: [
      root => {
        const quote = $createQuoteNode();
        quote.append($createTextNode('item2'));
        root.append(quote);
      }
    ]
  },
  {
    initial: '> item1\n> item2\n> item3',
    next: '> item1\n> item3',
    desc: 'remove quote line',
    isFullSnapshot: 0,
    mutate: [
      root => {
        const quote = root.getChildAtIndex(1) as QuoteNode;
        quote.remove();
      }
    ]
  },
  {
    initial: '> item1\n  item2\n  item3',
    next: '> item1\n  item3',
    desc: 'remove quote linebreak',
    mutate: [
      root => {
        const quote = root.getChildAtIndex(0) as QuoteNode;
        const linebreak = quote.getChildAtIndex(1);
        const text = quote.getChildAtIndex(2);
        text?.remove();
        linebreak?.remove();
      }
    ]
  }
];

// TODO
const linksTests: FastWriteScenario[] = [
  {
    initial: 'link',
    next: '[link](https://example.com)',
    desc: 'turn paragraph into link',
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const text = paragraph.getFirstChildOrThrow();

        const link = $createLinkNode('https://example.com', {
          rel: 'noreferrer'
        });
        text.replace(link);
        link.append(text);
      }
    ]
  },
  {
    initial: 'hello ',
    next: 'hello [link](https://example.com)',
    desc: 'add link',
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const link = $createLinkNode('https://example.com', {
          rel: 'noreferrer'
        });
        link.append($createTextNode('link'));
        paragraph.append(link);
      }
    ]
  },
  {
    initial: '<https://example.com>',
    next: 'https://example.com',
    desc: 'set isUnlinked=true to autolink',
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const link = paragraph.getFirstChildOrThrow() as AutoLinkNode;
        link.setIsUnlinked(true);
      }
    ]
  },
  {
    initial: 'https://example.com',
    next: '<https://example.com>',
    desc: 'set isUnlinked=false to autolink',
    mutate: [
      root => {
        const paragraph = root.getFirstChildOrThrow() as ElementNode;
        const link = paragraph.getFirstChildOrThrow() as AutoLinkNode;
        link.setIsUnlinked(false);
      }
    ]
  }
  // {
  //   initial: 'hello ',
  //   next: 'hello <https://example.com>',
  //   desc: 'add autolink',
  //   mutate: [
  //     root => {
  //       const paragraph = root.getFirstChildOrThrow() as ElementNode;
  //       const link = $createAutoLinkNode('https://example.com', {
  //         rel: 'noreferrer'
  //       });
  //       // link.append($createTextNode('link'));
  //       paragraph.append(link);
  //     }
  //   ]
  // }
];

const textAlignTests: FastWriteScenario[] = [];
const multipleMutationsTests: FastWriteScenario[] = [];

export const fastWriteScenarios: FastWriteScenario[] = [
  {
    initial: 'test',
    next: 'test',
    desc: 'nothing scenario',
    mutate: [() => {}]
  },
  ...paragraphTests,
  ...headingTests,
  ...hruleTests,
  ...listsTests,
  ...quotesTests,
  ...linksTests,
  ...textAlignTests,
  ...multipleMutationsTests
];
