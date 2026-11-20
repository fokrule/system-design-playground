// Latency model for "what happens when you open a website".
// Pure function: inputs -> timeline of phases and legs. The animation, the
// waterfall bar and all the numbers on the page render from this output.

export type NodeId = 'browser' | 'dns' | 'server' | 'db';
export type PhaseId = 'dns' | 'tcp' | 'tls' | 'http' | 'assets';
export type LegKind = 'network' | 'server';

export interface Leg {
  phase: PhaseId;
  from: NodeId;
  to: NodeId;
  kind: LegKind;
  start: number; // ms from the moment you press Enter
  ms: number;
}

export interface Phase {
  id: PhaseId;
  label: string;
  start: number;
  ms: number;
  roundTrips: number;
  skipped: boolean;
  skipReason: string;
  explanation: string;
  legs: Leg[];
}

export interface Inputs {
  distanceKm: number; // user <-> server
  serverMs: number; // time the app + DB spend building the page
  dnsCached: boolean;
  connectionReused: boolean;
  assetsCached: boolean;
}

export interface Timeline {
  rttMs: number;
  phases: Phase[];
  legs: Leg[];
  totalMs: number;
  htmlArrivesMs: number;
  networkMs: number;
  serverMs: number;
  roundTrips: number;
}

// Light in fiber covers ~200 km per ms. A round trip goes there and back, and
// real routes are ~1.5x longer than a straight line: RTT ≈ km × 0.015 ms.
export function rttForDistance(km: number): number {
  return Math.max(2, Math.round(km * 0.015));
}

// Recursive DNS lookup (resolver -> root -> .com -> shop.com's nameserver).
// Your resolver is usually near you, so this barely depends on server distance.
export const DNS_LOOKUP_MS = 40;
export const ASSET_COUNT = 50;

const TEXT: Record<PhaseId, { label: string; explanation: string; skipReason: string }> = {
  dns: {
    label: 'DNS lookup',
    explanation:
      'The browser asks a DNS resolver "where is shop.com?". The resolver walks root → .com → shop.com\'s nameserver and returns an IP address.',
    skipReason: 'Cached: the browser already knows the IP from last time.',
  },
  tcp: {
    label: 'TCP handshake',
    explanation:
      'SYN → SYN-ACK → ACK. One full round trip just to open a reliable connection. No page data has moved yet.',
    skipReason: 'Connection reused (keep-alive): it is already open.',
  },
  tls: {
    label: 'TLS handshake',
    explanation:
      'Client and server agree on encryption keys (the S in HTTPS). TLS 1.3 needs 1 round trip; older TLS 1.2 needs 2.',
    skipReason: 'Connection reused: encryption keys were already agreed.',
  },
  http: {
    label: 'HTTP request',
    explanation:
      '"GET /products" travels to the server, the app runs and queries the database, then the HTML travels back. Only the middle part is your code.',
    skipReason: '',
  },
  assets: {
    label: `Load ${ASSET_COUNT} assets`,
    explanation: `The HTML references ~${ASSET_COUNT} files (CSS, JS, images). Over HTTP/2 they are requested in parallel on the same connection, so roughly one more round trip.`,
    skipReason: 'Browser cache already has them: no network needed.',
  },
};

export function buildTimeline(input: Inputs): Timeline {
  const rtt = rttForDistance(input.distanceKm);
  const half = rtt / 2;
  const phases: Phase[] = [];
  let t = 0;

  const add = (
    id: PhaseId,
    skipped: boolean,
    roundTrips: number,
    legSpecs: Array<[NodeId, NodeId, LegKind, number]>,
  ) => {
    const legs: Leg[] = [];
    const start = t;
    if (!skipped) {
      for (const [from, to, kind, ms] of legSpecs) {
        legs.push({ phase: id, from, to, kind, start: t, ms });
        t += ms;
      }
    }
    phases.push({
      id,
      ...TEXT[id],
      start,
      ms: t - start,
      roundTrips: skipped ? 0 : roundTrips,
      skipped,
      legs,
    });
  };

  add('dns', input.dnsCached, 0, [
    ['browser', 'dns', 'network', DNS_LOOKUP_MS / 2],
    ['dns', 'browser', 'network', DNS_LOOKUP_MS / 2],
  ]);
  add('tcp', input.connectionReused, 1, [
    ['browser', 'server', 'network', half],
    ['server', 'browser', 'network', half],
  ]);
  add('tls', input.connectionReused, 1, [
    ['browser', 'server', 'network', half],
    ['server', 'browser', 'network', half],
  ]);
  add('http', false, 1, [
    ['browser', 'server', 'network', half],
    ['server', 'db', 'server', input.serverMs / 2],
    ['db', 'server', 'server', input.serverMs / 2],
    ['server', 'browser', 'network', half],
  ]);
  const htmlArrivesMs = t;
  add('assets', input.assetsCached, 1, [
    ['browser', 'server', 'network', half],
    ['server', 'browser', 'network', half],
  ]);

  const legs = phases.flatMap((p) => p.legs);
  const serverMs = legs.filter((l) => l.kind === 'server').reduce((s, l) => s + l.ms, 0);

  return {
    rttMs: rtt,
    phases,
    legs,
    totalMs: t,
    htmlArrivesMs,
    networkMs: t - serverMs,
    serverMs,
    roundTrips: phases.reduce((s, p) => s + p.roundTrips, 0),
  };
}

export const FIRST_VISIT = { dnsCached: false, connectionReused: false, assetsCached: false };
export const REPEAT_VISIT = { dnsCached: true, connectionReused: true, assetsCached: true };
