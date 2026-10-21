'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// ssr:false — the portal holds auth (role, name, passcode) in client state only,
// so there is nothing meaningful to render on the server.
const AdminApp = dynamic(() => import('../AdminApp'), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<p className="meta-line" style={{ padding: 40 }}>Loading portal…</p>}>
      <AdminApp />
    </Suspense>
  );
}
