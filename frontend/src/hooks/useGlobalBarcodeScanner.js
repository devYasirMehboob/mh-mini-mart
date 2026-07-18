import { useEffect, useRef } from "react";

/**
 * Listens for rapid keystrokes that indicate a hardware barcode scanner.
 * Triggers the onScan callback when a scan is completed (Enter key).
 *
 * Uses a stable ref for the callback so the event listener is only
 * added ONCE (on mount) and never removed/re-added on re-renders.
 * This prevents keystrokes from being dropped during React re-renders.
 */
const shiftMap = {
  "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
  "^": "6", "&": "7", "*": "8", "(": "9", ")": "0"
};

function normalizeBarcode(scanned) {
  return scanned.split('').map(c => shiftMap[c] || c).join('');
}

export default function useGlobalBarcodeScanner(onScan) {
  const buffer = useRef("");
  const lastKeyTime = useRef(0);
  // Always hold the latest onScan without re-binding the listener
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const gap = now - lastKeyTime.current;

      // Gap > 50ms between chars = human typing, not a scanner burst.
      // BC-9000G sends chars at ~5ms intervals.
      if (gap > 50) {
        buffer.current = "";
      }

      lastKeyTime.current = now;

      if (e.key === "Enter") {
        const scanned = normalizeBarcode(buffer.current);
        buffer.current = "";
        if (scanned.length >= 3) {
          // Valid scan — fire callback and stop the Enter from submitting a form
          e.preventDefault();
          onScanRef.current(scanned);
        }
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    // Add once on mount, remove on unmount — never re-added on re-renders
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
