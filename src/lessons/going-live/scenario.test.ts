import { describe, expect, it } from 'vitest';
import { STEPS, viewFor, type CompId } from './scenario';

const allViews = STEPS.flatMap((step, i) => [
  { label: `${step.id}/unanswered`, view: viewFor(i, null) },
  ...step.options.map((o) => ({ label: `${step.id}/${o.id}`, view: viewFor(i, o.id) })),
]);

describe('going-live scenario', () => {
  it('every step has exactly one "best" option and unique option ids', () => {
    for (const s of STEPS) {
      expect(s.options.filter((o) => o.verdict === 'best'), s.id).toHaveLength(1);
      expect(new Set(s.options.map((o) => o.id)).size, s.id).toBe(s.options.length);
    }
  });

  it('step ids are unique', () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
  });

  it.each(allViews)('$label: flows only touch visible components', ({ view }) => {
    for (const f of view.state.flows) {
      for (const c of f.path) expect(view.visible.has(c), `${c} in "${f.label}"`).toBe(true);
    }
  });

  it.each(allViews)('$label: failAt is the last node of its path', ({ view }) => {
    for (const f of view.state.flows) {
      if (f.failAt) expect(f.path[f.path.length - 1]).toBe(f.failAt);
    }
  });

  it('every "fix" step changes something visible when solved', () => {
    for (const [i, s] of STEPS.entries()) {
      if (s.kind !== 'fix') continue;
      const best = s.options.find((o) => o.verdict === 'best')!;
      const before = viewFor(i, null);
      const after = viewFor(i, best.id);
      const changed =
        JSON.stringify(before.state.browser) !== JSON.stringify(after.state.browser) ||
        [...after.visible].some((c) => !before.visible.has(c));
      expect(changed, s.id).toBe(true);
    }
  });

  it('components added by a fix stay visible in every later step (unless removed)', () => {
    for (const [i, s] of STEPS.entries()) {
      for (const c of s.adds ?? []) {
        for (let j = i + 1; j < STEPS.length; j++) {
          const removedLater = STEPS.slice(i + 1, j + 1).some((t) => t.removes?.includes(c));
          if (!removedLater) expect(viewFor(j, null).visible.has(c as CompId), `${c} at ${STEPS[j].id}`).toBe(true);
        }
      }
    }
  });

  it('your server only gets the padlock once Nginx exists', () => {
    const nginxStep = STEPS.findIndex((s) => s.id === 'nginx');
    for (let i = 0; i <= nginxStep; i++) {
      for (const v of [viewFor(i, null), ...STEPS[i].options.map((o) => viewFor(i, o.id))]) {
        // Third-party hosts (e.g. the static-host outcome) bring their own HTTPS.
        if (!v.state.browser.url.includes('shop.com') || v.state.browser.url.includes('netlify')) continue;
        expect(v.state.browser.security).not.toBe('secure');
      }
    }
  });
});
