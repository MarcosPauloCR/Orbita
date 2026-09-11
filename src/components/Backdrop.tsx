import { PixelStars } from "./PixelStars";

export function Backdrop() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-canvas">
      <PixelStars />
    </div>
  );
}
