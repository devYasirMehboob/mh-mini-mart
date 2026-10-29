import { useRef, useCallback } from "react";
import { getPosProducts } from "../api/posApi";
import { findCachedProductByBarcode } from "../utils/idb";

/**
 * Handles hardware barcode scans by immediately looking up the barcode
 * and adding the product to the cart. Uses a simple ref-based queue to
 * avoid React state complexity causing dropped scans.
 * Supports offline emergency mode by querying IndexedDB when offline.
 */
export default function useScanQueue(cart, notify, onBarcodeNotFound = null) {
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
        let productToAdd = null;
        if (!navigator.onLine) {
          productToAdd = await findCachedProductByBarcode(barcode);
        } else {
          try {
            const data = await getPosProducts({ barcode: barcode.toLowerCase() });
            if (data.products && data.products.length > 0) {
              productToAdd = data.products[0];
            }
          } catch (apiErr) {
            // Fallback to offline cached product if API request fails
            productToAdd = await findCachedProductByBarcode(barcode);
            if (!productToAdd && apiErr.response?.status === 404 && onBarcodeNotFound) {
              onBarcodeNotFound(barcode);
              continue;
            }
          }
        }

        if (productToAdd) {
          const result = cartRef.current.addProduct(productToAdd);
          if (!result.ok) {
            notifyRef.current(result.message, "error");
          }
        } else {
          if (onBarcodeNotFound) {
            onBarcodeNotFound(barcode);
          } else {
            notifyRef.current(
              `No product found for barcode "${barcode}".`,
              "error"
            );
          }
        }
      } catch (failure) {
        notifyRef.current(
          failure.message || `No product found for barcode "${barcode}".`,
          "error"
        );
      } finally {
        processingRef.current = false;
      }
    }
  }, [onBarcodeNotFound]);

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
