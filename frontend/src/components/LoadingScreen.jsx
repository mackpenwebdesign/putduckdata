import React from "react";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-dark-950 flex flex-col items-center justify-center z-50 overflow-hidden">
      <div className="text-center">
        {/* Logo + tagline tightly grouped */}
        <div className="flex flex-col items-center gap-1.5 mb-8">
          <img
            src="/logo/logo.png"
            alt="PutDuckData"
            className="h-24 sm:h-28 w-auto object-contain"
          />
        </div>

        {/* Progress bar */}
        <div className="w-44 mx-auto">
          <div className="h-[3px] bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full"
              style={{
                animation:
                  "loading-bar 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0%   { width: 0%;  margin-left: 0%; }
          50%  { width: 65%; margin-left: 18%; }
          100% { width: 0%;  margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
