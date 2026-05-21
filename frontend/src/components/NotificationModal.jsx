import { X } from "lucide-react";
import useAuthStore from "../stores/authStore.js";

const NotificationModal = ({ notif, onClose }) => {
  const { user } = useAuthStore();
  if (!notif) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-dark-900 max-w-lg w-full rounded-2xl border border-dark-800 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-3">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{notif.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-dark-800 rounded-lg transition-all"
            >
              <X className="w-4 h-4 text-dark-400 hover:text-white" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          <p className="whitespace-pre-wrap text-white leading-relaxed">
            {notif.message}
          </p>

          {notif.url && (
            <a
              href={notif.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl mt-6 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🔗 Visit Link
            </a>
          )}

        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
