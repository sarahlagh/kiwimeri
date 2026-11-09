import { SelectionContext } from '@/features/rich-text-editor/extensions/SelectionContextExtension';
import { fromSimpleHTML } from '@@/_setup/test.utils';
import { describe, expect, test } from 'vitest';
import { clickOnEditor, getSelectionContext, renderEditor } from './utils';

const initialState = fromSimpleHTML(
  '<p>hello <b>world</b> with <u>formats</u></p>' +
    '<h1>heading!</h1>' +
    '<p><a href="https://lexical.dev/" title="hello">hel<i>lo</i></a> world with links <autolink unlinked>https://gith<i>ub</i>.com</autolink>, end</p>' +
    '<p style="text-align: center;">Sed ut perspiciatis unde omnis iste natus error. sit volup<i>tat</i>em, accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia conseq<b>uun</b>tur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>' +
    '<ul>' +
    '<li>with a list</li>' +
    '<li>of <i>course</i></li>' +
    '</ul>' +
    '<blockquote>and a quote</blockquote>' +
    '<blockquote>second <strike>row</strike></blockquote>'
).obj!;

describe('SelectionContextExtension', () => {
  type Scenario = {
    skip?: boolean;
    desc: string;
    line: number;
    offset: number;
  } & Partial<SelectionContext>;

  const firstBlock: Scenario[] = [
    {
      desc: 'hello(0) in first line',
      line: 1,
      offset: 0,
      wordUnderCursor: [0, 5, 'hello']
    },
    {
      desc: 'hello(1) in first line',
      line: 1,
      offset: 1,
      wordUnderCursor: [0, 5, 'hello']
    },
    {
      desc: 'hello(5) in first line',
      line: 1,
      offset: 5,
      wordUnderCursor: [0, 5, 'hello']
    },
    {
      desc: 'world in first line',
      line: 1,
      offset: 7,
      wordUnderCursor: [0, 5, 'world']
    },
    {
      desc: 'with in first line',
      line: 1,
      offset: 14,
      wordUnderCursor: [1, 5, 'with']
    },
    {
      desc: 'formats in first line',
      line: 1,
      offset: 20,
      wordUnderCursor: [0, 7, 'formats']
    }
  ];
  const secondBlock: Scenario[] = [
    {
      desc: 'heading in second line',
      line: 2,
      offset: 3,
      wordUnderCursor: [0, 7, 'heading']
    }
  ];
  const thirdBlock: Scenario[] = [
    {
      desc: '[hel]lo in third line',
      line: 3,
      offset: 1,
      wordUnderCursor: [0, 3, 'hel']
    },
    {
      desc: 'links in third line',
      line: 3,
      offset: 17,
      wordUnderCursor: [12, 17, 'links']
    },
    {
      desc: 'https in third line',
      line: 3,
      offset: 24,
      wordUnderCursor: [0, 5, 'https']
    },
    {
      desc: '// in third line',
      line: 3,
      offset: 30,
      wordUnderCursor: undefined
    },
    {
      desc: '[gith]ub in third line',
      line: 3,
      offset: 32,
      wordUnderCursor: [8, 12, 'gith']
    },
    {
      desc: 'gith[ub] in third line',
      line: 3,
      offset: 36,
      wordUnderCursor: [0, 2, 'ub']
    },
    {
      desc: ', in third line',
      line: 3,
      offset: 42,
      wordUnderCursor: undefined
    },
    {
      desc: 'end in third line',
      line: 3,
      offset: 44,
      wordUnderCursor: [2, 5, 'end']
    }
  ];
  const fourthBlock: Scenario[] = [
    {
      desc: '1st perspiciatis in fourth line',
      line: 4,
      offset: 9,
      wordUnderCursor: [7, 19, 'perspiciatis']
    },
    {
      desc: 'after . in fourth line',
      line: 4,
      offset: 48,
      wordUnderCursor: undefined
    },
    {
      desc: 'volup[tat]em in fourth line',
      line: 4,
      offset: 59,
      wordUnderCursor: [0, 3, 'tat']
    },
    {
      desc: 'accusantium in fourth line',
      line: 4,
      offset: 65,
      wordUnderCursor: [4, 15, 'accusantium']
    }
  ];
  const fifthBlock: Scenario[] = [
    {
      desc: 'with on first list item',
      line: 5,
      offset: 0,
      wordUnderCursor: [0, 4, 'with']
    },
    {
      desc: 'course on second list item',
      line: 5,
      offset: 15,
      wordUnderCursor: [0, 6, 'course']
    }
  ];
  const sixthAndSeventhBlock: Scenario[] = [
    {
      desc: 'a(0) in first row of quote',
      line: 6,
      offset: 4,
      wordUnderCursor: [4, 5, 'a']
    },
    {
      desc: 'a(1) in first row of quote',
      line: 6,
      offset: 5,
      wordUnderCursor: [4, 5, 'a']
    },
    {
      desc: 'row in second row of quote',
      line: 7,
      offset: 8,
      wordUnderCursor: [0, 3, 'row']
    }
  ];

  const scenarios: Scenario[] = [
    ...firstBlock,
    ...secondBlock,
    ...thirdBlock,
    ...fourthBlock,
    ...fifthBlock, // list
    ...sixthAndSeventhBlock // quote
  ];

  scenarios.forEach(({ desc, line, offset: char, wordUnderCursor, skip }) => {
    if (skip === true) return;
    test(`${desc}`, async () => {
      const screen = await renderEditor({
        initialState
      });
      const editor = screen.getLexicalEditor();

      await clickOnEditor(screen, line, char);

      const selectionContext = getSelectionContext(editor);
      expect(selectionContext.wordUnderCursor).toEqual(wordUnderCursor);
    });
  });
});
