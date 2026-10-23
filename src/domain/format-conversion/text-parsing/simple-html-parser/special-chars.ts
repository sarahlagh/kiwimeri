export const HTML_CHAR_ENTITIES = {
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&lt;': '<',
  '&#60;': '<',
  '&gt;': '>',
  '&#62;': '>',
  '&amp;': '&',
  '&#38;': '&',
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'"
  // TODO
};
export const HTML_CHAR_ENTITIES_KEYS = Object.keys(
  HTML_CHAR_ENTITIES
) as (keyof typeof HTML_CHAR_ENTITIES)[];
