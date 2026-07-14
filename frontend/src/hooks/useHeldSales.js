import { useCallback, useEffect, useState } from "react";
import {
  createHeldSale,
  deleteHeldSale,
  getHeldSale,
  getHeldSales,
  updateHeldSale,
} from "../api/heldSalesApi";

export default function useHeldSales() {
  const [heldSales, setHeldSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getHeldSales();
      setHeldSales(rows);
      return rows;
    } catch (failure) {
      setError(failure.response?.data?.message || "Unable to load held sales.");
      throw failure;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function holdSale(payload, id = null) {
    const response = id ? await updateHeldSale(id, payload) : await createHeldSale(payload);
    await load();
    return response;
  }

  async function resumeHeldSale(id) {
    return getHeldSale(id);
  }

  async function removeHeldSale(id) {
    const response = await deleteHeldSale(id);
    await load();
    return response;
  }

  return { heldSales, loading, error, load, holdSale, resumeHeldSale, removeHeldSale };
}
