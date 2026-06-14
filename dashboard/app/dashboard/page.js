'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initDashboardPage } from '../../src/dashboard/index.js';
import { html } from '../../src/html/dashboard-crystal';
import { apiMe, apiLogout, isAuthed, clearAuthed } from '../../src/auth-client.js';

const ROLE_LABEL = { super_admin: 'Admin', org_admin: 'Org. Admin', member: 'Member' };

// 401-style messages from the api client; anything else (network/backend down)
// is treated as "unverified" rather than "rejected".
const UNAUTHED_RE = /401|not authenticated|unauthor|credential|user not found/i;

function VerifyingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#020203', color: '#a3a39e', fontFamily: "'Space Grotesk', system-ui, sans-serif", zIndex: 50 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 34, height: 34, margin: '0 auto 14px', borderRadius: '50%', border: '2px solid rgba(212,175,55,0.2)', borderTopColor: '#d4af37', animation: 'ih-auth-spin 0.8s linear infinite' }} />
        <div style={{ fontSize: '0.85rem', letterSpacing: '0.02em' }}>Verifying your session…</div>
      </div>
      <style>{'@keyframes ih-auth-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

export default function DashboardCrystalPage() {
  const router = useRouter();
  // 'checking' → verifying with no prior session; 'authed' → render dashboard.
  const [phase, setPhase] = useState(() => (isAuthed() ? 'authed' : 'checking'));
  const [user, setUser] = useState(null);

  // Authoritative session check against the backend.
  useEffect(() => {
    let cancelled = false;
    const optimistic = isAuthed();

    apiMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setPhase('authed');
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = (err && err.message) || '';
        if (UNAUTHED_RE.test(msg)) {
          clearAuthed();
          router.replace('/login');
        } else if (!optimistic) {
          // No prior session and the backend is unreachable — can't let them in.
          router.replace('/login');
        }
        // else: optimistic session + backend hiccup → stay on the dashboard.
      });

    return () => { cancelled = true; };
  }, [router]);

  // Mount the vanilla dashboard once we're actually showing it.
  useEffect(() => {
    if (phase !== 'authed') return;
    const cleanup = initDashboardPage();
    return () => { if (cleanup) cleanup(); };
  }, [phase]);

  // Reflect the signed-in user into the sidebar profile.
  useEffect(() => {
    if (phase !== 'authed' || !user) return;
    const label = (user.name || user.username || 'Account').trim();
    const nameEl = document.querySelector('.user-profile .user-name');
    const roleEl = document.querySelector('.user-profile .user-role');
    const avatarEl = document.querySelector('.user-profile .user-avatar');
    if (nameEl) nameEl.textContent = label;
    if (roleEl) roleEl.textContent = ROLE_LABEL[user.user_type] || 'Member';
    if (avatarEl) avatarEl.textContent = (label[0] || 'A').toUpperCase();
  }, [phase, user]);

  // Own logout from React — the vanilla sidebar binding is unreliable. Wait a
  // tick for the dashboard's own mount bindings, then replace the button with a
  // clean clone (stripping any prior listener) and bind a real logout.
  useEffect(() => {
    if (phase !== 'authed') return;
    let timer;
    const bind = () => {
      const btn = document.querySelector('.user-profile .btn-logout');
      if (!btn) { timer = setTimeout(bind, 80); return; }
      if (btn.dataset.ihLogout) return;
      const fresh = btn.cloneNode(true);
      btn.replaceWith(fresh);
      fresh.dataset.ihLogout = '1';
      fresh.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        fresh.setAttribute('disabled', '');
        try { await apiLogout(); } catch {}
        router.replace('/login');
      });
    };
    timer = setTimeout(bind, 80);
    return () => clearTimeout(timer);
  }, [phase, router]);

  if (phase !== 'authed') return <VerifyingScreen />;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
