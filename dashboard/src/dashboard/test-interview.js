// Test Interview — a dev launcher that runs a full functional interview for a
// job's authored blueprint in the candidate room (ai_components/apps/web), so
// the recruiter can see exactly what a candidate experiences while developing.
//
// api mode only: it hits POST /api/jobs/{id}/test-session (creates a throwaway
// tagged test candidate + a SCHEDULED-now InterviewSession from the blueprint,
// excluded from the funnel/analytics) and opens the candidate room at
// ${ENGINE_WEB_URL}/interview?sessionId=… (defaults to :3001 — apps/web hardcodes
// :3000 which collides with the dashboard).

import { document, window } from './runtime.js';
import { escapeHTML } from './escape.js';
import { soundEngine } from './sound.js';
import { showPremiumToast } from './sourcing.js';
import { isApiMode, apiCreateTestSession, ENGINE_WEB_URL } from './api.js';

const PREVIEW_LIMIT = 5;

function functionalStats(job) {
  const topics = (job.functionalParameters && Array.isArray(job.functionalParameters.topics))
    ? job.functionalParameters.topics : [];
  const questions = topics.flatMap((t) => Array.isArray(t.questions) ? t.questions : []);
  const minutes = questions.reduce((sum, q) => sum + (Number(q.estimatedMinutes) || 4), 0);
  return { topicCount: topics.length, questions, minutes };
}

export function renderTestInterviewPane(job, container) {
  if (!container) return;

  // Local mode has no backend to spin a session against — keep it honest.
  if (!isApiMode()) {
    container.innerHTML = `
      <div class="ti-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <p>Test interviews run against the live backend.</p>
        <span class="ti-empty-sub">Switch the dashboard to API mode to launch a real interview from this job's blueprint.</span>
      </div>`;
    return;
  }

  const { topicCount, questions, minutes } = functionalStats(job);
  const ready = questions.length > 0;
  const roleLabel = escapeHTML(job.cardName || job.roleName || 'this role');

  const previewRows = questions.slice(0, PREVIEW_LIMIT).map((q, i) => `
    <li class="ti-preview-row">
      <span class="ti-preview-num">${i + 1}</span>
      <span class="ti-preview-text">${escapeHTML(q.prompt || 'Untitled question')}</span>
      ${q.difficulty ? `<span class="ti-preview-diff ti-diff-${escapeHTML((q.difficulty || '').toLowerCase())}">${escapeHTML(q.difficulty)}</span>` : ''}
    </li>`).join('');
  const moreCount = Math.max(0, questions.length - PREVIEW_LIMIT);

  container.innerHTML = `
    <div class="ti-pane">
      <div class="ti-hero card-glass">
        <div class="ti-hero-glow"></div>
        <div class="ti-hero-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <div class="ti-hero-body">
          <span class="ti-eyebrow">Developer tool</span>
          <h3 class="ti-title">Run a test interview</h3>
          <p class="ti-subtitle">Launch the full candidate experience for <strong>${roleLabel}</strong> using the functional blueprint you authored — questions, follow-ups, and scoring, exactly as a real candidate would see it. This test run is excluded from the funnel and analytics.</p>

          <div class="ti-stats">
            <div class="ti-stat"><span class="ti-stat-val">${topicCount}</span><span class="ti-stat-label">topic${topicCount === 1 ? '' : 's'}</span></div>
            <div class="ti-stat"><span class="ti-stat-val">${questions.length}</span><span class="ti-stat-label">question${questions.length === 1 ? '' : 's'}</span></div>
            <div class="ti-stat"><span class="ti-stat-val">~${minutes}</span><span class="ti-stat-label">min</span></div>
          </div>

          ${ready ? `
            <button class="ti-launch-btn" id="ti-launch-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              Launch test interview
            </button>
            <p class="ti-hint">Opens the candidate room in a new tab (<code>${escapeHTML(ENGINE_WEB_URL)}</code>).</p>
            <div class="ti-result" id="ti-result" hidden></div>
          ` : `
            <div class="ti-warn">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>No functional questions yet. Author a blueprint in the <strong>Questions Generator</strong> tab, then come back to launch a test interview.</span>
            </div>
          `}
        </div>
      </div>

      ${ready ? `
        <div class="ti-preview card-glass">
          <div class="ti-preview-head">
            <h4>What the candidate will be asked</h4>
            <span class="ti-preview-count">${questions.length} question${questions.length === 1 ? '' : 's'}</span>
          </div>
          <ol class="ti-preview-list">${previewRows}</ol>
          ${moreCount > 0 ? `<p class="ti-preview-more">+ ${moreCount} more in the full run</p>` : ''}
        </div>
      ` : ''}
    </div>`;

  const launchBtn = container.querySelector('#ti-launch-btn');
  if (launchBtn) {
    launchBtn.addEventListener('click', () => launchTestInterview(job, launchBtn, container));
  }
}

async function launchTestInterview(job, btn, container) {
  soundEngine.playChime([392, 523.25], 0.1, 0.1);
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('is-loading');
  btn.innerHTML = `<span class="ti-spinner"></span> Preparing interview…`;

  try {
    const sessionId = await apiCreateTestSession(job.id);
    if (!sessionId) throw new Error('No session id returned');

    const url = `${ENGINE_WEB_URL}/interview?sessionId=${encodeURIComponent(sessionId)}`;
    const opened = window.open(url, '_blank');

    const result = container.querySelector('#ti-result');
    if (result) {
      result.hidden = false;
      result.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Test session ready.</span>
        <a href="${escapeHTML(url)}" target="_blank" rel="noopener">Open candidate room ↗</a>`;
    }
    showPremiumToast(
      opened ? 'Test interview launched in a new tab.' : 'Test session ready — use the link below (popup was blocked).',
      'success'
    );
    soundEngine.playChime([523.25, 659.25, 783.99], 0.14, 0.08);
  } catch (err) {
    console.error('Test interview launch failed:', err);
    showPremiumToast(`Could not launch test interview. ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    btn.innerHTML = original;
  }
}
