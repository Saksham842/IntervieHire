import { document, window } from './runtime';
import { AppState } from './state';
import { escapeHTML } from './escape';

// "Jobs on your career page" — the dashboard-side record + quick-manage panel for
// the Career view. Mirrors the dashboard's static-shell + dynamic-render
// convention (like `#jobs-list-container` + `renderJobCards()`): the HTML shell
// owns a static `#career-jobs-list` container; `renderCareerJobs()` fills it.
//
// A leaf module by design — it imports only AppState + escapeHTML and reuses the
// global `window.handleJobKebab` for the Remove action, so nothing it touches
// imports it back (no cycles). Every `innerHTML` set is followed by its bind, per
// the mandatory dashboard build→bind pairing.

// The jobs currently live on the public career page. This predicate mirrors the
// backend public career query EXACTLY (public.py: is_job_listed==True AND
// status=='published'), so the panel is a faithful record of what a candidate
// actually sees at /careers/<subdomain> — it never claims a job is live that isn't.
function careerJobs() {
  return AppState.jobs.filter(j => j.listedOnCareer === true && j.status === 'published');
}

// Build the panel's inner HTML: a <ul> of career-live jobs, or an empty state.
// `careerUrl` is the public page base (https://interviehire.com/careers/<sub>);
// it's empty when no subdomain is known yet, which renders "View live" disabled.
export function buildCareerJobsPanel(jobs, careerUrl) {
  if (!jobs.length) {
    return `<div class="career-jobs-empty">No jobs are on your career page yet — publish a job to add it here.</div>`;
  }

  const rows = jobs.map(job => {
    const name = escapeHTML(job.cardName || job.roleName || 'Untitled role');
    const status = String(job.status || 'published');
    const badge = `<span class="status-badge ${escapeHTML(status)}"><span class="status-badge-dot"></span>${escapeHTML(status.charAt(0).toUpperCase() + status.slice(1))}</span>`;
    const posted = job.created ? `<span class="career-job-date">${escapeHTML(String(job.created))}</span>` : '';
    const viewLive = careerUrl
      ? `<a class="career-job-view" href="${escapeHTML(careerUrl)}" target="_blank" rel="noopener">View live ↗</a>`
      : `<span class="career-job-view is-disabled" title="Set your career page URL to view live">View live ↗</span>`;
    const jid = escapeHTML(String(job.id));
    return `
      <li class="career-job-row" data-job-id="${jid}">
        <div class="career-job-main">
          <span class="career-job-name">${name}</span>
          ${badge}
          ${posted}
        </div>
        <div class="career-job-actions">
          ${viewLive}
          <button type="button" class="btn-remove-career" data-job-id="${jid}">Remove from career page</button>
        </div>
      </li>`;
  }).join('');

  return `<ul class="career-jobs-ul">${rows}</ul>`;
}

// Wire the Remove buttons. Every row is a currently-listed job, so reusing the
// existing kebab `career-page` toggle unlists it — persisting {is_job_listed:false}
// to the backend, optimistic-updating AppState, toasting, and re-rendering both the
// Jobs view and (via the kebab's own renderCareerJobs hook) this panel.
export function bindCareerJobsPanel(root) {
  if (!root) return;
  root.querySelectorAll('.btn-remove-career').forEach(btn => {
    btn.addEventListener('click', () => {
      const jobId = btn.getAttribute('data-job-id');
      if (jobId && typeof window.handleJobKebab === 'function') {
        window.handleJobKebab(jobId, 'career-page');
      }
    });
  });
}

// Hydrate / re-render entry point. Finds the static `#career-jobs-list` shell
// (no-op if we're not on the Career view), computes the public URL from the
// authoritative subdomain, fills the container, then ALWAYS calls the bind so the
// Remove buttons are live (the mandatory dashboard build→bind pairing).
export function renderCareerJobs() {
  const container = document.getElementById('career-jobs-list');
  if (!container) return; // not on the Career view — nothing to render
  const sub = (AppState.careerSubdomain || '').trim();
  const careerUrl = sub ? `https://interviehire.com/careers/${sub}` : '';
  const live = careerJobs();
  container.innerHTML = buildCareerJobsPanel(live, careerUrl);
  bindCareerJobsPanel(container);
  // Keep the status-card metric honest: it reflects the real live-job count, not
  // a fabricated figure.
  const countEl = document.getElementById('career-live-count');
  if (countEl) countEl.textContent = String(live.length);
}
