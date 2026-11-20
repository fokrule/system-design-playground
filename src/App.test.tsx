import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { StepView, Summary } from './lessons/going-live/GoingLive';
import { RequestJourney } from './lessons/request-journey/RequestJourney';
import { STEPS } from './lessons/going-live/scenario';

describe('App smoke test', () => {
  it('renders the sidebar and the first lesson (Going live)', () => {
    const html = renderToString(<App />);
    expect(html).toContain('System Design, Visually');
    expect(html).toContain('From your laptop to a live website');
    expect(html).toContain('Request journey');
    expect(html).toContain('Case studies');
  });

  it('renders the request journey lesson with renumbered references', () => {
    const html = renderToString(<RequestJourney />);
    expect(html).toContain('Level 1');
    expect(html).toContain('DNS lookup');
    expect(html).toContain('Level 2');
  });

  const combos = STEPS.flatMap((s, i) => [null, ...s.options.map((o) => o.id)].map((id) => [s.id, i, id] as const));
  it.each(combos)('renders step %s (#%i) with pick %s', (_id, i, pick) => {
    const html = renderToString(<StepView stepIndex={i} pickedId={pick} />);
    expect(html).toContain(STEPS[i].title);
  });

  it('renders the summary', () => {
    expect(renderToString(<Summary />)).toContain('One server, fully live');
  });
});
