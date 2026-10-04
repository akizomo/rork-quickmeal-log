import { buildFeedbackMailto, FEEDBACK_EMAIL, PLAY_STORE_URLS } from './feedback';

describe('buildFeedbackMailto — 不具合・要望のメール', () => {
  const env = { appVersion: '1.0.1', buildNumber: '12', os: 'android', osVersion: 34 };

  it('宛先・件名・環境情報が入り、日本語の件名もエンコードされる', () => {
    const url = buildFeedbackMailto('Hachibu へのご意見', env);
    expect(url.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`)).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('subject')).toBe('Hachibu へのご意見');
    expect(params.get('body')).toContain('Hachibu 1.0.1 (12) / android 34');
  });

  it('本文の先頭は空けておく (ユーザーがそのまま書き始められる)', () => {
    const body = new URLSearchParams(buildFeedbackMailto('x', env).split('?')[1]).get('body')!;
    expect(body.startsWith('\n')).toBe(true);
  });

  it('URL に生の空白・改行・& が残らない (メールアプリで本文が切れない)', () => {
    const url = buildFeedbackMailto('A & B', env);
    expect(url).not.toMatch(/[\s]/);
    expect(url.split('&').length).toBe(2); // subject と body の区切りだけ
  });
});

describe('PLAY_STORE_URLS', () => {
  it('ストアアプリ → ブラウザの順', () => {
    expect(PLAY_STORE_URLS[0].startsWith('market://')).toBe(true);
    expect(PLAY_STORE_URLS[1].startsWith('https://play.google.com/')).toBe(true);
  });
});
