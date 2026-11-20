import { useState, type ComponentType } from 'react';
import { curriculum, levelBySlug, levelRef, type LevelSlug } from './curriculum';
import { GoingLive } from './lessons/going-live/GoingLive';
import { RequestJourney } from './lessons/request-journey/RequestJourney';

// Lesson registry: add a level here when it's built.
const LESSONS: Partial<Record<LevelSlug, ComponentType>> = {
  'going-live': GoingLive,
  'request-journey': RequestJourney,
};

export function App() {
  const [slug, setSlug] = useState<LevelSlug>('going-live');
  const Lesson = LESSONS[slug];
  const level = levelBySlug(slug);

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="brand">
          <span className="logo">◇</span> System Design, Visually
        </div>
        <p className="rule">Never add a component unless a problem forces you to.</p>
        <ol className="levels">
          {curriculum.map((l, i) => (
            <li key={l.slug}>
              <button
                className={`level ${l.slug === slug ? 'on' : ''} ${l.status}`}
                onClick={() => {
                  setSlug(l.slug);
                  window.scrollTo({ top: 0 });
                }}
              >
                <span className="level-num">{i}</span>
                <span className="level-text">
                  <span className="level-title">{l.title}</span>
                  <span className="level-sub">{l.situation}</span>
                </span>
                {l.status === 'planned' && <span className="soon">soon</span>}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <main className="main">
        {Lesson ? (
          <Lesson key={slug} />
        ) : (
          <article className="lesson">
            <header className="lesson-head">
              <p className="eyebrow">{levelRef(slug)} · Coming next</p>
              <h1>{level.title}</h1>
              <p className="lede">{level.situation}</p>
            </header>
            <section className="card">
              <p><strong>What breaks:</strong> {level.breaks}</p>
              <p><strong>What you'll learn:</strong> {level.learn.join(' · ')}</p>
              <p className="muted">We'll discuss this level first, then build its interactive lesson.</p>
            </section>
          </article>
        )}
      </main>
    </div>
  );
}
