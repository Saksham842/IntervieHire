import { initRuntime, disposeRuntime, setTimeout } from './runtime.js';
import { AppState } from './state.js';
import { navigateToJobDetail, navigateToJobStage } from './job-detail.js';
import { openReportDrawerForCandidate } from './report.js';
import { openJobFlowView } from './job-flow.js';
import { navigateToSourcing, removeCandidateFromQueue } from './sourcing.js';
import { initSpotlightShortcuts } from './spotlight.js';
import { initMountBindings } from './mount.js';
import { initUrlSync } from './url-sync.js';
import { navigateToTab, navigateToSubtab } from './navigation.js';
import * as IHApi from './api.js';

export function initDashboardPage() {
  initRuntime();

  window.AppState = AppState;
  window.IHApi = IHApi;
  window.navigateToTab = navigateToTab;
  window.navigateToSubtab = navigateToSubtab;
  window.navigateToJobDetail = navigateToJobDetail;
  window.navigateToJobStage = navigateToJobStage;
  window.openReportDrawerForCandidate = openReportDrawerForCandidate;
  window.openJobFlowView = openJobFlowView;
  window.navigateToSourcing = navigateToSourcing;
  window.removeCandidateFromQueue = removeCandidateFromQueue;

  initSpotlightShortcuts();
  // DOM is already hydrated; the original runtime ran mount bindings on the next tick.
  // initUrlSync runs after initMountBindings so it can patch the window globals that
  // mount.js/index.js expose and intercept sidebar clicks already bound by mount.js.
  setTimeout(initMountBindings, 0);
  setTimeout(initUrlSync, 10);

  return () => {
    disposeRuntime();

    delete window.navigateToTab;
    delete window.navigateToSubtab;
    delete window.navigateToJobDetail;
    delete window.navigateToJobStage;
    delete window.openReportDrawerForCandidate;
    delete window.AppState;
    delete window.IHApi;
    delete window.openJobFlowView;
    delete window.openJobDescriptionDrawer;
    delete window.toggleJobKebab;
    delete window.handleJobKebab;
    delete window.navigateToSourcing;
    delete window.removeCandidateFromQueue;
  };
}
