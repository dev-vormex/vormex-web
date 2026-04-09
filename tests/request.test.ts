import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPathWithQuery } from '../src/lib/api/request';

test('buildPathWithQuery appends only defined query values', () => {
  const path = buildPathWithQuery('/circles/discover', {
    category: 'tech',
    page: 2,
    campus: '',
    search: undefined,
    featured: true,
  });

  assert.equal(path, '/circles/discover?category=tech&page=2&featured=true');
});

test('buildPathWithQuery returns the original path when no params are provided', () => {
  assert.equal(buildPathWithQuery('/accountability/partners'), '/accountability/partners');
});
