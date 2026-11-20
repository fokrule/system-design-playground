import { useState } from 'react';
import { levelBySlug, levelRef } from '../../curriculum';
import { BrowserMock } from './BrowserMock';
import { Diagram } from './Diagram';
import { finalView, getOption, STEPS, viewFor, type Verdict } from './scenario';

const VERDICT_LABEL: Record<Verdict, string> = {
  best: 'Our pick',
  works: 'Also works',
  wrong: 'Problem',
};

/** One step, fully determined by props, so every state can be rendered in tests. */
export function StepView({
  stepIndex,
  pickedId,
  onPick,
}: {
  stepIndex: number;
  pickedId: string | null;
  onPick?: (id: string) => void;
}) {
  const step = STEPS[stepIndex];
  const view = viewFor(stepIndex, pickedId);
  const picked = getOption(step, pickedId);
  const solved = picked && picked.verdict !== 'wrong';

  return (
    <section className="card gl-step">
      <header>
        <p className="eyebrow">
          Step {stepIndex + 1} of {STEPS.length} · {step.kind === 'fix' ? 'Fix it' : 'Diagnose it'}
        </p>
        <h2>{step.title}</h2>
        <p>{step.situation}</p>
        <p className="problem">⚠ {step.problem}</p>
      </header>

      <div className="gl-stage">
        <Diagram view={view} playKey={`${stepIndex}:${pickedId ?? ''}`} />
        <BrowserMock browser={view.state.browser} />
      </div>
      {picked?.verdict === 'works' && !picked.outcome && (
        <p className="muted caption">
          The diagram shows the setup this course uses — your choice reaches the same result in a different way.
        </p>
      )}

      <div className="gl-question">
        <h3>{step.question}</h3>
        <div className="options">
          {step.options.map((o) => {
            const isPicked = o.id === pickedId;
            return (
              <button
                key={o.id}
                className={`option ${isPicked ? `picked ${o.verdict}` : ''}`}
                onClick={() => onPick?.(o.id)}
                aria-pressed={isPicked}
              >
                {o.text}
                {isPicked && <span className={`verdict ${o.verdict}`}>{VERDICT_LABEL[o.verdict]}</span>}
              </button>
            );
          })}
        </div>
        {picked && (
          <p className={`feedback ${picked.verdict}`}>
            <strong>{VERDICT_LABEL[picked.verdict]}:</strong> {picked.feedback}
            {picked.verdict === 'wrong' && ' Try another option.'}
          </p>
        )}
        {solved && (
          <p className="insight">
            <strong>Rule of thumb:</strong> {step.rule}
          </p>
        )}
      </div>
    </section>
  );
}

export function Summary() {
  const view = finalView();
  return (
    <section className="card gl-step">
      <header>
        <p className="eyebrow">Done · Your complete setup</p>
        <h2>One server, fully live</h2>
        <p>
          From a file on your laptop to a monitored store with HTTPS, a database and automatic deploys — and every
          piece was added because a problem forced it.
        </p>
      </header>
      <div className="gl-stage">
        <Diagram view={view} playKey="summary" />
        <BrowserMock browser={view.state.browser} />
      </div>
      <ol className="recap">
        {STEPS.map((s) => (
          <li key={s.id}>
            <strong>{s.title}:</strong> {s.rule}
          </li>
        ))}
      </ol>
      <p className="insight">
        Next, {levelRef('request-journey')} follows one visitor's request through this setup millisecond by
        millisecond. Then {levelRef('one-server')} ({levelBySlug('one-server').title}) asks: how long until this box
        isn't enough?
      </p>
    </section>
  );
}

export function GoingLive() {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const atSummary = index === STEPS.length;

  const go = (i: number) => {
    setIndex(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="lesson">
      <header className="lesson-head">
        <p className="eyebrow">{levelRef('going-live')} · Going live</p>
        <h1>From your laptop to a live website</h1>
        <p className="lede">
          Take an online store from a folder on your laptop to a real, secure, monitored site. At every step something
          is broken: pick a fix and watch what happens — wrong choices play out too.
        </p>
      </header>

      <nav className="stepper" aria-label="Steps">
        {STEPS.map((s, i) => {
          const p = getOption(s, picks[s.id]);
          const state = p ? (p.verdict === 'wrong' ? 'tried' : 'solved') : '';
          return (
            <button
              key={s.id}
              className={`stepper-dot ${i === index ? 'on' : ''} ${state}`}
              onClick={() => go(i)}
              title={s.title}
            >
              {state === 'solved' ? '✓' : i + 1}
            </button>
          );
        })}
        <button className={`stepper-dot ${atSummary ? 'on' : ''}`} onClick={() => go(STEPS.length)} title="Summary">
          ★
        </button>
      </nav>

      {atSummary ? (
        <Summary />
      ) : (
        <StepView
          stepIndex={index}
          pickedId={picks[STEPS[index].id] ?? null}
          onPick={(id) => setPicks((p) => ({ ...p, [STEPS[index].id]: id }))}
        />
      )}

      <div className="gl-nav">
        <button disabled={index === 0} onClick={() => go(index - 1)}>
          ← Previous
        </button>
        {!atSummary && (
          <button className="primary" onClick={() => go(index + 1)}>
            {index === STEPS.length - 1 ? 'See the full setup →' : 'Next step →'}
          </button>
        )}
      </div>
    </article>
  );
}
