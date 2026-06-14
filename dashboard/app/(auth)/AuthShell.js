// Shared chrome for the auth screens — atmosphere, brand lockup, glass card.
// No interactivity of its own; the login/signup pages own the form state.

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="auth-screen">
      <div className="auth-orb a" aria-hidden="true" />
      <div className="auth-orb b" aria-hidden="true" />

      <section className="auth-card">
        <a href="/" className="auth-brand" aria-label="intervieHire home">
          <span className="auth-logo-dot" />
          <span className="auth-wordmark">intervie<b>Hire</b></span>
        </a>

        <header className="auth-head">
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
        </header>

        {children}

        {footer && <div className="auth-foot">{footer}</div>}
      </section>
    </main>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="auth-error" role="alert">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function SubmitButton({ loading, idle, busy }) {
  return (
    <button type="submit" className="auth-submit" disabled={loading}>
      {loading ? <><span className="auth-spinner" />{busy}</> : idle}
    </button>
  );
}
