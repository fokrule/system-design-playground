import { levelBySlug, levelRef } from '../../curriculum';
import { Simulator } from './Simulator';

const NUMBERS = [
  { op: 'Read from memory (RAM)', ns: 100, real: '100 ns', human: '~2 minutes' },
  { op: 'Read from SSD', ns: 100_000, real: '100 µs', human: '~1 day' },
  { op: 'Round trip inside a data center', ns: 500_000, real: '0.5 ms', human: '~6 days' },
  { op: 'Read from spinning disk', ns: 10_000_000, real: '10 ms', human: '~4 months' },
  { op: 'Round trip across an ocean (~10,000 km)', ns: 150_000_000, real: '150 ms', human: '~5 years' },
];
const LOG_MIN = Math.log10(30);
const LOG_MAX = Math.log10(200_000_000);

const TERMS = [
  { term: 'Latency', def: 'How long one request takes.', eg: '"This page takes 200 ms."' },
  { term: 'Throughput', def: 'How many requests per second the system can handle.', eg: '"10,000 req/s."' },
  { term: 'Availability', def: 'What percentage of the time it works.', eg: '99.9% still allows ~8.7 hours down per year.' },
  { term: 'Scalability', def: 'Whether it can handle more load by adding resources.', eg: 'Add servers → handle more users.' },
];

const QUIZ = [
  {
    q: 'First visit to a site is slow; the second is much faster, though the server did not change. Why?',
    a: 'Caching in two places: the DNS answer is cached (no phone-book lookup), and the browser caches CSS/JS/images, so most of the 50+ requests never leave your machine. Often the connection is also reused, skipping TCP + TLS. Try it: switch to "Repeat visit" above.',
  },
  {
    q: 'Server in the US responds in 5 ms, but a user in Bangladesh says the site is slow. Where is the time?',
    a: 'Distance — paid several times. TCP (1 round trip) + TLS (1) + HTTP (1) at ~190 ms each is well over 500 ms before the page even starts arriving. Try it: pick "Bangladesh → US", set server work to 5 ms.',
  },
  {
    q: 'Each request takes 50 ms, but the app crashes when 1,000 people visit at once. Latency or throughput?',
    a: `Throughput. Each request is fast, but the server cannot handle enough of them at the same time. That is exactly where ${levelRef('growing-traffic')} starts.`,
  },
];

export function RequestJourney() {
  return (
    <article className="lesson">
      <header className="lesson-head">
        <p className="eyebrow">{levelRef('request-journey')} · Request journey</p>
        <h1>What happens when you press Enter</h1>
        <p className="lede">
          Your site is live. Now follow one visitor's request through it. Play it, then change the distance, the server
          time and the visit type — and watch where the time actually goes.
        </p>
      </header>

      <Simulator />

      <section className="card">
        <h2>Latency numbers worth knowing</h2>
        <p className="muted">
          You don't need exact figures — just how many times bigger each step is than the last. Bars are on a log
          scale, because the gaps are huge: an SSD read is 1,000× slower than RAM, and crossing an ocean is 1,000× slower
          than an SSD read.
        </p>
        <div className="numbers">
          {NUMBERS.map((n) => (
            <div key={n.op} className="num-row">
              <div className="num-op">{n.op}</div>
              <div className="num-bar-track">
                <div
                  className="num-bar"
                  style={{ width: `${((Math.log10(n.ns) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100}%` }}
                />
              </div>
              <div className="num-real">{n.real}</div>
              <div className="num-human muted">if 1 ns = 1 s: {n.human}</div>
            </div>
          ))}
        </div>
        <p className="insight">
          Most design decisions are about avoiding the slow rows. A cache moves data from disk to memory ({levelRef('read-heavy')}).
          A CDN moves data closer so it doesn't cross the world ({levelRef('global')}).
        </p>
      </section>

      <section className="card">
        <h2>Four words you'll use constantly</h2>
        <div className="terms">
          {TERMS.map((t) => (
            <div key={t.term} className="term">
              <strong>{t.term}</strong>
              <p>{t.def}</p>
              <p className="muted">{t.eg}</p>
            </div>
          ))}
        </div>
        <p className="insight">
          Latency ≠ throughput. A highway can be fast (low latency) but have only one lane (low throughput).
        </p>
      </section>

      <section className="card">
        <h2>Check yourself</h2>
        {QUIZ.map((item, i) => (
          <details key={i} className="quiz">
            <summary>
              <span className="step-num">{i + 1}</span> {item.q}
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <section className="card next">
        <h2>
          Up next: {levelRef('one-server')} — {levelBySlug('one-server').title}
        </h2>
        <p>
          One machine running your app and database, 100 users. Nothing is broken yet — we'll learn to read
          requirements and estimate load, so we know <em>when</em> things will break.
        </p>
      </section>
    </article>
  );
}
