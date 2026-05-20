import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const BroadcastModal = ({ notif, onClose }) => {
  if (!notif) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-[380px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        {/* Blue Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-10 text-center text-white">
          <h2 className="text-2xl font-bold leading-tight mb-3">
            {notif.title}
          </h2>
          <p className="text-sm text-blue-50 font-medium whitespace-pre-wrap">
            <span>{notif.message}</span>
          </p>
        </div>

        {/* Action Section */}
        <div className="p-8 space-y-5">
          {notif.url && (
            <a
              href={notif.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-center font-bold rounded-2xl shadow-lg shadow-blue-100 hover:shadow-xl transition-all active:scale-95"
            >
              Open Link
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full text-primary-600 text-xs font-bold hover:text-primary-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default BroadcastModal;
