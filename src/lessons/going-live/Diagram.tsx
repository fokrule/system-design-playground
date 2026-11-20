import { useEffect, useMemo } from 'react';
import { usePlayback } from '../../lib/usePlayback';
import type { CompId, View } from './scenario';

type Pos = { x: number; y: number };
const BOX_W = 150;
const BOX_H = 50;
const SEG_MS = 650;

const NODES: Partial<Record<CompId, Pos & { label: string; sub: string }>> = {
  laptop: { x: 90, y: 80, label: 'Your laptop', sub: '' },
  friend: { x: 90, y: 300, label: 'Visitor', sub: 'browser' },
  router: { x: 270, y: 80, label: 'Home router', sub: 'NAT · private net' },
  ci: { x: 270, y: 80, label: 'CI/CD', sub: 'test → deploy' },
  dns: { x: 270, y: 300, label: 'DNS', sub: 'shop.com → 52.14.88.3' },
  bot: { x: 270, y: 190, label: 'Internet bot', sub: 'scanning ports' },
  monitor: { x: 270, y: 190, label: 'Monitoring', sub: 'metrics · alerts' },
  // App sits above Nginx's row so laptop/CI/monitoring lines to the app don't cross Nginx.
  nginx: { x: 490, y: 190, label: 'Nginx', sub: ':80 / :443' },
  app: { x: 655, y: 110, label: 'Your app', sub: ':3000' },
  db: { x: 655, y: 280, label: 'PostgreSQL', sub: ':5432 local only' },
};

interface Seg {
  from: Pos;
  to: Pos;
  start: number;
  flow: number;
}

export function Diagram({ view, playKey }: { view: View; playKey: string }) {
  const { visible, state } = view;

  const { segs, flowEnds, total } = useMemo(() => {
    const segs: Seg[] = [];
    const flowEnds: number[] = [];
    let t = 0;
    state.flows.forEach((f, i) => {
      for (let k = 0; k < f.path.length - 1; k++) {
        segs.push({ from: NODES[f.path[k]]!, to: NODES[f.path[k + 1]]!, start: t, flow: i });
        t += SEG_MS;
      }
      flowEnds.push(t);
    });
    return { segs, flowEnds, total: t };
  }, [state]);

  const { elapsed, playing, playTo } = usePlayback(total, 1);

  // Replay whenever the step or the chosen option changes.
  useEffect(() => {
    if (total > 0) playTo(total, 0);
  }, [playKey, total, playTo]);

  const seg = segs.find((s) => elapsed >= s.start && elapsed < s.start + SEG_MS);
  let dot: Pos | null = null;
  if (seg && playing) {
    const k = (elapsed - seg.start) / SEG_MS;
    dot = { x: seg.from.x + (seg.to.x - seg.from.x) * k, y: seg.from.y + (seg.to.y - seg.from.y) * k };
  }
  const activeFlow = seg ? state.flows[seg.flow] : undefined;

  // Unique edges across all flows.
  const edges = new Map<string, { a: Pos; b: Pos; danger: boolean }>();
  for (const f of state.flows) {
    for (let k = 0; k < f.path.length - 1; k++) {
      const [p, q] = [f.path[k], f.path[k + 1]].sort();
      const key = `${p}-${q}`;
      if (p === q) continue;
      const prev = edges.get(key);
      edges.set(key, { a: NODES[p]!, b: NODES[q]!, danger: Boolean(f.danger || prev?.danger) });
    }
  }

  const show = (id: CompId) => visible.has(id) && NODES[id];
  const laptop = { ...NODES.laptop!, sub: state.laptopNote ?? '' };

  return (
    <div className="gl-diagram">
      <svg viewBox="0 0 760 380" role="img" aria-label="Your current setup">
        {visible.has('vps') && (
          <g className={`vps ${visible.has('firewall') ? 'fw' : ''}`}>
            <rect x={398} y={22} width={350} height={340} rx={14} />
            <text x={412} y={44} className="vps-label">VPS · 52.14.88.3</text>
            {visible.has('firewall') && (
              <text x={412} y={350} className="fw-label">
                🛡 Firewall: only 22, 80, 443 open
              </text>
            )}
          </g>
        )}

        {[...edges.values()].map((e, i) => (
          <line key={i} className={`edge ${e.danger ? 'danger' : ''}`} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} />
        ))}

        {(Object.keys(NODES) as CompId[]).filter(show).map((id) => {
          const n = id === 'laptop' ? laptop : NODES[id]!;
          const lit = seg && (state.flows[seg.flow].path.includes(id));
          return (
            <g key={id} className={`node ${lit ? 'lit' : ''} ${id === 'bot' ? 'bad' : ''}`}>
              <rect x={n.x - BOX_W / 2} y={n.y - BOX_H / 2} width={BOX_W} height={BOX_H} rx={10} />
              <text x={n.x} y={n.y - 3} textAnchor="middle" className="node-label">{n.label}</text>
              <text x={n.x} y={n.y + 14} textAnchor="middle" className="node-sub">{n.sub}</text>
            </g>
          );
        })}

        {visible.has('cert') && visible.has('nginx') && (
          <Badge at={NODES.nginx!} below text="🔒 TLS cert" />
        )}
        {visible.has('systemd') && visible.has('app') && <Badge at={NODES.app!} text="↻ auto-restart" />}

        {/* Outcome markers once each flow has finished playing. */}
        {state.flows.map((f, i) => {
          if (elapsed < flowEnds[i] - 1 && f.path.length > 1) return null;
          const end = NODES[f.path[f.path.length - 1]]!;
          if (f.failAt) {
            return (
              <g key={i} className="mark fail">
                <circle cx={end.x + BOX_W / 2 - 4} cy={end.y - BOX_H / 2 + 4} r={11} />
                <text x={end.x + BOX_W / 2 - 4} y={end.y - BOX_H / 2 + 9} textAnchor="middle">✕</text>
              </g>
            );
          }
          return (
            <g key={i} className={`mark ${f.danger ? 'fail' : 'ok'}`}>
              <circle cx={end.x + BOX_W / 2 - 4} cy={end.y - BOX_H / 2 + 4} r={11} />
              <text x={end.x + BOX_W / 2 - 4} y={end.y - BOX_H / 2 + 9} textAnchor="middle">{f.danger ? '!' : '✓'}</text>
            </g>
          );
        })}

        {dot && <circle cx={dot.x} cy={dot.y} r={9} className={`gl-packet ${activeFlow?.danger ? 'danger' : ''}`} />}
      </svg>

      <div className="gl-flow-row">
        <span className="muted">{activeFlow ? `▸ ${activeFlow.label}` : state.flows.map((f) => f.label).join(' · ') || 'No network traffic yet'}</span>
        {total > 0 && (
          <button className="ghost" onClick={() => playTo(total, 0)}>
            ↻ Send again
          </button>
        )}
      </div>
    </div>
  );
}

/** Small pill attached above (default) or below a node. */
function Badge({ at, text, below }: { at: Pos; text: string; below?: boolean }) {
  const w = 110;
  const y = below ? at.y + BOX_H / 2 + 6 : at.y - BOX_H / 2 - 26;
  return (
    <g className="badge">
      <rect x={at.x - w / 2} y={y} width={w} height={20} rx={10} />
      <text x={at.x} y={y + 14} textAnchor="middle">{text}</text>
    </g>
  );
}
