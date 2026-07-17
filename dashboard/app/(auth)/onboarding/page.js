"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, ErrorBanner, SubmitButton } from "../AuthShell";
import {
	apiOnboarding,
	apiMe,
	isAuthed,
	clearAuthed,
} from "../../../src/auth-client";

export default function OnboardingPage() {
	const router = useRouter();
	const [form, setForm] = useState({
		org_name: "",
		domain: "",
		contact_email: "",
		website_link: "",
		location: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [ready, setReady] = useState(false);

	// Guard: redirect to /login if not authed, redirect to /dashboard if already onboarded.
	useEffect(() => {
		if (!isAuthed()) {
			router.replace("/login");
			return;
		}
		let cancelled = false;
		apiMe()
			.then((me) => {
				if (cancelled) return;
				if (me && !me.onboarding_required) {
					router.replace("/dashboard");
					return;
				}
				setReady(true);
			})
			.catch(() => {
				if (!cancelled) {
					clearAuthed();
					router.replace("/login");
				}
			});
		return () => {
			cancelled = true;
		};
	}, [router]);

	const set = (key) => (e) => {
		setForm((f) => ({ ...f, [key]: e.target.value }));
	};

	async function onSubmit(e) {
		e.preventDefault();
		if (loading) return;
		if (!form.org_name.trim()) {
			setError("Organisation name is required.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			await apiOnboarding({
				org_name: form.org_name.trim(),
				domain: form.domain.trim() || undefined,
				contact_email: form.contact_email.trim() || undefined,
				website_link: form.website_link.trim() || undefined,
				location: form.location.trim() || undefined,
			});
			router.replace("/dashboard");
		} catch (err) {
			const msg =
				(err && err.message) ||
				"Could not complete onboarding. Please try again.";
			if (/already set up/i.test(msg)) {
				router.replace("/dashboard");
				return;
			}
			setError(msg);
			setLoading(false);
		}
	}

	if (!ready) return null;

	return (
		<AuthShell
			title="Set up your workspace"
			subtitle="Tell us a bit about your organisation to get started."
			footer={
				<>
					Wrong account?{" "}
					<a className="auth-link" href="/login">
						Sign in with a different email
					</a>
				</>
			}
		>
			<form className="auth-form" onSubmit={onSubmit} noValidate>
				<ErrorBanner message={error} />

				<div className="auth-field">
					<label className="auth-label" htmlFor="org_name">
						Organisation name <span style={{ color: "#f87171" }}>*</span>
					</label>
					<input
						id="org_name"
						className="auth-input"
						type="text"
						placeholder="Acme Corp"
						value={form.org_name}
						onChange={set("org_name")}
						autoFocus
						required
					/>
				</div>

				<div className="auth-field">
					<label className="auth-label" htmlFor="domain">
						Domain (optional)
					</label>
					<input
						id="domain"
						className="auth-input"
						type="text"
						placeholder="acme.com"
						value={form.domain}
						onChange={set("domain")}
					/>
				</div>

				<div className="auth-field">
					<label className="auth-label" htmlFor="contact_email">
						Contact email (optional)
					</label>
					<input
						id="contact_email"
						className="auth-input"
						type="email"
						placeholder="hr@acme.com"
						value={form.contact_email}
						onChange={set("contact_email")}
					/>
				</div>

				<div className="auth-field">
					<label className="auth-label" htmlFor="website_link">
						Website (optional)
					</label>
					<input
						id="website_link"
						className="auth-input"
						type="text"
						placeholder="https://acme.com"
						value={form.website_link}
						onChange={set("website_link")}
					/>
				</div>

				<div className="auth-field">
					<label className="auth-label" htmlFor="location">
						Location (optional)
					</label>
					<input
						id="location"
						className="auth-input"
						type="text"
						placeholder="Bengaluru, India"
						value={form.location}
						onChange={set("location")}
					/>
				</div>

				<SubmitButton
					loading={loading}
					idle="Complete setup →"
					busy="Setting up…"
				/>
			</form>
		</AuthShell>
	);
}
