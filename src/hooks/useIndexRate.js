import { useState, useEffect } from 'react';

const REFERENCE_INDEX = {
  index_name: 'WealthLink Growth Index',
  annual_rate: 0.015 * 365,
  daily_rate: 0.015,
};

export function useIndexRate() {
  const [index, setIndex] = useState(REFERENCE_INDEX);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  return { index, loading };
}