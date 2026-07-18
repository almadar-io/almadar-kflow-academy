import React, { useEffect, useState } from 'react';
import { useEventBus } from '@almadar/ui';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import { PeerModal } from '../../../../design-system/organisms/PeerModal';
import { ConceptChatModal } from '../../../../design-system/organisms/ConceptChatModal';
import type { NodeKey } from '@kflow-academy/shared';

/**
 * Single global handler for UI:PEER_CONNECT_OPEN: opens PeerModal and navigates to the
 * thread on connect. Mounted once inside the router so any node (dashboard or concept
 * detail) can trigger a connect by emitting the event with a `nodeKey`.
 */
export const ConnectFlowHandler: React.FC = () => {
  const { on } = useEventBus();
  const navigate = useNavigateEvent();
  const [nodeKey, setNodeKey] = useState<NodeKey | null>(null);
  const [chatLabel, setChatLabel] = useState<string | null>(null);

  useEffect(() => {
    const unsub = on('UI:PEER_CONNECT_OPEN', (event) => {
      const nk = event.payload?.nodeKey as NodeKey | undefined;
      if (nk) setNodeKey(nk);
    });
    return () => unsub();
  }, [on]);

  if (!nodeKey && !chatLabel) return null;

  return (
    <>
      {nodeKey && (
        <PeerModal
          nodeKey={nodeKey}
          onClose={() => setNodeKey(null)}
          onConnected={(connectionId) => {
            setNodeKey(null);
            navigate(`/connection/${connectionId}`);
          }}
          onChatWithOriginator={(label) => {
            setNodeKey(null);
            setChatLabel(label);
          }}
        />
      )}
      {chatLabel && (
        <ConceptChatModal conceptLabel={chatLabel} onClose={() => setChatLabel(null)} />
      )}
    </>
  );
};
