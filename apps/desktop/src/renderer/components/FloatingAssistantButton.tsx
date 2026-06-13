import { useState } from 'react';

interface Props {
  onOpen: () => void;
}

export function FloatingAssistantButton({ onOpen }: Props) {
  const [pos] = useState({ x: 16, y: 16 });
  return (
    <button
      className="btn btn-primary"
      style={{
        position: 'fixed',
        right: pos.x,
        bottom: pos.y,
        width: 44,
        height: 44,
        borderRadius: '50%',
        fontWeight: 700,
        zIndex: 9999,
      }}
      onClick={onOpen}
      title="Open V"
    >
      V
    </button>
  );
}
