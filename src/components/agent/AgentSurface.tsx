'use client';

import { AgentModeOverlay } from './AgentModeOverlay';
import { useAgent } from './AgentContext';

export function AgentSurface() {
  const { isOpen, closeAgent } = useAgent();

  return <AgentModeOverlay isOpen={isOpen} onClose={closeAgent} />;
}
