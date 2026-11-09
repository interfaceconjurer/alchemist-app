import { useEffect, useState } from 'react';

export function useSymbolVisibility(ref) {
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden');
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReducedMotion(query.matches);
    if (query?.addEventListener) query.addEventListener('change', onMotion);
    else query?.addListener(onMotion);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (query?.removeEventListener) query.removeEventListener('change', onMotion);
      else query?.removeListener(onMotion);
    };
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  const active = pageVisible && inView && !reducedMotion;
  useEffect(() => { if (active) setStarted(true); }, [active]);
  return { active, reducedMotion, started };
}
