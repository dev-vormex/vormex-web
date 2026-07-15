'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Globe2, Loader2, ShieldCheck } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getMyDiscoveryVisibility, updateMyDiscoveryVisibility, type DiscoveryVisibility } from '@/lib/api/publicDiscovery';

export default function DiscoverySettingsPage() {
  const [visibility, setVisibility] = useState<DiscoveryVisibility | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void getMyDiscoveryVisibility().then(setVisibility).catch(() => setMessage('Could not load discovery settings.'));
  }, []);

  const update = async (field: 'webDiscoveryEnabled' | 'aiDiscoveryEnabled', enabled: boolean) => {
    if (!visibility || saving) return;
    const previous = visibility;
    setVisibility({ ...visibility, [field]: enabled });
    setSaving(true); setMessage('');
    try {
      const next = await updateMyDiscoveryVisibility({ [field]: enabled });
      setVisibility(next);
      setMessage('Discovery settings saved. Search engines and AI results will refresh as their caches update.');
    } catch {
      setVisibility(previous); setMessage('Could not save that setting. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-neutral-950">
        <div className="mx-auto max-w-2xl">
          <Link href="/more" className="font-semibold text-blue-600">← Settings</Link>
          <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start gap-4"><div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><ShieldCheck /></div><div><h1 className="text-2xl font-bold">Public search & AI discovery</h1><p className="mt-2 leading-7 text-gray-600 dark:text-neutral-300">Control whether your public profile can appear on search engines and in read-only AI recommendations.</p></div></div>
            {!visibility ? <div className="flex justify-center py-14"><Loader2 className="animate-spin text-blue-600" /></div> : (
              <div className="mt-8 space-y-4">
                <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-gray-200 p-5 dark:border-neutral-700">
                  <span className="flex gap-3"><Globe2 className="mt-0.5 shrink-0 text-blue-600" /><span><span className="block font-semibold">Search engine discovery</span><span className="mt-1 block text-sm leading-6 text-gray-500">Allow your public profile page to be indexed by Google, Bing, and search-enabled assistants.</span></span></span>
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-blue-600" checked={visibility.webDiscoveryEnabled} disabled={saving} onChange={(event) => void update('webDiscoveryEnabled', event.target.checked)} />
                </label>
                <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-gray-200 p-5 dark:border-neutral-700">
                  <span className="flex gap-3"><Bot className="mt-0.5 shrink-0 text-violet-600" /><span><span className="block font-semibold">AI people recommendations</span><span className="mt-1 block text-sm leading-6 text-gray-500">Allow Vormex’s public discovery API and MCP integration to recommend your profile for relevant goals.</span></span></span>
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-violet-600" checked={visibility.aiDiscoveryEnabled} disabled={saving} onChange={(event) => void update('aiDiscoveryEnabled', event.target.checked)} />
                </label>
                <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">Vormex never shares your email, phone number, private messages, connections, contact imports, or precise location through public discovery.</p>
              </div>
            )}
            {message && <p className="mt-5 text-sm text-gray-600 dark:text-neutral-300" role="status">{message}</p>}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
