import { useEffect, useMemo, useState } from 'react';
import { levelRange, levelRef } from '../../curriculum';
import { usePlayback } from '../../lib/usePlayback';
import {
  buildTimeline,
  FIRST_VISIT,
  REPEAT_VISIT,
  type Inputs,
  type Leg,
  type NodeId,
  type PhaseId,
} from './model';

const NODES: Record<NodeId, { x: number; y: number; label: string; sub: string }> = {
  browser: { x: 95, y: 175, label: 'Your browser', sub: 'client' },
  dns: { x: 345, y: 62, label: 'DNS resolver', sub: 'phone book' },
  server: { x: 615, y: 175, label: 'Web server', sub: 'app code' },
  db: { x: 615, y: 290, label: 'Database', sub: 'data' },
};

const PHASE_COLOR: Record<PhaseId, string> = {
  dns: 'var(--c-dns)',
  tcp: 'var(--c-tcp)',
  tls: 'var(--c-tls)',
  http: 'var(--c-http)',
  assets: 'var(--c-assets)',
};

const LOCATIONS = [
  { label: 'Same city', km: 20 },
  { label: 'Same country', km: 800 },
  { label: 'Bangladesh → US', km: 12_500 },
  { label: 'Other side of world', km: 19_000 },
];

const SPEEDS = [
  { label: '100× slower', factor: 100 },
  { label: '50× slower', factor: 50 },
  { label: '20× slower', factor: 20 },
  { label: '10× slower', factor: 10 },
  { label: '5× slower', factor: 5 },
];

const fmt = (ms: number) => `${Math.round(ms)} ms`;

function colorFor(leg: Leg) {
  return leg.kind === 'server' ? 'var(--c-server)' : PHASE_COLOR[leg.phase];
}

export function Simulator() {
  const [inputs, setInputs] = useState<Inputs>({ distanceKm: 12_500, serverMs: 20, ...FIRST_VISIT });
  const [slow, setSlow] = useState(10);

  const tl = useMemo(() => buildTimeline(inputs), [inputs]);
  const active = tl.phases.filter((p) => !p.skipped);
  const { elapsed, playing, done, playTo, pause, seek } = usePlayback(tl.totalMs, slow);

  // Any change to the inputs rewinds the animation.
  useEffect(() => {
    seek(0);
  }, [tl, seek]);

  // Inclusive end, so after "Next step" pauses at a boundary we still show the step just played.
  const current = active.find((p) => elapsed > p.start && elapsed <= p.start + p.ms);
  const leg = tl.legs.find((l) => elapsed > l.start && elapsed <= l.start + l.ms);

  const play = () => playTo(tl.totalMs, done ? 0 : undefined);
  const step = () => {
    const from = done ? 0 : elapsed;
    const next = active.find((p) => p.start + p.ms > from + 0.001);
    if (next) playTo(next.start + next.ms, done ? 0 : undefined);
  };
  const back = () => {
    const prev = [...active].reverse().find((p) => p.start < elapsed - 0.5);
    seek(prev ? prev.start : 0);
  };
  const reset = () => seek(0);

  // Packet position along the current leg.
  let packet = NODES.browser as { x: number; y: number };
  if (leg) {
    const a = NODES[leg.from];
    const b = NODES[leg.to];
    const k = (elapsed - leg.start) / leg.ms;
    packet = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }
  const lit = new Set<NodeId>(leg ? [leg.from, leg.to] : []);

  // Waterfall: merge consecutive legs of the same phase + kind into one segment.
  const segments: Array<{ phase: PhaseId; kind: Leg['kind']; start: number; ms: number }> = [];
  for (const l of tl.legs) {
    const prev = segments[segments.length - 1];
    if (prev && prev.phase === l.phase && prev.kind === l.kind) prev.ms += l.ms;
    else segments.push({ phase: l.phase, kind: l.kind, start: l.start, ms: l.ms });
  }

  const networkShare = tl.networkMs / tl.totalMs;
  const insight =
    networkShare > 0.8
      ? `Distance dominates: ${fmt(tl.networkMs)} of ${fmt(tl.totalMs)} is waiting on the network. A faster server barely helps here — moving content closer to the user does (CDN, ${levelRef('global')}).`
      : networkShare < 0.5
        ? `Server work dominates: ${fmt(tl.serverMs)} of ${fmt(tl.totalMs)} is your app and database. This is the box ${levelRange('growing-traffic', 'data-growth')} are about.`
        : `A mix: network ${fmt(tl.networkMs)}, server ${fmt(tl.serverMs)}. Both matter here.`;

  const set = (patch: Partial<Inputs>) => setInputs((i) => ({ ...i, ...patch }));
  const isFirst = !inputs.dnsCached && !inputs.connectionReused && !inputs.assetsCached;
  const isRepeat = inputs.dnsCached && inputs.connectionReused && inputs.assetsCached;

  return (
    <section className="card sim">
      <div className="sim-controls">
        <div className="control">
          <label htmlFor="dist">
            Distance to server <strong>{inputs.distanceKm.toLocaleString()} km</strong>
            <span className="muted"> · round trip ≈ {fmt(tl.rttMs)}</span>
          </label>
          <input
            id="dist"
            type="range"
            min={10}
            max={20000}
            step={10}
            value={inputs.distanceKm}
            onChange={(e) => set({ distanceKm: Number(e.target.value) })}
          />
          <div className="chips">
            {LOCATIONS.map((l) => (
              <button
                key={l.label}
                className={`chip ${inputs.distanceKm === l.km ? 'on' : ''}`}
                onClick={() => set({ distanceKm: l.km })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <label htmlFor="srv">
            Server work (app + database) <strong>{fmt(inputs.serverMs)}</strong>
          </label>
          <input
            id="srv"
            type="range"
            min={1}
            max={300}
            value={inputs.serverMs}
            onChange={(e) => set({ serverMs: Number(e.target.value) })}
          />
        </div>

        <div className="control">
          <span className="label">Visit</span>
          <div className="chips">
            <button className={`chip ${isFirst ? 'on' : ''}`} onClick={() => set(FIRST_VISIT)}>
              First visit
            </button>
            <button className={`chip ${isRepeat ? 'on' : ''}`} onClick={() => set(REPEAT_VISIT)}>
              Repeat visit
            </button>
          </div>
          <div className="checks">
            <label>
              <input
                type="checkbox"
                checked={inputs.dnsCached}
                onChange={(e) => set({ dnsCached: e.target.checked })}
              />{' '}
              DNS cached
            </label>
            <label>
              <input
                type="checkbox"
                checked={inputs.connectionReused}
                onChange={(e) => set({ connectionReused: e.target.checked })}
              />{' '}
              Connection reused
            </label>
            <label>
              <input
                type="checkbox"
                checked={inputs.assetsCached}
                onChange={(e) => set({ assetsCached: e.target.checked })}
              />{' '}
              Assets cached
            </label>
          </div>
        </div>
      </div>

      <svg className="diagram" viewBox="0 0 720 340" role="img" aria-label="Request journey diagram">
        <line className="edge" x1={NODES.browser.x} y1={NODES.browser.y} x2={NODES.dns.x} y2={NODES.dns.y} />
        <line className="edge" x1={NODES.browser.x} y1={NODES.browser.y} x2={NODES.server.x} y2={NODES.server.y} />
        <line className="edge" x1={NODES.server.x} y1={NODES.server.y} x2={NODES.db.x} y2={NODES.db.y} />
        <text className="edge-label" x={(NODES.browser.x + NODES.server.x) / 2} y={NODES.browser.y + 22} textAnchor="middle">
          {inputs.distanceKm.toLocaleString()} km · {fmt(tl.rttMs)} per round trip
        </text>

        {(Object.keys(NODES) as NodeId[]).map((id) => {
          const n = NODES[id];
          const off = id === 'dns' && inputs.dnsCached;
          return (
            <g key={id} className={`node ${lit.has(id) ? 'lit' : ''} ${off ? 'off' : ''}`}>
              <rect x={n.x - 72} y={n.y - 26} width={144} height={52} rx={10} />
              <text x={n.x} y={n.y - 3} textAnchor="middle" className="node-label">
                {n.label}
              </text>
              <text x={n.x} y={n.y + 14} textAnchor="middle" className="node-sub">
                {off ? 'cached — skipped' : n.sub}
              </text>
            </g>
          );
        })}

        {leg && <circle cx={packet.x} cy={packet.y} r={9} fill={colorFor(leg)} className="packet" />}
        {done && (
          <text x={NODES.browser.x} y={NODES.browser.y + 50} textAnchor="middle" className="done-label">
            ✓ Page loaded in {fmt(tl.totalMs)}
          </text>
        )}
      </svg>

      <div className="transport">
        <button onClick={back} aria-label="Previous step">⏮ Back</button>
        {playing ? (
          <button className="primary" onClick={pause}>⏸ Pause</button>
        ) : (
          <button className="primary" onClick={play}>▶ Play all</button>
        )}
        <button onClick={step}>Next step ⏭</button>
        <button onClick={reset}>↺ Reset</button>
        <select value={slow} onChange={(e) => setSlow(Number(e.target.value))} aria-label="Animation speed">
          {SPEEDS.map((s) => (
            <option key={s.factor} value={s.factor}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="clock">{fmt(elapsed)} / {fmt(tl.totalMs)}</span>
      </div>

      <div className="waterfall-wrap">
        <div className="waterfall">
          {segments.map((s, i) => (
            <div
              key={i}
              className="seg"
              title={`${s.kind === 'server' ? 'Server work' : s.phase.toUpperCase()}: ${fmt(s.ms)}`}
              style={{
                width: `${(s.ms / tl.totalMs) * 100}%`,
                background: s.kind === 'server' ? 'var(--c-server)' : PHASE_COLOR[s.phase],
              }}
            />
          ))}
          <div className="cursor" style={{ left: `${(elapsed / tl.totalMs) * 100}%` }} />
          {!inputs.assetsCached && (
            <div
              className={`marker ${tl.htmlArrivesMs / tl.totalMs > 0.6 ? 'flip' : ''}`}
              style={{ left: `${(tl.htmlArrivesMs / tl.totalMs) * 100}%` }}
            >
              <span>HTML arrives · {fmt(tl.htmlArrivesMs)}</span>
            </div>
          )}
        </div>
        <div className="stats">
          <div><span className="muted">Total</span> <strong>{fmt(tl.totalMs)}</strong></div>
          <div><span className="muted">Network</span> <strong>{fmt(tl.networkMs)}</strong></div>
          <div><span className="muted">Server</span> <strong>{fmt(tl.serverMs)}</strong></div>
          <div><span className="muted">Round trips</span> <strong>{tl.roundTrips}</strong></div>
        </div>
        <p className="insight">{insight}</p>
      </div>

      <ol className="steps">
        {tl.phases.map((p, i) => (
          <li
            key={p.id}
            className={`${p.skipped ? 'skipped' : ''} ${current?.id === p.id ? 'now' : ''}`}
            style={{ borderLeftColor: PHASE_COLOR[p.id] }}
          >
            <div className="step-head">
              <span className="step-num" style={{ background: PHASE_COLOR[p.id] }}>{i + 1}</span>
              <strong>{p.label}</strong>
              <span className="muted">{p.skipped ? 'skipped' : fmt(p.ms)}</span>
            </div>
            <p>{p.skipped ? p.skipReason : p.explanation}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
