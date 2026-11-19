import { useState, useLayoutEffect } from 'react';

const MOBILE_QUERY = '(max-width: 899px)';

export function useIsMobile(dispatch) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useLayoutEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      setIsMobile(e.matches);
      dispatch({ type: 'SET_MOBILE', isMobile: e.matches });
    };
    mql.addEventListener('change', onChange);
    // The viewport can change between the first render and this subscription.
    onChange(mql);
    return () => mql.removeEventListener('change', onChange);
  }, [dispatch]);

  return isMobile;
}
