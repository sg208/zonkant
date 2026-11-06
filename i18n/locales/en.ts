import app from './en/app.json';
import legal from './en/legal.json';
import sky from './en/sky.json';

// WHY: listing three JSON files per locale makes @nuxtjs/i18n merge them into a
// read-only module object, which fails ("Cannot assign to read only property").
// One loader returning a fresh object avoids the merge; top-level keys never overlap.
export default defineI18nLocale(() => ({ ...app, ...legal, ...sky }));
