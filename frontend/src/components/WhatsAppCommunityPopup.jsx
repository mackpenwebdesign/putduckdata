import { useEffect, useState } from "react";

const WHATSAPP_URL = "https://whatsapp.com/channel/0029Vb8HjkU9RZAdH6tcMe3W";
const STORAGE_KEY = "pdd_wa_popup_shown";

const WhatsAppCommunityPopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const join = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 300,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.45)",
          animation: "pdd_popIn 0.42s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* ── Blue top section ── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(145deg, #f87171 0%, #dc2626 55%, #b91c1c 100%)",
            paddingTop: 48,
            paddingBottom: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Sparkle stars */}
          <span
            style={{
              position: "absolute",
              top: 18,
              right: 52,
              fontSize: 18,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <span
            style={{
              position: "absolute",
              top: 38,
              right: 34,
              fontSize: 11,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <span
            style={{
              position: "absolute",
              top: 22,
              left: 44,
              fontSize: 12,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <span
            style={{
              position: "absolute",
              top: 46,
              left: 28,
              fontSize: 8,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1,
            }}
          >
            ✦
          </span>

          {/* Rocket SVG */}
          <svg
            viewBox="0 0 90 115"
            width={76}
            height={96}
            style={{
              position: "relative",
              zIndex: 2,
              filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.25))",
            }}
          >
            {/* Flame glow */}
            <ellipse
              cx="45"
              cy="105"
              rx="14"
              ry="18"
              fill="rgba(254,215,100,0.5)"
            />
            <ellipse
              cx="45"
              cy="108"
              rx="9"
              ry="12"
              fill="rgba(253,186,116,0.75)"
            />
            {/* Left fin */}
            <path d="M28,72 Q16,76 14,90 L28,84 Z" fill="white" />
            {/* Right fin */}
            <path d="M62,72 Q74,76 76,90 L62,84 Z" fill="white" />
            {/* Rocket body */}
            <path
              d="M28,78 L28,48 Q28,18 45,8 Q62,18 62,48 L62,78 Z"
              fill="white"
            />
            {/* Nose cone */}
            <path d="M45,8 Q62,18 62,48 L28,48 Q28,18 45,8 Z" fill="white" />
            {/* Blue emblem circle */}
            <circle cx="45" cy="54" r="13" fill="#b91c1c" />
            {/* WhatsApp "W" hint on emblem */}
            <text
              x="45"
              y="59"
              textAnchor="middle"
              fill="white"
              fontSize="13"
              fontWeight="bold"
              fontFamily="Arial,sans-serif"
            >
              W
            </text>
            {/* Window porthole */}
            <circle cx="45" cy="75" r="5" fill="#f1f5f9" opacity="0.7" />
          </svg>

          {/* Cloud / smoke puffs below rocket */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: 36,
                height: 28,
                background: "white",
                borderRadius: "50%",
                marginBottom: 2,
              }}
            />
            <div
              style={{
                width: 54,
                height: 42,
                background: "white",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                width: 46,
                height: 34,
                background: "white",
                borderRadius: "50%",
                marginBottom: 4,
              }}
            />
            <div
              style={{
                width: 36,
                height: 26,
                background: "white",
                borderRadius: "50%",
                marginBottom: 2,
              }}
            />
          </div>

          {/* Organic wave blobs behind clouds */}
          <svg
            viewBox="0 0 300 70"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              bottom: -1,
              left: 0,
              width: "100%",
              height: 70,
              zIndex: 1,
            }}
          >
            <path
              d="M0,35 Q40,10 80,35 Q120,58 160,30 Q200,8 240,35 Q270,50 300,30 L300,70 L0,70 Z"
              fill="rgba(255,255,255,0.18)"
            />
            <path
              d="M0,50 Q50,28 100,50 Q150,70 200,45 Q240,28 300,50 L300,70 L0,70 Z"
              fill="rgba(255,255,255,0.28)"
            />
          </svg>
        </div>

        {/* ── White content section ── */}
        <div
          style={{
            background: "white",
            padding: "20px 24px 22px",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontWeight: 800,
              fontSize: 20,
              color: "#1e293b",
              letterSpacing: "-0.3px",
            }}
          >
            Join Our Community!
          </h3>
          <p
            style={{
              margin: "0 0 20px",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            Get exclusive deals, data tips &amp; fast support — straight to your
            WhatsApp.
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={dismiss}
              style={{
                flex: 1,
                padding: "12px 0",
                fontWeight: 700,
                fontSize: 14,
                color: "#dc2626",
                background: "none",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Ignore
            </button>
            <button
              onClick={join}
              style={{
                flex: 1.4,
                padding: "12px 0",
                fontWeight: 700,
                fontSize: 14,
                color: "white",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(220, 38, 38,0.45)",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Join Channel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pdd_popIn {
          from { opacity: 0; transform: translateY(30px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)   scale(1);     }
        }
      `}</style>
    </div>
  );
};

export default WhatsAppCommunityPopup;
