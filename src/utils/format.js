export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function accentClasses(accent) {
  switch (accent) {
    case 'blue':
      return {
        bg: 'bg-accent-blue',
        bgSoft: 'bg-blue-500/15',
        text: 'text-accent-blue',
        border: 'border-accent-blue',
        ring: 'ring-accent-blue',
        hover: 'hover:bg-blue-600',
        hex: '#3b82f6',
      };
    case 'green':
      return {
        bg: 'bg-accent-green',
        bgSoft: 'bg-emerald-500/15',
        text: 'text-accent-green',
        border: 'border-accent-green',
        ring: 'ring-accent-green',
        hover: 'hover:bg-emerald-600',
        hex: '#10b981',
      };
    case 'orange':
      return {
        bg: 'bg-accent-orange',
        bgSoft: 'bg-orange-500/15',
        text: 'text-accent-orange',
        border: 'border-accent-orange',
        ring: 'ring-accent-orange',
        hover: 'hover:bg-orange-600',
        hex: '#f97316',
      };
    default:
      return {
        bg: 'bg-gray-500',
        bgSoft: 'bg-gray-500/15',
        text: 'text-gray-300',
        border: 'border-gray-500',
        ring: 'ring-gray-500',
        hover: 'hover:bg-gray-600',
        hex: '#6b7280',
      };
  }
}
