import { useState, useRef, useCallback, useEffect } from "react";
import { getPosProducts } from "../api/posApi";
import useCart from "./useCart";

/**
 * Handles rapid hardware barcode scans by queuing them, looking them up sequentially,
 * and adding them to the cart without dropping intentional rapid scans.
 */
export default function useScanQueue(notify) {
  const cart = useCart();
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Keep track of recent scan timestamps to debounce duplicate keydown/submit events
  const lastScans = useRef(new Map());

  const processNext = useCallback(async () => {
    if (isProcessing) return;
    
    setQueue(currentQueue => {
      if (currentQueue.length === 0) return currentQueue;
      
      const nextBarcode = currentQueue[0];
      const remainingQueue = currentQueue.slice(1);
      
      // We must start processing asynchronously outside of setQueue
      setTimeout(async () => {
        setIsProcessing(true);
        try {
          const data = await getPosProducts({ barcode: nextBarcode });
          if (data.products && data.products.length > 0) {
            const product = data.products[0];
            const result = cart.addProduct(product);
            if (!result.ok) {
              notify(result.message, "error");
            } else {
               // We don't spam success toasts for rapid scans to avoid clutter
            }
          }
        } catch (failure) {
          const message = failure.response?.data?.message || `No sellable product found for barcode ${nextBarcode}.`;
          notify(message, "error");
        } finally {
          setIsProcessing(false);
        }
      }, 0);
      
      return remainingQueue;
    });
  }, [isProcessing, cart, notify]);

  // Effect to trigger processing when queue changes or processing finishes
  useEffect(() => {
    if (queue.length > 0 && !isProcessing) {
      processNext();
    }
  }, [queue, isProcessing, processNext]);

  const enqueue = useCallback((barcode) => {
    const value = barcode.trim();
    if (!value) return;

    const now = Date.now();
    const lastScanTime = lastScans.current.get(value) || 0;
    
    // If the exact same barcode was scanned less than 150ms ago, it's likely a double-fire 
    // from a hardware scanner sending both Enter and Form Submit.
    if (now - lastScanTime < 150) {
      return; 
    }
    
    lastScans.current.set(value, now);
    
    // Cleanup old timestamps to prevent memory leak
    if (lastScans.current.size > 50) {
      const entries = [...lastScans.current.entries()];
      lastScans.current.clear();
      entries.slice(-20).forEach(([k, v]) => lastScans.current.set(k, v));
    }

    setQueue(q => [...q, value]);
  }, []);

  return {
    enqueue,
    queueLength: queue.length,
    isProcessing
  };
}
