import { FEEDBACK_FORM_URL, PLAY_STORE_URLS } from './feedback';

describe('FEEDBACK_FORM_URL — 不具合・要望のフォーム', () => {
  it('https で、追跡用のクエリを含まない', () => {
    expect(FEEDBACK_FORM_URL.startsWith('https://')).toBe(true);
    expect(FEEDBACK_FORM_URL).not.toContain('?');
  });
});

describe('PLAY_STORE_URLS', () => {
  it('ストアアプリ → ブラウザの順', () => {
    expect(PLAY_STORE_URLS[0].startsWith('market://')).toBe(true);
    expect(PLAY_STORE_URLS[1].startsWith('https://play.google.com/')).toBe(true);
  });
});
