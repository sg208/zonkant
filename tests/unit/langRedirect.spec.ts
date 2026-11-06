import { describe, expect, it } from 'vitest';
import { langRedirectScript } from '~/utils/langRedirect';

interface Scenario {
  languages: string[] | undefined;
  language?: string;
  path?: string;
  search?: string;
  hash?: string;
  referrer?: string;
  state?: unknown;
}

const ORIGIN = 'https://zonkant.engg.app';

// Runs the exact shipped script string against fake browser globals
const run = (scenario: Scenario): string | null => {
  let replacedWith: string | null = null;
  const location = {
    origin: ORIGIN,
    pathname: scenario.path ?? '/',
    search: scenario.search ?? '',
    hash: scenario.hash ?? '',
    replace: (target: string): void => {
      replacedWith = target;
    },
  };
  const navigator = {
    languages: scenario.languages,
    language: scenario.language ?? scenario.languages?.[0] ?? 'en-US',
  };
  const history = { state: scenario.state ?? null };
  const document = { referrer: scenario.referrer ?? '' };
  const execute = new Function(
    'navigator',
    'location',
    'history',
    'document',
    langRedirectScript
  );
  execute(navigator, location, history, document);
  return replacedWith;
};

describe('langRedirectScript', () => {
  it('sends a non-Dutch fresh visit on / to /en/', () => {
    expect(run({ languages: ['en-US'] })).toBe('/en/');
  });

  it('keeps path, query and hash', () => {
    expect(
      run({
        languages: ['en-US'],
        path: '/privacy',
        search: '?lat=1',
        hash: '#x',
      })
    ).toBe('/en/privacy?lat=1#x');
    expect(run({ languages: ['en-US'], search: '?lat=48.1&lon=11.5' })).toBe(
      '/en/?lat=48.1&lon=11.5'
    );
  });

  it('redirects other languages with an external referrer', () => {
    expect(
      run({ languages: ['de', 'fr'], referrer: 'https://example.com/a' })
    ).toBe('/en/');
  });

  it('falls back to navigator.language when languages is missing', () => {
    expect(run({ languages: undefined, language: 'fr-FR' })).toBe('/en/');
    expect(run({ languages: undefined, language: 'nl-NL' })).toBeNull();
  });

  it.each([
    [['nl']],
    [['en-US', 'nl-BE']],
    [['nl-NL']],
    [['en', 'nl']],
    [['NL-be']],
  ])('stays Dutch when any language is nl*: %j', (languages) => {
    expect(run({ languages })).toBeNull();
  });

  it('does not treat nl-lookalikes as Dutch', () => {
    expect(run({ languages: ['nlx'] })).toBe('/en/');
  });

  it.each(['/en', '/en/', '/en/privacy'])(
    'never redirects under %s',
    (path) => {
      expect(run({ languages: ['en-US'], path })).toBeNull();
    }
  );

  it('treats /entry as a Dutch path, not English', () => {
    expect(run({ languages: ['en-US'], path: '/entry' })).toBe('/en/entry');
  });

  it('does not redirect with a same-origin referrer', () => {
    expect(
      run({ languages: ['en-US'], referrer: `${ORIGIN}/en/privacy` })
    ).toBeNull();
  });

  it('does not redirect when history.state is set (reload after in-app navigation)', () => {
    expect(run({ languages: ['en-US'], state: { position: 1 } })).toBeNull();
  });

  it('survives an unparseable referrer', () => {
    expect(run({ languages: ['en-US'], referrer: 'not a url' })).toBe('/en/');
  });
});
