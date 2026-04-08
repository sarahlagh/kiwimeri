const formatRelative = (date: Date) => {
  const diff = Date.now() - date.getTime();

  // TODO config en-EN
  const rtf = new Intl.RelativeTimeFormat('en-EN', { numeric: 'always' });

  const seconds = Math.round(diff / 1000);
  if (Math.abs(seconds) < 60) return ' ' + rtf.format(-seconds, 'second');

  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) return ' ' + rtf.format(-minutes, 'minute');

  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) < 24) return ' ' + rtf.format(-hours, 'hour');

  const days = Math.round(diff / 86400000);
  if (Math.abs(days) < 7) return ' ' + rtf.format(-days, 'day');

  return '';
};

const formatDatePrintable = (date: Date, timeZone = 'Europe/Paris') => {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

const formatDatetimePrintable = (date: Date, timeZone = 'Europe/Paris') => {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}-${map.hour}-${map.minute}-${map.second}`;
};

export const dateLocale = 'fr-FR'; // TODO config
export const dateToStr = (
  format: 'time' | 'date' | 'date-printable' | 'datetime' | 'iso' | 'relative',
  ts?: number,
  locale = dateLocale
) => {
  const date = ts ? new Date(ts) : new Date();
  switch (format) {
    case 'date':
      return date.toLocaleDateString(locale);
    case 'date-printable':
      return formatDatePrintable(date);
    case 'time':
      return date.toLocaleTimeString(locale);
    case 'datetime':
      return date.toLocaleString(locale);
    case 'iso':
      return formatDatetimePrintable(date);
    case 'relative':
      return date.toLocaleString(locale) + formatRelative(date);
  }
};
