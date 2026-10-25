import test from 'node:test';
import assert from 'node:assert/strict';
import { navActive } from '../src/components/layout/navActive.js';

test('marketplace and fresh produce are told apart by ?type=produce', () => {
  assert.equal(navActive('/marketplace', '/marketplace', ''), true);
  assert.equal(navActive('/marketplace?type=produce', '/marketplace', ''), false);
  assert.equal(navActive('/marketplace', '/marketplace', '?type=produce'), false);
  assert.equal(navActive('/marketplace?type=produce', '/marketplace', '?type=produce&q=wheat'), true);
  assert.equal(navActive('/marketplace', '/marketplace', '?category=seeds&q=wheat'), true);
});

test('a product page keeps Marketplace lit', () => {
  assert.equal(navActive('/marketplace', '/marketplace/64f1', ''), true);
  assert.equal(navActive('/marketplace?type=produce', '/marketplace/64f1', ''), false);
});

test('other links match their own path and the pages below it, never a look-alike', () => {
  assert.equal(navActive('/crops', '/crops', ''), true);
  assert.equal(navActive('/crops', '/crops/wheat', ''), true);
  assert.equal(navActive('/crops', '/crop-guide', ''), false);
  assert.equal(navActive('/weather', '/', ''), false);
  assert.equal(navActive('/disease', '/disease', ''), true);
});
