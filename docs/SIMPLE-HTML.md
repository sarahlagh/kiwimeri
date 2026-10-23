# Lexical <-> Simple HTML rules

## Paragraphs

A Lexical `paragraph` is a <p></p> block

```
root
  children
    paragraph
        text "some text"
    paragraph
        text "another text"
```

```
<p>some text</p>
<p>another text</p>

```

`linebreak` element in Lexical is represented by a single `<br />` in Simple HTML within a block.

```
root
  children
    paragraph
        text "some text"
        linebreak
        text "multiline"
```

```
<p>some text <br />
multiline</p>
```

## Empty paragraphs

An empty top-level `paragraph` is translated by `<p></p>` (multiplied by number of empty paragraphs).

```
root
  children
    paragraph
        text "some text"
    paragraph
    paragraph
        text "some text"
```

```
<p>some text</p>
<p></p>
<p>some text</p>

```

## Headings

A Lexical `heading` is a Simple HTML block of lines delimited by `<h1></h1>` where tag number ranges from 1 to 6.

```
root
  children
    heading
      text "some header"
```

```
<h1>some header</h1>

```

Multiline:

```
root
  children
    heading
        text "some header"
        linebreak
        text "second line"
```

```
<h1>some header <br />
second line</h1>

```

## Quotes

A Lexical `quote` is a Simple HTML block of lines delimited by `<blockquote>` where sub element starts with `<p>`

```
root
  children
    quote
        text "first line"
    quote
        text "second line"
```

```
<blockquote>
<p>first line</p>
<p>second line</p>
</blockquote>

```

This is the same as:
```
<blockquote>
<p>first line</p>
</blockquote>
<blockquote>
<p>second line</p>
</blockquote>

```

In case of shift-enter:

```
root
  children
    quote
        text "first line"
        linebreak
        text "second line"
    quote
        text "third line"
```

```
<blockquote>
<p>first line <br />
second line</p>
</blockquote>
<blockquote>
<p>third line</p>
</blockquote>

```


## Horizontal Rule

A Lexical `horizontalrule` is a Simple HTML block `<hr />`

```
root
  children
    horizontalrule
```

```
<hr />

```

## Unordered Lists

A Lexical `list` is a top-level block of `<ul></ul>` where each line is a `<li></li>`, each containing text.

```
root
  children
    list
        listitem
            text "item 1"
        listitem
            text "item 2"
```

```
<ul>
<li>item 1</li>
<li>item 2</li>
</ul>
```

With shift-enter:

```
root
  children
    list
        listitem
            text "item 1"
            linebreak
            text "item 2"
```

```
<ul>
<li>item 1<br />item 2</li>
</ul>
```

## Ordered Lists

Ordered Lists are bound by the same rules as unordered lists, the only difference being in `<li>` being replaced by `<ol>`:

```
root
  children
    list
        listitem
            text "item 1"
        listitem
            text "item 2"
```

```
<ol>
<li>item 1</li>
<li>item 2</li>
</ol>
```

## Checked Lists

Checked lists are `<checked></checked>` blocks. The `checked` attribute on `li` tells whether the item is checked or not (false by default).

```
<checked>
<li checked='true'>item 1</li>
<li>item 2</li>
</checked>
```

## Links

### Manual links

```
root
  children
    paragraph
      link
        url "https://www.soundslice.com/"
        text "a link"
```

`<p><a title="a link" href="https://www.soundslice.com/">a link</a></p>`

### Autolinks

```
root
  children
    paragraph
      autolink
        url "https://www.soundslice.com/"
        text "https://www.soundslice.com/"
```

`<autolink>https://www.soundslice.com/</autolink>`

`<autolink url="https://www.soundslice.com/">https://www.**soundslice**.com/</autolink>`

`<autolink unlinked=true>https://www.soundslice.com/</autolink>`

## Text-Align

In Lexical the paragraph alignment is a property of a top-level block and not a type of block.

```
root
  children
    paragraph <-- text-align
        text "centered"
```

```
<p style="text-align: center;">centered</p>

```

With shift-enter:

```
root
  children
    paragraph <-- text-align
        text "centered"
        linebreak
        text "multi line"
```

```
<p style="text-align: center;">centered<br />
multiline</p>

```


```
root
  children
    paragraph <-- text-align
        text "centered"
        linebreak
    paragraph
        text "test"
```

```
<p style="text-align: center;">centered<br />
</p>
<p>test</p>
```

The sequence `<p ...></p>` may be anywhere within a block. These will all result in orphaned text being made into a paragraph:

```
<p style="text-align: center;">centered</p> and other text
```

```
<p style="text-align: center;">centered</p>
<p>and other text</p>
```


### In headings, quotes and lists

The markings of `heading`, `quote` and `list` take precedence:

#### Heading

The whole `heading` block is affected as one:

```
root
  children
    heading <-- text-align
        text "some header"
        linebreak
        text "second line"
```

```
# <h1 style="text-align: center;"><p>some header<br />
# second line</p></h1>
```

On parsing a multiline header, in case of conflicting properties on each line, **the last is taken into account**.

This will result in a right-aligned header:

```
# <p style="text-align: center;">some header</p>
# <p style="text-align: right;">second line</p>
```

This will result in a center-aligned header:

```
# some header
# <p style="text-align: center;">second line</p>
```

This will result in a center-aligned header:

```
# <p style="text-align: center;">some header</p>
# second line
```

#### Quote

In quote blocks each individual `quote` can have its text-align property:

```
root
  children
    quote <-- text-align
        text "first line"
    quote
        text "second line"
```

```
> <p style="text-align: center;">first line</p>
> second line

```

With shift-enter:

```
root
  children
    quote <-- text-align
        text "first line"
        linebreak
        text "multi line"
    quote
        text "second line"
```

```
> <p style="text-align: center;">first line
multi line</p>
> second line

```

There is no special double space in this case.

#### List

In list blocks each individual `listitem` can have its text-align property:

```
root
  children
    list
        listitem <-- text-align
            text "item 1"
        listitem
            text "item 2"
```

```
- <p style="text-align: center;">item 1</p>
- item 2
```

With shift-enter:

```
root
  children
    list
        listitem <-- text-align
            text "item 1"
            linebreak
            text "multi line"
        listitem
            text "item 2"
```

```
- <p style="text-align: center;">item 1
  multi line</p>
- item 2

```

## TODO Not yet supported

- indented paragraphs, lists and quotes (nested)

## Lexical Elements

### Text Format

- bold is `<b>text</b>` but alternative `<strong>` is allowed
- italic is `<i>text</i>` but alternative `<em>` is allowed
- strikethrough is `<strike>text</strike>`
- underline is `<u>text</u>`
- highlight is `<mark>text</mark>`

### Escaped characters

Special html characters or sequences (`<`, `>`) may be escaped with `\`

```
This is an exemple with <\*p\> escaped chars
```

Failing to escape characters may result in parsing errors.

