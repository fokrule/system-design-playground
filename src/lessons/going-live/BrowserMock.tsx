import type { Browser } from './scenario';

const SECURITY_LABEL = {
  none: '',
  insecure: '⚠ Not secure',
  secure: '🔒',
  warning: '⛔ Not private',
} as const;

export function BrowserMock({ browser }: { browser: Browser }) {
  return (
    <div className={`browser ${browser.ok ? 'ok' : 'err'}`}>
      <div className="browser-who">{browser.who === 'you' ? 'Your browser' : "Visitor's browser"}</div>
      <div className="browser-bar">
        <span className="dots">
          <i /> <i /> <i />
        </span>
        <span className="url">
          {browser.security !== 'none' && (
            <span className={`sec ${browser.security}`}>{SECURITY_LABEL[browser.security]}</span>
          )}
          {browser.url}
        </span>
      </div>
      <div className="browser-page">
        <strong>{browser.ok ? '✓ ' : '✕ '}{browser.title}</strong>
        <p>{browser.body}</p>
      </div>
    </div>
  );
}
