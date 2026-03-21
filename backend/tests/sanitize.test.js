import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeString,
  sanitizeObject,
  sanitizeUrl,
  hasSQLInjection,
} from '../utils/sanitize.js';

test('sanitizeString escapes HTML-sensitive characters', () => {
  const input = `<script>alert('xss')</script>&"`;
  const result = sanitizeString(input);

  assert.equal(
    result,
    '&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;&amp;&quot;'
  );
});

test('sanitizeObject removes prototype pollution keys and sanitizes nested values', () => {
  const payload = {
    normal: '<b>safe</b>',
    nested: { value: `"quoted"` },
    __proto__: 'blocked',
    constructor: 'blocked',
    prototype: 'blocked',
  };

  const sanitized = sanitizeObject(payload);

  assert.deepEqual(sanitized, {
    normal: '&lt;b&gt;safe&lt;&#x2F;b&gt;',
    nested: { value: '&quot;quoted&quot;' },
  });
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, '__proto__'), false);
});

test('sanitizeUrl allows relative/http/https and blocks unsafe protocols', () => {
  assert.equal(sanitizeUrl('/dashboard'), '/dashboard');
  assert.equal(sanitizeUrl('https://example.com'), 'https://example.com');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('data:text/html;base64,abc'), '');
  assert.equal(sanitizeUrl('ftp://example.com/file'), '');
});

test('hasSQLInjection detects common SQL injection patterns', () => {
  assert.equal(hasSQLInjection("' OR '1'='1"), true);
  assert.equal(hasSQLInjection('UNION SELECT * FROM users'), true);
  assert.equal(hasSQLInjection('normal search query'), false);
});
