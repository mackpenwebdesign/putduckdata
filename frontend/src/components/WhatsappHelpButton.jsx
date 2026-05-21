import { WhatsappLogo } from "@phosphor-icons/react";

const ADMIN_WA = "https://wa.me/233558638899";
const MESSAGE =
  "Hi PutDuckData team! I need help with my data purchase/order.";

const WhatsappHelpButton = () => {
  const openWhatsapp = () => {
    window.open(
      `${ADMIN_WA}?text=${encodeURIComponent(MESSAGE)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div
      className="fixed bottom-20 right-4 z-[1000]"
      style={{ animation: "pdd_float 2s ease-in-out infinite" }}
    >
      <style>{`
        @keyframes pdd_float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .wa-outer {
          position: relative;
          width: 52px;
          height: 58px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .wa-outer:hover { transform: scale(1.1); }
        
        .wa-bubble {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(145deg, #f87171 0%, #dc2626 100%);
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }
        .wa-tail {
          position: absolute;
          bottom: 2px;
          left: 5px;
          width: 16px;
          height: 14px;
          background: #dc2626;
          border-left: 2px solid white;
          border-bottom: 2px solid white;
          border-bottom-left-radius: 10px;
          clip-path: polygon(0% 0%, 100% 0%, 30% 100%);
        }
      `}</style>

      <button
        onClick={openWhatsapp}
        className="wa-outer focus:outline-none"
        title="Chat on WhatsApp"
        style={{ background: "none", border: "none", padding: 0 }}
      >
        <div className="wa-bubble">
          <WhatsappLogo size={26} color="white" weight="fill" />
        </div>
        <div className="wa-tail" />
      </button>
    </div>
  );
};

export default WhatsappHelpButton;
