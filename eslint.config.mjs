import ava from '@cto.af/eslint-config/ava.js';
import base from '@cto.af/eslint-config';
import jsdoc_ts from '@cto.af/eslint-config/jsdoc_ts.js';
import markdown from '@cto.af/eslint-config/markdown.js';

export default [
  ...base,
  ...jsdoc_ts,
  ...markdown,
  ...ava,
];
