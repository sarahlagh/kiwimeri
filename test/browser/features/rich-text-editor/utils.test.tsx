import formatConverter from '@/domain/format-conversion/format-converter.service';
import { $getSelection, $isRangeSelection, PointType } from 'lexical';
import { describe, expect, test } from 'vitest';
import {
  getContentEditorElement,
  getToggleReadModeBtn
} from './RichTextEditor.locators';
import { clickOnEditor, renderEditor } from './utils';

// only test the clickOnEditor method
describe('clickOnEditor', () => {
  const initialState = formatConverter.fromMarkdown(
    'hello **world** with <u>formats</u>\n\n' +
      '# heading\n\n' +
      '[hello](https://lexical.dev/ "hello") world with links https://github.com\n\n' +
      '<p style="text-align: center;">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>\n\n' +
      '- with a list\n' +
      '- of *course*\n\n' +
      '> and a quote\n' +
      '> second ~~row~~'
  ).obj!;

  type Scenario = {
    skip?: boolean;
    desc: string;
    line: number;
    offset: number;
    expected: {
      offset: number;
      textContent?: string;
      wordUnderCursor?: string;
    };
  };
  const scenarios: Scenario[] = [
    {
      desc: 'w in first line',
      line: 1,
      offset: 7,
      expected: { offset: 1, textContent: 'world' }
    },
    {
      desc: 'r in first line',
      line: 1,
      offset: 20,
      expected: { offset: 3, textContent: 'formats' }
    },
    {
      desc: 'd in second line (heading)',
      line: 2,
      offset: 4,
      expected: { offset: 4, textContent: 'heading' }
    },
    {
      desc: 'l in third line (link)',
      line: 3,
      offset: 3,
      expected: { offset: 3, textContent: 'hello' }
    },
    {
      desc: 's in third line (link)',
      line: 3,
      offset: 22,
      expected: {
        offset: 17,
        textContent: ' world with links '
      }
    },
    {
      desc: 't in third line (link)',
      line: 3,
      offset: 26,
      expected: {
        offset: 3,
        textContent: 'https://github.com'
      }
    },
    {
      desc: 'somewhere in fourth line (centered)',
      line: 4,
      offset: 583,
      expected: {
        offset: 583,
        wordUnderCursor: 'minima '
      }
    },
    {
      desc: 'somewhere else in fourth line (centered)',
      line: 4,
      offset: 784,
      expected: {
        offset: 784,
        wordUnderCursor: 'molestiae '
      }
    },
    {
      desc: 'on first list item',
      line: 5,
      offset: 6,
      expected: {
        offset: 6,
        textContent: 'with a list'
      }
    },
    {
      desc: 'on second list item',
      line: 5,
      offset: 17,
      expected: {
        offset: 3,
        textContent: 'course'
      }
    },
    {
      desc: 'd in first row of quote',
      line: 6,
      offset: 3,
      expected: {
        offset: 3,
        textContent: 'and a quote'
      }
    },
    {
      desc: 'c in second row of quote',
      line: 7,
      offset: 3,
      expected: {
        offset: 3,
        textContent: 'second '
      }
    }
  ];

  const debugScenarios: Omit<Scenario, 'expected'>[] = [
    ...scenarios,
    {
      desc: 'd in quote',
      line: 5,
      offset: 3
    }
  ];

  function getWordUnderCursor(point: PointType) {
    const textContent = point.getNode().getTextContent();
    const whitespaceBefore =
      textContent.substring(0, point.offset).lastIndexOf(' ') + 1;
    let whitespaceAfter = textContent.substring(point.offset).indexOf(' ') + 1;
    if (whitespaceAfter === 0) whitespaceAfter = textContent.length - 1;
    const wordUnderCursor = textContent.substring(
      whitespaceBefore,
      point.offset + whitespaceAfter
    );
    return wordUnderCursor;
  }

  scenarios.forEach(({ desc, line, offset: char, expected, skip }) => {
    if (skip === true) return;
    test(`${desc}`, async () => {
      const screen = await renderEditor({
        initialState
      });
      const editor = screen.getLexicalEditor();

      await clickOnEditor(screen, line, char);
      editor.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        const points = selection!.getStartEndPoints()!;
        expect(points[0].is(points[1])).toBe(true);
        expect(points[0].offset).toBe(expected.offset);
        if (expected.textContent) {
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(points[0].getNode().getTextContent()).toBe(
            expected.textContent
          );
        }
        if (expected.wordUnderCursor) {
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(getWordUnderCursor(points[0])).toBe(expected.wordUnderCursor);
        }
      });
    });
  });

  const { line, offset: char } = debugScenarios[scenarios.length + 0];
  // eslint-disable-next-line vitest/no-disabled-tests
  test.skip(`debug scenario`, async () => {
    const screen = await renderEditor({
      initialState
    });
    const editor = screen.getLexicalEditor();

    await clickOnEditor(screen, line, char);
    getContentEditorElement(screen).addEventListener('click', event => {
      console.debug('clicked', event.clientX, event.clientY);
      editor.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const points = selection.getStartEndPoints();
          console.debug('point', points[0].offset);
          const wordUnderCursor = getWordUnderCursor(points[0]);
          console.debug('word under cursor', `'${wordUnderCursor}'`);
        }
      });
    });

    // always false to give time to click
    await expect
      .element(getToggleReadModeBtn(screen), { timeout: 10000000000 })
      .toHaveClass('active');
  });
  // });
});
