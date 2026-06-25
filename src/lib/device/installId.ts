const INSTALL_ID_KEY = 'vx_install_id';
const INSTALL_ID_PATTERN = /^[a-zA-Z0-9._:-]{16,256}$/;

function createInstallId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
}

export function getOrCreateInstallId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(INSTALL_ID_KEY);
    if (existing && INSTALL_ID_PATTERN.test(existing)) {
      return existing;
    }
    const next = createInstallId();
    window.localStorage.setItem(INSTALL_ID_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function getInstallHeaders(): Record<string, string> {
  const installId = getOrCreateInstallId();
  if (!installId) return {};
  return {
    'X-Vormex-Install-Id': installId,
    'X-Vormex-Platform': 'web',
  };
}
