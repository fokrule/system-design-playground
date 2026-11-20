// The learning path. One system grows over time; each level is a fix for a
// problem the previous level couldn't handle. Rule: never add a component
// unless a problem forces you to.
//
// Levels are identified by a stable slug. The displayed number comes from the
// position in this list, so inserting a level never breaks references:
// always write levelRef('read-heavy'), never a hardcoded "Level 4".

export type LevelStatus = 'ready' | 'planned';

export interface Level {
  slug: string;
  title: string;
  situation: string;
  breaks: string;
  learn: string[];
  status: LevelStatus;
}

export const curriculum = [
  {
    slug: 'going-live',
    title: 'Going live',
    situation: 'From your laptop to a real website',
    breaks: 'Nobody else can reach it',
    learn: ['Static vs dynamic', 'Ports & IPs', 'Hosting choices', 'DNS records', 'Nginx', 'HTTPS', 'Process manager', 'Database', 'CI/CD', 'Monitoring'],
    status: 'ready',
  },
  {
    slug: 'request-journey',
    title: 'Request journey',
    situation: 'What happens when someone visits',
    breaks: '—',
    learn: ['DNS lookup', 'TCP & TLS handshakes', 'HTTP', 'Latency numbers', 'Latency vs throughput'],
    status: 'ready',
  },
  {
    slug: 'one-server',
    title: 'One server',
    situation: 'App + DB on one machine, 100 users',
    breaks: 'Nothing yet',
    learn: ['Requirements', 'Estimating QPS & storage'],
    status: 'planned',
  },
  {
    slug: 'growing-traffic',
    title: 'Growing traffic',
    situation: '10k users',
    breaks: 'Server CPU maxed out',
    learn: ['Vertical vs horizontal scaling', 'Load balancer', 'Stateless servers'],
    status: 'planned',
  },
  {
    slug: 'read-heavy',
    title: 'Read-heavy',
    situation: '100k users',
    breaks: 'DB slow on reads',
    learn: ['Indexing', 'Caching', 'Read replicas', 'Why in that order'],
    status: 'planned',
  },
  {
    slug: 'data-growth',
    title: 'Data growth',
    situation: 'Millions of rows, heavy writes',
    breaks: "Single DB can't keep up",
    learn: ['Partitioning', 'Sharding', 'SQL vs NoSQL'],
    status: 'planned',
  },
  {
    slug: 'slow-tasks',
    title: 'Slow tasks',
    situation: 'Emails, uploads, video processing',
    breaks: 'Requests time out',
    learn: ['Queues', 'Background workers', 'Pub/sub'],
    status: 'planned',
  },
  {
    slug: 'things-fail',
    title: 'Things fail',
    situation: 'A server dies at 3am',
    breaks: 'Downtime, data loss',
    learn: ['Redundancy & failover', 'Replication lag', 'CAP', 'Rate limiting'],
    status: 'planned',
  },
  {
    slug: 'global',
    title: 'Global & distributed',
    situation: 'Users worldwide, many services',
    breaks: 'Latency, consistency',
    learn: ['CDN', 'Multi-region', 'Microservices', 'Consistent hashing', 'Idempotency'],
    status: 'planned',
  },
  {
    slug: 'case-studies',
    title: 'Case studies',
    situation: 'Real problems, end to end',
    breaks: '—',
    learn: ['URL shortener', 'Chat', 'News feed', 'Video platform'],
    status: 'planned',
  },
] as const satisfies readonly Level[];

export type LevelSlug = (typeof curriculum)[number]['slug'];

export function levelNumber(slug: LevelSlug): number {
  return curriculum.findIndex((l) => l.slug === slug);
}

/** "Level 4" for the given slug. */
export function levelRef(slug: LevelSlug): string {
  return `Level ${levelNumber(slug)}`;
}

/** "Levels 3–5" spanning two slugs. */
export function levelRange(from: LevelSlug, to: LevelSlug): string {
  return `Levels ${levelNumber(from)}–${levelNumber(to)}`;
}

export function levelBySlug(slug: LevelSlug): Level {
  return curriculum.find((l) => l.slug === slug)!;
}
