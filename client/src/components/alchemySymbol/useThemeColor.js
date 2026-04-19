import { useState, useEffect } from 'react';

export function useThemeColor() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return { shapeColor: isDark ? '#ffffff' : '#000000', isDark };
}
