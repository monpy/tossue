import type { JSX } from "preact";
import type { MediaItem } from "../../../shared/types";

export interface MediaGridProps {
  items: MediaItem[];
  onRemove: (id: string) => void;
}

export function MediaGrid({ items, onRemove }: MediaGridProps): JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <div class="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          class="relative aspect-video rounded-lg overflow-hidden bg-surface-strong"
        >
          <button
            type="button"
            class="absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
            onClick={() => onRemove(item.id)}
            aria-label="Remove"
          >
            ×
          </button>
          {item.type === "image" ? (
            <img
              src={item.dataUrl}
              class="w-full h-full object-cover"
              alt=""
            />
          ) : (
            <video
              src={item.dataUrl}
              class="w-full h-full object-cover"
              controls
              playsInline
            />
          )}
        </div>
      ))}
    </div>
  );
}
