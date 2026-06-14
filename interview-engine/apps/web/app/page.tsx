import { redirect } from 'next/navigation';

// The candidate engine in the MVP is just the interview pipeline: system test →
// gaze calibration → live avatar interview with proctoring. The recruiter
// dashboard lives in the separate `dashboard/` app, so the engine root sends
// candidates straight into the interview room.
export default function Home() {
  redirect('/interview');
}
