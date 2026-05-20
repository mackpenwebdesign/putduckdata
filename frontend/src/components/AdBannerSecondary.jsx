// import { useEffect, useRef } from 'react';

// Adsterra ads temporarily disabled
const AdBannerSecondary = ({ className = '' }) => {
  // Ad code commented out - uncomment to re-enable Adsterra ads
  /*
  const containerRef = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement('script');
    script.src = 'https://pl28672096.effectivegatecpm.com/04/1e/d5/041ed58ba258bfca103427ea76c38d9d.js';
    script.async = true;
    container.appendChild(script);

    return () => {
      if (container && script.parentNode === container) {
        container.removeChild(script);
      }
    };
  }, []);
  */

  return null;

  // Original render - uncomment to re-enable
  // return (
  //   <div className={`w-full overflow-hidden ${className}`}>
  //     <div ref={containerRef} />
  //   </div>
  // );
};

export default AdBannerSecondary;
