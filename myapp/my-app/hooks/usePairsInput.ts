import { useState, useCallback } from 'react';
import { splitPairsAndItems } from '@/lib/utils';

export function usePairsInput(initialTotal: number = 0) {
  const initialSplit = splitPairsAndItems(initialTotal);
  const [pairs, setPairs] = useState<string>(initialTotal > 0 ? String(initialSplit.pairs) : "");
  const [singles, setSingles] = useState<string>(initialTotal > 0 ? String(initialSplit.singles) : "");

  const updatePairs = useCallback((val: string) => {
    setPairs(val);
  }, []);

  const updateSingles = useCallback((val: string) => {
    const s = parseInt(val) || 0;
    if (s >= 2) {
      const p = parseInt(pairs || "0") || 0;
      const total = (p * 2) + s;
      const split = splitPairsAndItems(total);
      setPairs(String(split.pairs));
      setSingles(String(split.singles));
    } else {
      setSingles(val);
    }
  }, [pairs]);

  const reset = useCallback((newTotal: number = 0) => {
    const split = splitPairsAndItems(newTotal);
    setPairs(newTotal > 0 ? String(split.pairs) : "");
    setSingles(newTotal > 0 ? String(split.singles) : "");
  }, []);

  const totalQuantity = (parseInt(pairs || "0") || 0) * 2 + (parseInt(singles || "0") || 0);

  return {
    pairs,
    singles,
    setPairs: updatePairs,
    setSingles: updateSingles,
    totalQuantity,
    reset,
  };
}
