// "Going live" scenario: from a file on your laptop to a monitored production
// site on one VPS. Each step shows a problem, offers choices, and plays out
// whatever you pick. Everything the page shows is derived from viewFor().

import { levelRef } from '../../curriculum';

export type CompId =
  | 'laptop'
  | 'friend'
  | 'router'
  | 'vps'
  | 'app'
  | 'dns'
  | 'nginx'
  | 'cert'
  | 'systemd'
  | 'db'
  | 'firewall'
  | 'ci'
  | 'monitor'
  | 'bot';

export type Security = 'none' | 'insecure' | 'secure' | 'warning';

export interface Browser {
  who: 'you' | 'visitor';
  url: string;
  security: Security;
  ok: boolean;
  title: string;
  body: string;
}

export interface Flow {
  label: string;
  path: CompId[];
  /** The request stops here with a ✕. Must be the last node of the path. */
  failAt?: CompId;
  danger?: boolean;
}

export interface SimState {
  browser: Browser;
  flows: Flow[];
  laptopNote?: string;
  /** Extra components only this state shows (e.g. an attacker). */
  show?: CompId[];
}

export type Verdict = 'best' | 'works' | 'wrong';

export interface Option {
  id: string;
  text: string;
  verdict: Verdict;
  feedback: string;
  /** What happens if you pick this. Defaults: best/works → step.after, wrong → step.before. */
  outcome?: SimState;
}

export interface Step {
  id: string;
  title: string;
  /** fix: the right choice changes the system. diagnose: you're explaining why it's broken. */
  kind: 'fix' | 'diagnose';
  situation: string;
  problem: string;
  question: string;
  options: Option[];
  rule: string;
  /** Components that appear when the step starts. */
  setup?: CompId[];
  /** Components added once the step is fixed. */
  adds?: CompId[];
  /** Components removed once the step is fixed. */
  removes?: CompId[];
  before: SimState;
  after: SimState;
}

// ---------- reusable browser states ----------

const visitorOk = (url: string, security: Security, body = 'Welcome to Shop — 24 products in stock.'): Browser => ({
  who: 'visitor',
  url,
  security,
  ok: true,
  title: 'Shop',
  body,
});

const REQ_IP: Flow = { label: 'Visitor → app', path: ['friend', 'app'] };
const REQ_DNS: Flow = { label: 'Visitor looks up shop.com, then calls the app', path: ['friend', 'dns', 'friend', 'app'] };
const REQ_NGINX: Flow = { label: 'Visitor → Nginx → app', path: ['friend', 'dns', 'friend', 'nginx', 'app'] };
const REQ_FULL: Flow = { label: 'Visitor → Nginx → app → database', path: ['friend', 'dns', 'friend', 'nginx', 'app', 'db'] };

// ---------- the steps ----------

export const STEPS: Step[] = [
  {
    id: 'static-dynamic',
    title: 'What are you building?',
    kind: 'diagnose',
    situation: 'You have a folder on your laptop with index.html, a stylesheet and some images.',
    problem: 'Before choosing anything else, you need to know: is this a static site or a dynamic one?',
    question: 'Which of these projects needs a dynamic site (a running program, not just files)?',
    options: [
      {
        id: 'portfolio',
        text: 'A personal portfolio',
        verdict: 'wrong',
        feedback: 'Same content for every visitor, changes only when you edit it → static. Free hosting, almost impossible to overload.',
      },
      {
        id: 'docs',
        text: 'A docs site you update every week',
        verdict: 'wrong',
        feedback: 'Still static: updating often is fine, as long as every visitor sees the same pages. Rebuild and re-upload the files.',
      },
      {
        id: 'store',
        text: 'An online store with user accounts',
        verdict: 'best',
        feedback: 'Accounts, carts and orders depend on who is asking and change constantly → a program must build each page, usually from a database. This is the project we will take live.',
      },
    ],
    rule: 'Same content for everyone → static. Depends on the user or on changing data → dynamic. Dynamic is where every scaling problem in later levels comes from.',
    before: {
      laptopNote: 'index.html',
      browser: { who: 'you', url: 'file:///home/you/shop/index.html', security: 'none', ok: true, title: 'Shop', body: 'A page opened straight from a file. Nothing is running yet.' },
      flows: [],
    },
    after: {
      laptopNote: 'index.html',
      browser: { who: 'you', url: 'file:///home/you/shop/index.html', security: 'none', ok: true, title: 'Shop', body: 'Decision: a store with accounts → we need a running program.' },
      flows: [],
    },
  },
  {
    id: 'localhost',
    title: 'Your laptop is a server',
    kind: 'fix',
    situation: 'You wrote the store app and started it. The terminal prints: "Listening on port 3000".',
    problem: 'You type "localhost" in the browser and get "This site can\'t be reached".',
    question: 'What should you type to open the app?',
    options: [
      {
        id: 'localhost-3000',
        text: 'localhost:3000',
        verdict: 'best',
        feedback: 'localhost = this machine. :3000 = the program listening on port 3000. IP finds the machine; port finds the program.',
      },
      {
        id: '127',
        text: '127.0.0.1:3000',
        verdict: 'works',
        feedback: 'Same thing: 127.0.0.1 is the IP address that "localhost" stands for.',
      },
      {
        id: 'plain',
        text: 'Just localhost — it should find it',
        verdict: 'wrong',
        feedback: 'Without a port, the browser uses port 80 (HTTP). Nothing is listening on 80, so the connection is refused.',
      },
    ],
    rule: 'A server is just a program listening on a port. 80 = HTTP, 443 = HTTPS — that is why real sites never show a port.',
    before: {
      laptopNote: 'app :3000',
      browser: { who: 'you', url: 'http://localhost', security: 'none', ok: false, title: "This site can't be reached", body: 'localhost refused to connect. (Nothing is listening on port 80.)' },
      flows: [],
    },
    after: {
      laptopNote: 'app :3000',
      browser: { who: 'you', url: 'http://localhost:3000', security: 'none', ok: true, title: 'Shop', body: 'It works — on your machine.' },
      flows: [],
    },
  },
  {
    id: 'friend',
    title: 'Your friend tries it',
    kind: 'diagnose',
    situation: 'You send a friend the address of your laptop: http://192.168.1.5:3000.',
    problem: 'For them it just spins, then: "took too long to respond". For you it works fine.',
    question: 'Why can\'t your friend open it?',
    setup: ['friend', 'router'],
    options: [
      {
        id: 'nat',
        text: '192.168.x.x is a private address behind your home router — and your laptop isn\'t always on anyway',
        verdict: 'best',
        feedback: 'Your router has the one public IP and shares it (NAT). Requests from outside reach the router, which has no idea which device they are for, so it drops them. Even with port-forwarding, your laptop sleeps, moves, and your ISP changes your IP. You need a machine that is always on, with a fixed public IP.',
      },
      {
        id: 'bug',
        text: 'There\'s a bug in the app',
        verdict: 'wrong',
        feedback: 'The app works for you, so the code is fine. The request never even reaches your laptop — it dies at the router.',
      },
      {
        id: 'friend-localhost',
        text: 'Your friend should type localhost:3000',
        verdict: 'wrong',
        feedback: '"localhost" means "this machine" — on your friend\'s computer, that is their computer, where nothing is running.',
        outcome: {
          laptopNote: 'app :3000',
          browser: { who: 'visitor', url: 'http://localhost:3000', security: 'none', ok: false, title: "This site can't be reached", body: "localhost refused to connect. (That's your friend's own computer.)" },
          flows: [{ label: "Friend's browser asks their own machine", path: ['friend'], failAt: 'friend' }],
        },
      },
    ],
    rule: 'Private IPs (192.168.x.x, 10.x.x.x) only work inside one network. To be reachable you need a public IP on a machine that never sleeps — that is what hosting is.',
    before: {
      laptopNote: 'app :3000',
      browser: { who: 'visitor', url: 'http://192.168.1.5:3000', security: 'none', ok: false, title: "This site can't be reached", body: '192.168.1.5 took too long to respond.' },
      flows: [{ label: 'Friend → your home router', path: ['friend', 'router'], failAt: 'router' }],
    },
    after: {
      laptopNote: 'app :3000',
      browser: { who: 'visitor', url: 'http://192.168.1.5:3000', security: 'none', ok: false, title: "This site can't be reached", body: 'Still broken — and now you know why. Next: get a machine that is always on.' },
      flows: [{ label: 'Friend → your home router (dropped: private network)', path: ['friend', 'router'], failAt: 'router' }],
    },
  },
  {
    id: 'hosting',
    title: 'Find it a home',
    kind: 'fix',
    situation: 'You need a machine that is always on, with a public IP, to run the store (app + database).',
    problem: 'There are many kinds of hosting. Which one fits a dynamic store?',
    question: 'Where should the store run?',
    adds: ['vps', 'app'],
    removes: ['router'],
    options: [
      {
        id: 'static-host',
        text: 'A free static host (GitHub Pages, Netlify)',
        verdict: 'wrong',
        feedback: 'Static hosts only hand out files. The pages load, but login, cart and checkout need your program to run — and it never does. Perfect for the portfolio, wrong for the store.',
        outcome: {
          laptopNote: 'code',
          browser: { who: 'visitor', url: 'https://shop.netlify.app/login', security: 'secure', ok: false, title: '405 Not Allowed', body: 'Login failed: this host only serves files. Your app code never runs.' },
          flows: [],
        },
      },
      {
        id: 'port-forward',
        text: 'Keep the laptop on 24/7 and port-forward the router',
        verdict: 'wrong',
        feedback: 'It works — until the laptop sleeps, the power cuts, or your ISP changes your public IP. Fine for a weekend experiment, not for a store.',
        outcome: {
          laptopNote: 'asleep 💤',
          show: ['router'],
          browser: { who: 'visitor', url: 'http://103.42.7.19:3000', security: 'none', ok: false, title: "This site can't be reached", body: '3:00 AM — your laptop went to sleep. 103.42.7.19 took too long to respond.' },
          flows: [{ label: 'Visitor → your router → sleeping laptop', path: ['friend', 'router', 'laptop'], failAt: 'laptop' }],
        },
      },
      {
        id: 'paas',
        text: 'A PaaS (Render, Railway, Heroku): push code, they run it',
        verdict: 'works',
        feedback: 'Often the best real-world choice for a small team: no servers to manage. We use a VPS in this course only because a PaaS hides the pieces (Nginx, process manager, firewall) we want to see.',
      },
      {
        id: 'vps',
        text: 'A VPS (DigitalOcean, EC2, Hetzner): rent a Linux machine',
        verdict: 'best',
        feedback: 'You get a machine with a public IP (52.14.88.3) and you manage everything on it. More work — but nothing is hidden, which is exactly what we want for learning.',
      },
    ],
    rule: 'Static → static host. Dynamic and you don\'t want to manage servers → PaaS. Need control, or cost matters at scale → VPS. Spiky, small workloads → serverless. The trade-off is always convenience vs control.',
    before: {
      laptopNote: 'app :3000',
      show: ['router'],
      browser: { who: 'visitor', url: 'http://192.168.1.5:3000', security: 'none', ok: false, title: "This site can't be reached", body: '192.168.1.5 took too long to respond.' },
      flows: [{ label: 'Friend → your home router', path: ['friend', 'router'], failAt: 'router' }],
    },
    after: {
      laptopNote: 'code',
      browser: visitorOk('http://52.14.88.3:3000', 'insecure'),
      flows: [REQ_IP],
    },
  },
  {
    id: 'domain',
    title: 'Give it a name',
    kind: 'fix',
    situation: 'The store is live at http://52.14.88.3:3000. You bought shop.com from a registrar.',
    problem: 'Nobody will remember 52.14.88.3. And if you ever move servers, every link breaks.',
    question: 'Which DNS record makes shop.com point to 52.14.88.3?',
    adds: ['dns'],
    options: [
      {
        id: 'a',
        text: 'An A record: shop.com → 52.14.88.3',
        verdict: 'best',
        feedback: 'A = name → IPv4 address. Browsers now look up shop.com, get 52.14.88.3, and connect. Move servers later? Change one record.',
      },
      {
        id: 'cname',
        text: 'A CNAME record: shop.com → 52.14.88.3',
        verdict: 'wrong',
        feedback: 'A CNAME points a name to another name (www.shop.com → shop.com), never to an IP address. DNS providers will reject it.',
      },
      {
        id: 'mx',
        text: 'An MX record: shop.com → 52.14.88.3',
        verdict: 'wrong',
        feedback: 'MX records say where email for the domain goes. Browsers ignore them, so shop.com still leads nowhere.',
        outcome: {
          laptopNote: 'code',
          show: ['dns'],
          browser: { who: 'visitor', url: 'http://shop.com:3000', security: 'none', ok: false, title: "This site can't be reached", body: "shop.com's server IP address could not be found." },
          flows: [{ label: 'Lookup finds no A record', path: ['friend', 'dns'], failAt: 'dns' }],
        },
      },
    ],
    rule: 'A → IP address. CNAME → another name. MX → email. TTL controls how long answers are cached: lower it a day before moving servers.',
    before: {
      laptopNote: 'code',
      browser: visitorOk('http://52.14.88.3:3000', 'insecure'),
      flows: [REQ_IP],
    },
    after: {
      laptopNote: 'code',
      browser: visitorOk('http://shop.com:3000', 'insecure'),
      flows: [REQ_DNS],
    },
  },
  {
    id: 'nginx',
    title: 'Lose the :3000',
    kind: 'fix',
    situation: 'Visitors have to type http://shop.com:3000, and your app is exposed straight to the internet.',
    problem: 'Real sites live on port 80 (HTTP) and 443 (HTTPS), with no port in the URL. Your app listens on 3000.',
    question: 'How do visitors reach the app without typing a port?',
    adds: ['nginx'],
    options: [
      {
        id: 'root-80',
        text: 'Run the app itself on port 80 (as root)',
        verdict: 'wrong',
        feedback: 'It loads — but ports below 1024 need root, so any bug in your app now has full control of the machine. Your app would also have to handle HTTPS itself, and only one program can own port 80.',
        outcome: {
          laptopNote: 'code',
          browser: visitorOk('http://shop.com', 'insecure', 'Loads… but the app runs as root. One exploit = the whole server.'),
          flows: [{ label: 'Visitor → app running as root', path: ['friend', 'dns', 'friend', 'app'], danger: true }],
        },
      },
      {
        id: 'nginx',
        text: 'Put Nginx on port 80 and forward requests to the app on 3000',
        verdict: 'best',
        feedback: 'Nginx is a reverse proxy: it faces the internet, the app stays private inside the machine. It can also serve images/CSS directly, handle HTTPS, and route many domains to many apps.',
      },
      {
        id: 'bookmark',
        text: 'Leave it — tell visitors to bookmark the :3000 URL',
        verdict: 'wrong',
        feedback: 'Nobody types ports, links look broken, and the app still faces the internet directly with nothing in front of it.',
      },
    ],
    rule: `Never expose your app directly. A reverse proxy (Nginx) in front owns ports 80/443, TLS and static files. In ${levelRef('growing-traffic')} this same Nginx becomes a load balancer.`,
    before: {
      laptopNote: 'code',
      browser: visitorOk('http://shop.com:3000', 'insecure'),
      flows: [REQ_DNS],
    },
    after: {
      laptopNote: 'code',
      browser: visitorOk('http://shop.com', 'insecure'),
      flows: [REQ_NGINX],
    },
  },
  {
    id: 'https',
    title: 'Get the padlock',
    kind: 'fix',
    situation: 'The store loads at http://shop.com. Customers type their passwords into the login form.',
    problem: 'The browser shows "Not secure". Everything — including passwords — travels as readable text.',
    question: 'How do you get HTTPS?',
    adds: ['cert'],
    options: [
      {
        id: 'letsencrypt',
        text: 'Free Let\'s Encrypt certificate via certbot, installed in Nginx; port 80 redirects to 443',
        verdict: 'best',
        feedback: 'Let\'s Encrypt checks you control shop.com (that\'s why DNS had to come first), issues a certificate, and certbot renews it every ~90 days. Nginx handles the encryption; your app doesn\'t change.',
      },
      {
        id: 'paid',
        text: 'Buy a certificate from a commercial authority',
        verdict: 'works',
        feedback: 'Same encryption, same padlock — you just pay for it. Worth it only when you need extras like organisation validation or a warranty.',
      },
      {
        id: 'self-signed',
        text: 'Generate a self-signed certificate yourself',
        verdict: 'wrong',
        feedback: 'Encrypted, but no trusted authority vouches for it, so every browser shows a full-page warning. Fine for internal testing, never for customers.',
        outcome: {
          laptopNote: 'code',
          browser: { who: 'visitor', url: 'https://shop.com', security: 'warning', ok: false, title: 'Your connection is not private', body: 'NET::ERR_CERT_AUTHORITY_INVALID — attackers might be trying to steal your information.' },
          flows: [{ label: 'Browser rejects the untrusted certificate', path: ['friend', 'dns', 'friend', 'nginx'], failAt: 'nginx' }],
        },
      },
    ],
    rule: 'HTTPS everywhere, always. DNS must point to the server first, then get the certificate, then let the reverse proxy serve it. Port 80 only exists to redirect to 443.',
    before: {
      laptopNote: 'code',
      browser: visitorOk('http://shop.com', 'insecure'),
      flows: [REQ_NGINX],
    },
    after: {
      laptopNote: 'code',
      browser: visitorOk('https://shop.com', 'secure'),
      flows: [REQ_NGINX],
    },
  },
  {
    id: 'systemd',
    title: 'Keep it alive',
    kind: 'fix',
    situation: 'You started the app by typing "node app.js" in an SSH session. 2:00 AM: the app crashes on a bad request.',
    problem: 'Nginx is still up, but there is nothing behind it. Visitors get "502 Bad Gateway" until you wake up.',
    question: 'What brings the app back automatically?',
    adds: ['systemd'],
    options: [
      {
        id: 'systemd',
        text: 'Run it as a systemd service with Restart=always',
        verdict: 'best',
        feedback: 'systemd is built into Linux: it starts the app on boot and restarts it within seconds of a crash. Downtime goes from hours to seconds.',
      },
      {
        id: 'pm2',
        text: 'Use PM2 (a Node.js process manager)',
        verdict: 'works',
        feedback: 'Does the same job, plus nice extras like log viewing and running several copies. Use it if you prefer — the idea is identical.',
      },
      {
        id: 'nohup',
        text: 'Start it with "nohup node app.js &" so closing SSH doesn\'t kill it',
        verdict: 'wrong',
        feedback: 'Survives you logging out — but not a crash or a reboot. Nothing restarts it.',
      },
      {
        id: 'manual',
        text: 'Check the site each morning and restart it by hand',
        verdict: 'wrong',
        feedback: 'The store is down from 2 AM until you notice. Every hour down is lost orders.',
      },
    ],
    rule: 'Never run production apps by hand. A process manager (systemd, PM2) starts them on boot and restarts them on crash.',
    before: {
      laptopNote: 'code',
      browser: { who: 'visitor', url: 'https://shop.com', security: 'secure', ok: false, title: '502 Bad Gateway', body: 'nginx — the app behind it is not running.' },
      flows: [{ label: 'Nginx forwards to… nothing', path: ['friend', 'dns', 'friend', 'nginx', 'app'], failAt: 'app' }],
    },
    after: {
      laptopNote: 'code',
      browser: visitorOk('https://shop.com', 'secure', 'Back up — the process manager restarted the app 2 seconds after the crash.'),
      flows: [REQ_NGINX],
    },
  },
  {
    id: 'database',
    title: 'Save data safely',
    kind: 'fix',
    situation: 'Orders are saved to a file, orders.json. Two customers check out at the same moment.',
    problem: 'Both writes hit the file at once — one order is lost and the file is corrupted.',
    question: 'How should the store save data?',
    adds: ['db', 'firewall'],
    options: [
      {
        id: 'local-db',
        text: 'PostgreSQL on the same server, port 5432 local-only; firewall opens only 22, 80, 443',
        verdict: 'best',
        feedback: 'A database handles simultaneous writes, fast lookups and all-or-nothing transactions. Only your app (on the same machine) can reach it. Add automatic daily backups from day one.',
      },
      {
        id: 'managed-db',
        text: 'A managed database service (e.g. AWS RDS)',
        verdict: 'works',
        feedback: 'Great choice once budget allows: backups, updates and failover are handled for you. Same idea — a real database, not reachable from the open internet.',
      },
      {
        id: 'open-db',
        text: 'PostgreSQL with port 5432 open to the internet, so you can connect from your laptop',
        verdict: 'wrong',
        feedback: 'Bots scan the whole internet for open database ports around the clock. This is one of the most common causes of data leaks. Use an SSH tunnel through port 22 instead.',
        outcome: {
          laptopNote: 'code',
          show: ['db', 'bot'],
          browser: visitorOk('https://shop.com', 'secure', 'The site works… while a bot downloads your customer table.'),
          flows: [
            REQ_FULL,
            { label: 'Internet bot → open port 5432', path: ['bot', 'db'], danger: true },
          ],
        },
      },
      {
        id: 'careful-json',
        text: 'Keep orders.json, just write to it more carefully',
        verdict: 'wrong',
        feedback: 'You would be re-inventing a database badly: locking, crash safety, indexes. Finding "all orders by user 42" still means reading the whole file.',
      },
    ],
    rule: 'Real data goes in a real database. Keep it unreachable from the internet: firewall open only on 22 (SSH), 80 and 443. Back it up automatically.',
    before: {
      laptopNote: 'code',
      browser: { who: 'visitor', url: 'https://shop.com/checkout', security: 'secure', ok: false, title: 'Something went wrong', body: 'Your order could not be saved. (orders.json is corrupted)' },
      flows: [{ label: 'Two checkouts write orders.json at once', path: ['friend', 'dns', 'friend', 'nginx', 'app'], failAt: 'app' }],
    },
    after: {
      laptopNote: 'code',
      browser: visitorOk('https://shop.com/checkout', 'secure', 'Order #812 confirmed. Thank you!'),
      flows: [REQ_FULL],
    },
  },
  {
    id: 'cicd',
    title: 'Ship updates safely',
    kind: 'fix',
    situation: 'To deploy, you SSH in, git pull, install, build, restart. Friday evening you skip the tests to save time.',
    problem: 'Checkout is broken for every customer — and nobody ran the test that would have caught it.',
    question: 'How should code reach the server?',
    adds: ['ci'],
    options: [
      {
        id: 'cicd',
        text: 'CI/CD: every push runs the tests; only passing code is deployed automatically',
        verdict: 'best',
        feedback: 'Tests run every time, nobody forgets a step, and broken code never reaches customers. Keep the previous version so you can roll back in seconds.',
      },
      {
        id: 'checklist',
        text: 'Write a deploy checklist and follow it every time',
        verdict: 'works',
        feedback: 'Better than nothing for a tiny project — but humans skip steps when tired or rushed. Automate the checklist as soon as you can.',
        outcome: {
          laptopNote: 'checklist ✓',
          show: ['db'],
          browser: visitorOk('https://shop.com/checkout', 'secure', 'Order #813 confirmed — this time. You ran all 9 checklist steps by hand.'),
          flows: [{ label: 'Manual deploy, checklist followed', path: ['laptop', 'app'] }, REQ_FULL],
        },
      },
      {
        id: 'less-often',
        text: 'Deploy less often, so there are fewer chances to break things',
        verdict: 'wrong',
        feedback: 'The opposite happens: rare deploys are big deploys, with more changes that can break and harder to find which one did.',
      },
      {
        id: 'edit-live',
        text: 'Edit the files directly on the server to fix things fast',
        verdict: 'wrong',
        feedback: 'Now the server differs from your git repo. The next deploy overwrites your fix, and nobody knows what is actually running.',
      },
    ],
    rule: 'Deploys should be boring and repeatable: git push → tests → deploy → easy rollback. If deploying is scary, you will deploy less, and each deploy gets riskier.',
    before: {
      laptopNote: 'code',
      browser: { who: 'visitor', url: 'https://shop.com/checkout', security: 'secure', ok: false, title: '500 Internal Server Error', body: 'TypeError: cannot read property "total" of undefined' },
      flows: [
        { label: 'Manual deploy, tests skipped', path: ['laptop', 'app'] },
        { label: 'Checkout crashes', path: ['friend', 'dns', 'friend', 'nginx', 'app'], failAt: 'app' },
      ],
    },
    after: {
      laptopNote: 'git push',
      browser: visitorOk('https://shop.com/checkout', 'secure', 'Order #813 confirmed. (The broken build was stopped by CI — customers never saw it.)'),
      flows: [{ label: 'git push → tests pass → deploy', path: ['laptop', 'ci', 'app'] }, REQ_FULL],
    },
  },
  {
    id: 'monitoring',
    title: 'Know when it breaks',
    kind: 'fix',
    situation: 'A payment provider starts timing out at 1 AM. 12% of checkouts fail.',
    problem: 'You find out at 9 AM from an angry email. Eight hours of lost orders, and no record of what happened.',
    question: 'How do you find out first — and know why?',
    adds: ['monitor'],
    options: [
      {
        id: 'observability',
        text: 'Logs + metrics + alerts: error rate over 5% for 5 minutes pages you',
        verdict: 'best',
        feedback: 'Logs tell you what happened, metrics show how the system is doing right now, alerts wake you up. You are notified at 1:05 instead of 9:00.',
      },
      {
        id: 'uptime',
        text: 'An external uptime check that pings the homepage every minute',
        verdict: 'wrong',
        feedback: 'Catches "the whole site is down" — but the homepage loads fine here; only checkout fails, so the check stays green all night. Good to have, not enough alone.',
        outcome: {
          laptopNote: 'asleep 💤',
          show: ['monitor'],
          browser: { who: 'visitor', url: 'https://shop.com/checkout', security: 'secure', ok: false, title: 'Payment failed', body: 'Still failing at 9 AM. The uptime check says "all good" — the homepage loads fine.' },
          flows: [
            { label: 'Uptime check → homepage: 200 OK', path: ['monitor', 'nginx', 'app'] },
            { label: 'Checkout still fails', path: ['friend', 'dns', 'friend', 'nginx', 'app'], failAt: 'app' },
          ],
        },
      },
      {
        id: 'morning',
        text: 'Look at the site every morning',
        verdict: 'wrong',
        feedback: 'You would see a working homepage and miss the failing checkouts completely.',
      },
      {
        id: 'emails',
        text: 'Customers will email if something is wrong',
        verdict: 'wrong',
        feedback: 'Most customers just leave. By the time someone emails, the damage is done — and you still have no idea why.',
      },
    ],
    rule: `Logs (what happened), metrics (how is it doing), alerts (wake me up). Every symptom in later levels — "DB CPU at 90%", "p99 latency 2s" — is something you only see through metrics.`,
    before: {
      laptopNote: 'asleep 💤',
      browser: { who: 'visitor', url: 'https://shop.com/checkout', security: 'secure', ok: false, title: 'Payment failed', body: 'Please try again later. (12% of checkouts since 1:00 AM)' },
      flows: [{ label: 'Checkout fails silently', path: ['friend', 'dns', 'friend', 'nginx', 'app'], failAt: 'app' }],
    },
    after: {
      laptopNote: 'alert 🔔',
      browser: visitorOk('https://shop.com/checkout', 'secure', 'Order #814 confirmed. (Alert at 1:05, fallback payment provider on by 1:20.)'),
      flows: [{ label: 'Error rate 12% → alert', path: ['app', 'monitor', 'laptop'] }, REQ_FULL],
    },
  },
];

// ---------- derived view ----------

export interface View {
  visible: Set<CompId>;
  state: SimState;
  mode: 'before' | 'after' | 'outcome';
}

export function getOption(step: Step, optionId: string | null | undefined): Option | undefined {
  return optionId ? step.options.find((o) => o.id === optionId) : undefined;
}

function applyStep(set: Set<CompId>, step: Step) {
  step.adds?.forEach((c) => set.add(c));
  step.removes?.forEach((c) => set.delete(c));
}

/** Everything on screen for a step, given which option (if any) was picked. */
export function viewFor(stepIndex: number, optionId?: string | null): View {
  const step = STEPS[stepIndex];
  const visible = new Set<CompId>(['laptop']);
  for (let i = 0; i < stepIndex; i++) {
    STEPS[i].setup?.forEach((c) => visible.add(c));
    applyStep(visible, STEPS[i]);
  }
  step.setup?.forEach((c) => visible.add(c));

  const option = getOption(step, optionId);
  let state: SimState;
  let mode: View['mode'];
  if (!option) {
    state = step.before;
    mode = 'before';
  } else if (option.outcome) {
    state = option.outcome;
    mode = 'outcome';
  } else if (option.verdict === 'wrong') {
    state = step.before;
    mode = 'before';
  } else {
    state = step.after;
    mode = 'after';
  }
  if (mode === 'after') applyStep(visible, step);
  state.show?.forEach((c) => visible.add(c));
  if (visible.has('app') || visible.has('nginx') || visible.has('db')) visible.add('vps');

  return { visible, state, mode };
}

/** Everything visible once the final step is fixed: the complete setup. */
export function finalView(): View {
  const last = STEPS.length - 1;
  const best = STEPS[last].options.find((o) => o.verdict === 'best')!;
  return viewFor(last, best.id);
}
