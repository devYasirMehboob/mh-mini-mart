import { useRef, useCallback } from "react";
import { getPosProducts } from "../api/posApi";


/**
 * Handles hardware barcode scans by immediately looking up the barcode
 * and adding the product to the cart. Uses a simple ref-based queue to
 * avoid React state complexity causing dropped scans.
 */
export default function useScanQueue(cart, notify) {
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const processingRef = useRef(false);
  const queueRef = useRef([]);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    while (queueRef.current.length > 0) {
      const barcode = queueRef.current.shift();
      processingRef.current = true;
      try {
        const data = await getPosProducts({ barcode: barcode.toLowerCase() });
        if (data.products && data.products.length > 0) {
          const result = cartRef.current.addProduct(data.products[0]);
          if (!result.ok) {
            notifyRef.current(result.message, "error");
          }
        }
      } catch (failure) {
        const msg =
          failure.response?.data?.message ||
          `No product found for barcode "${barcode}".`;
        notifyRef.current(msg, "error");
      } finally {
        processingRef.current = false;
      }
    }
  }, []);

  // Debounce map to prevent double-fire from hardware scanners
  const lastScans = useRef(new Map());

  const enqueue = useCallback(
    (barcode) => {
      const value = barcode.trim();
      if (!value) return;

      const now = Date.now();
      if (now - (lastScans.current.get(value) || 0) < 300) return;
      lastScans.current.set(value, now);

      // Cleanup old entries
      if (lastScans.current.size > 50) {
        const entries = [...lastScans.current.entries()];
        lastScans.current.clear();
        entries.slice(-20).forEach(([k, v]) => lastScans.current.set(k, v));
      }

      queueRef.current.push(value);
      processQueue();
    },
    [processQueue]
  );

  return {
    enqueue,
    isProcessing: processingRef.current,
  };
}
