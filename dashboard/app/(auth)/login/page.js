'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell, ErrorBanner, SubmitButton } from '../AuthShell';
import { apiLogin, apiMe, isAuthed } from '../../../src/auth-client';

export default function LoginPage() {
  return <AuthShell initialMode="login" />;
}
