// import { useEffect, useRef } from 'react';

// Adsterra ads temporarily disabled
const AdBanner = ({ className = '' }) => {
  // Ad code commented out - uncomment to re-enable Adsterra ads
  /*
  const containerRef = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const container = containerRef.current;
    if (!container) return;

    const optScript = document.createElement('script');
    optScript.textContent = `
      atOptions = {
        'key' : '61c4bb41c77ef18fd8bfc012a62efbb6',
        'format' : 'iframe',
        'height' : 60,
        'width' : 468,
        'params' : {}
      };
    `;
    container.appendChild(optScript);

    const invokeScript = document.createElement('script');
    invokeScript.src = 'https://www.highperformanceformat.com/61c4bb41c77ef18fd8bfc012a62efbb6/invoke.js';
    invokeScript.async = true;
    container.appendChild(invokeScript);

    return () => {
      if (container) {
        if (optScript.parentNode === container) container.removeChild(optScript);
        if (invokeScript.parentNode === container) container.removeChild(invokeScript);
      }
    };
  }, []);
  */

  return null;

  // Original render - uncomment to re-enable
  // return (
  //   <div className={`w-full overflow-hidden flex items-center justify-center ${className}`}>
  //     <div ref={containerRef} />
  //   </div>
  // );
};

export default AdBanner;
