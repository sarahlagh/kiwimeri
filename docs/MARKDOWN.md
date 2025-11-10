# Lexical <-> Markdown rules

## Paragraphs

A Lexical `paragraph` is a Markdown block of lines delimited by `\n\n` (at this time, Linux only)

```
root
  children
    paragraph
        text "some text"
    paragraph
        text "another text"
```

```
some text

another text

```

`linebreak` element in Lexical is represented by a single `\n` in Markdown within a block.

```
root
  children
    paragraph
        text "some text"
        linebreak
        text "multiline"
```

```
some text
multiline
```

## Empty paragraphs

An empty top-level `paragraph` is translated by an additional `\n` (multiplied by number of empty paragraphs).

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
some text


some text

```

## Headings

A Lexical `heading` is a Markdown block of lines delimited by `\n\n` where each line starts with up to 6 `#`

```
root
  children
    heading
        text "some header"
```

```
# some header

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
# some header
# second line

```

### Non-correct headings

The `#` **must** be followed by a space. A single `#` will not result in a `heading` block:

```
#this is not a heading but a paragraph
```

As a top-level block a Header must be followed by `\n\n` and **not** `\n`:

```
# some header
this will be considered part of the heading too!
```

As a top-level block a Header must be preceded by the beginning of the file, or `\n\n`:

```
this is the previous block
# this is not a header
```

## Quotes

A Lexical `quote` is a Markdown block of lines delimited by `\n` or `\n\n` where each line starts with `> `

```
root
  children
    quote
        text "first line"
    quote
        text "second line"
```

```
> first line
> second line

```

Because of the `\n` **or** `\n\n` rule, this is the **same** as:

```
> first line

> second line

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
> first line
  second line
> third line

```

The double space is optional and this is also allowed:

```
> first line
second line
> third line

```

This means that is is allowed, and will result in a single quote block:

```
> first line
second line

```

An array of quotes may only be broken by another top-level block such as a paragraph.

```
root
  children
    quote
        text "a quote"
    paragraph
    quote
        text "another quote"
```

will produce:

```
> a quote


> another quote

```

> **Exception to the `\n\n` rule**: even though `quote` is a top-level Lexical block, each line is treated as a block. Which means that this:

```
> a quote

> another quote

```

Is the same as

```
> a quote
> another quote

```

And would be parsed as

```
root
  children
    quote
        text "a quote"
    quote
        text "another quote"
```

### Non-correct quotes

The `>` **must** be followed by a space. A single `>` will not result in a `quote` block.

```
>this is not a quote
```

### Trimming

The spaces between the `>` and the text are trimmed to one:

```
>         quote
```

```
root
  children
    quote
        text "quote"
```

## Horizontal Rule

A Lexical `horizontalrule` is a Markdown line starting with `---` or `***` and ending by `\n\n`

```
root
  children
    horizontalrule
```

```
---

```

A `horizontalrule` may be followed by a single `\n`:

```
---
this is a paragraph
```

```
root
  children
    horizontalrule
    paragraph
      text "this is a paragraph"
```

A `horizontalrule` must be preceded by double `\n\n`

```
this will be a single paragraph with --- in text
---
```

```
root
  children
    paragraph
      text "this will be a single paragraph with --- in text"
      linebreak
      text "---"
```

Two adjacent horizontal rules may be separated by `\n` or `\n\n`:

```
root
  children
    horizontalrule
    horizontalrule
```

```
---
---
```

same as:

```
---

---
```

## Unordered Lists

A Lexical `list` is a top-level block containing an array of `listitem`, each containing text. In Markdown, the `list` is delimited by `\n\n` like `quote`, and each `listitem` is a line starting with `-` ending with a single `\n`:

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
- item 1
- item 2
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
- item 1
  item 2
```

The double space is optional and this is also allowed:

```
- item 1
item 2

```

The `-` may be followed by a space. A single `-` will still result in a `listitem` block:

```
-item 1
-item 2
```

## Ordered Lists

Ordered Lists are bound by the same rules as unordered lists, the only difference being in `-` being replaced by numbers followed by a dot:

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
1. item 1
2. item 2
```

The order is calculated when parsing from Markdown to Lexical, which means incorrect numbers will be corrected. This is allowed:

```
1. item 1
1. item 2
```

The `1.` **must** be followed by a space. A single `1.` will not result in a `listitem` block.

## Unordered and Ordered Lists Mix

Mixing both is not allowed without a `\n\n` block separation.

```
- this
1. will result in a malformed list
```

```
1. this
- will result in a malformed list
```

```
- this is ok

1. this is ok
```

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
<p style="text-align: center;">centered
multiline</p>

```

The `\n\n` must be respected:

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
<p style="text-align: center;">centered
</p>

test
```

The sequence `<p ...></p>` may be anywhere within a block. These will all result with the same center-aligned paragraph:

```
<p style="text-align: center;">centered</p> and other text
```

```
<p style="text-align: center;">centered</p>
and other text
```

```
centered
<p style="text-align: center;">and other text</p>
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
# <p style="text-align: center;">some header</p>
# <p style="text-align: center;">second line</p>
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

- indented lists (nested lists)
- indent on quotes and other (?)
- indented paragraph is a quote?
- alternate syntax for Heading lvl 1 and 2 (=== and ---)

## Lexical Elements

### Text Format

- bold is `**text**` but alternative `__` is allowed
- italic is `*text*` but alternative `_` is allowed
- strikethrough is `~~text~~`
- underline is `<u>text</u>`(not standard Markdown)

### Escaped characters

Special markdown characters or sequences (`*`, `_`, `~` `<`) may be escaped with `\`

```
This is an exemple with \* escaped \~\~ chars
```

Failing to escape characters may result in parsing errors.

The characters `>`, `-` and `#` do not need to be escaped except at the start of a line, if followed by a space.

```
This > doesn't need to be escaped.

>This doesn't need to be escaped.

\> But this does, or it will result in a quote
```

```
This - doesn't need to be escaped.

-This doesn't need to be escaped.

\- But this does, or it will result in a list
```

```
This # doesn't need to be escaped.

#This doesn't need to be escaped.

\# But this does, or it will result in a header
```
