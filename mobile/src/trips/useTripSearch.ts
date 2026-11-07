/**
 * SP2-P1-03: Custom hook for passenger trip search.
 * Wraps searchTrips API call with loading / error / data state.
 */

import { useCallback, useState } from 'react';
import * as api from '../api/client';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; results: api.TripSearchResult[] }
  | { status: 'error'; message: string };

export function useTripSearch(accessToken: string) {
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  const search = useCallback(
    async (params: api.TripSearchParams) => {
      setState({ status: 'loading' });
      try {
        const results = await api.searchTrips(accessToken, params);
        setState({ status: 'success', results });
      } catch (err: unknown) {
        const message =
          err instanceof api.ApiError
            ? err.message
            : 'Không thể kết nối máy chủ';
        setState({ status: 'error', message });
      }
    },
    [accessToken],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, search, reset };
}

