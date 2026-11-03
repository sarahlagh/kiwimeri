import { CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY } from '@/features/document-editor/wysiwyg-editor/lexical-v2/extensions/SearchExtension';
import RichTextEditor from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditor';
import { RichTextEditorHandle } from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditorHandle';
import { fromSimpleHTML } from '@@/_setup/test.utils';
import { TestingProvider } from '@@/browser/TestingProvider';
import { createRef, RefObject, useState } from 'react';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
import { getContentEditorElement } from './RichTextEditor.locators';

const initialState = fromSimpleHTML(
  '<p>hello <b>world</b> with <u>formats</u></p>' +
    '<h1>heading</h1>' +
    '<p><a href="https://lexical.dev/" title="hello">hel<i>lo</i></a> world with links <autolink unlinked>https://gith<i>ub</i>.com</autolink></p>' +
    '<p style="text-align: center;">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>' +
    '<ul>' +
    '<li>with a list</li>' +
    '<li>of <i>course</i></li>' +
    '</ul>' +
    '<blockquote>and a quote</blockquote>' +
    '<blockquote>second <strike>row</strike></blockquote>'
).obj!;

const searchInputId = 'searchInput';

const ParentComponent = ({
  ref
}: {
  ref?: RefObject<RichTextEditorHandle | null>;
}) => {
  const [searchText, setSearchText] = useState<string>();
  return (
    <div>
      <input
        data-testid={searchInputId}
        onChange={e => {
          setSearchText(e.target.value);
        }}
      />
      <RichTextEditor
        initialState={initialState}
        enableDebugTree={false}
        ref={ref}
        searchText={searchText}
      />
    </div>
  );
};

async function renderParent() {
  const ref = createRef<RichTextEditorHandle>();
  const screen = await render(<ParentComponent ref={ref} />, {
    wrapper: TestingProvider
  });
  return {
    ...screen
  };
}

describe('SearchExtension', () => {
  test('do nothing if no searchText', async () => {
    const screen = await renderParent();

    await expect.element(screen.baseElement).toBeInTheDocument();
    const highlight = CSS.highlights.get(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY);
    expect(highlight).toBeUndefined();
  });

  test('do nothing if searchText has less than 2 characters', async () => {
    const screen = await renderParent();
    const searchInput = screen.getByTestId(searchInputId);
    await searchInput.fill('a');
    await expect.element(screen.baseElement).toBeInTheDocument();
    const highlight = CSS.highlights.get(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY);
    expect(highlight).toBeUndefined();
  });

  test('highlight updates if search input changes', async () => {
    const screen = await renderParent();
    await expect.element(screen.baseElement).toBeInTheDocument();
    expect(
      CSS.highlights.get(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY)
    ).toBeUndefined();
    await screen.getByTestId(searchInputId).fill('perspiciatis');
    expect(
      CSS.highlights.get(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY)
    ).toBeDefined();
  });

  test.todo('highlight updates if editor content changes', async () => {
    const screen = await renderParent();
    const searchInput = screen.getByTestId(searchInputId);
    await searchInput.fill('world');
    await expect.element(screen.baseElement).toBeInTheDocument();
    let highlight = CSS.highlights.get(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY);
    expect(highlight).toBeDefined();
    const lengthBefore = [...highlight!.entries()].length;

    await userEvent.fill(getContentEditorElement(screen), 'hello world');

    highlight = CSS.highlights.get(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY);
    expect(highlight).toBeDefined();
    expect([...highlight!.entries()].length).not.toBe(lengthBefore);
  });

  describe('search text', () => {
    type Scenario = {
      input: string;
      expectedRanges: { start: number; end: number }[];
    };
    const scenarios: Scenario[] = [
      {
        input: 'perspiciatis',
        expectedRanges: [{ start: 7, end: 19 }]
      },
      {
        input: 'hello world',
        expectedRanges: [
          { start: 0, end: 6 }, // 'hello '
          { start: 0, end: 5 }, // 'world'
          { start: 0, end: 3 }, // 'hel'
          { start: 0, end: 2 }, // 'lo'
          { start: 0, end: 6 } // ' world'
        ]
      },
      {
        input: 'th fo',
        expectedRanges: [
          { start: 3, end: 6 }, // 'th '
          { start: 0, end: 2 } // 'fo'
        ]
      },
      {
        input: 'github',
        expectedRanges: [
          { start: 8, end: 12 }, // 'gith'
          { start: 0, end: 2 } // 'ub'
        ]
      },
      {
        input: 'explicabo. Nemo enim ipsam',
        expectedRanges: [{ start: 205, end: 231 }]
      },
      {
        input: 'dolorem',
        expectedRanges: [
          { start: 75, end: 82 },
          { start: 401, end: 408 },
          { start: 818, end: 825 }
        ]
      },
      {
        input: 'mats hea',
        expectedRanges: [
          { start: 3, end: 7 },
          { start: 0, end: 3 }
        ]
      },
      {
        input: 'mats hea',
        expectedRanges: [
          { start: 3, end: 7 },
          { start: 0, end: 3 }
        ]
      },
      {
        input: 'list of course and a quote second',
        expectedRanges: [
          { start: 7, end: 11 }, // 'list'
          { start: 0, end: 3 }, // 'of '
          { start: 0, end: 6 }, // 'course'
          { start: 0, end: 11 }, // 'and a quote'
          { start: 0, end: 6 } // 'second'
        ]
      }
    ];

    scenarios.forEach(({ input, expectedRanges }) => {
      test(`highlight words if searchText has at least 2 characters: ${input}`, async () => {
        const screen = await renderParent();
        const searchInput = screen.getByTestId(searchInputId);
        await searchInput.fill(input);
        await expect.element(screen.baseElement).toBeInTheDocument();
        const highlight = CSS.highlights.get(
          CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY
        );
        expect(highlight).toBeDefined();
        const entries = [...highlight!.entries()];
        expect(entries).toHaveLength(expectedRanges.length);
        for (let i = 0; i < expectedRanges.length; i++) {
          expect(entries[i][0].startOffset).toBe(expectedRanges[i].start);
          expect(entries[i][0].endOffset).toBe(expectedRanges[i].end);
        }
      });
    });
  });
});
