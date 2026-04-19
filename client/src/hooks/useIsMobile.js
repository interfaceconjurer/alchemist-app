import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 899px)';

export function useIsMobile(dispatch) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      setIsMobile(e.matches);
      dispatch({ type: 'SET_MOBILE', isMobile: e.matches });
    };
    mql.addEventListener('change', onChange);
    dispatch({ type: 'SET_MOBILE', isMobile: mql.matches });
    return () => mql.removeEventListener('change', onChange);
  }, [dispatch]);

  return isMobile;
}
