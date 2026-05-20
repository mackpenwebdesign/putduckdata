import { useState } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle,
  Phone,
  Mail,
  AlertTriangle,
} from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import useAuthStore from "../../stores/authStore";
import api from "../../utils/api";
import { toast } from "react-hot-toast";

const ISSUE_TYPES = [
  { value: "data_not_received", label: "Data Not Received" },
  { value: "payment_issue", label: "Payment / Wallet Issue" },
  { value: "wrong_number", label: "Wrong Number / Network" },
  { value: "refund_request", label: "Refund Request" },
  { value: "account_issue", label: "Account Issue" },
  { value: "suggestion", label: "Suggestion / Feedback" },
  { value: "other", label: "Other" },
];

const Report = () => {
  const { user } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    issue_type: "",
    subject: "",
    message: "",
    transaction_ref: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.issue_type) {
      toast.error("Please select an issue type");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Please describe your issue");
      return;
    }

    setLoading(true);
    try {
      // Try to submit via API if endpoint exists
      await api.post("/support-ticket", {
        ...form,
        user_email: user?.email,
        user_name: user?.full_name,
      });
      setSubmitted(true);
      toast.success("Report submitted successfully!");
    } catch {
      // If no API endpoint, open WhatsApp as fallback
      const issueLabel =
        ISSUE_TYPES.find((t) => t.value === form.issue_type)?.label ||
        form.issue_type;
      const msg = `Hi PutDuckData Support,%0A%0A*Issue:* ${issueLabel}%0A*Subject:* ${
        form.subject
      }%0A*Details:* ${form.message}${
        form.transaction_ref ? `%0A*Ref:* ${form.transaction_ref}` : ""
      }%0A%0A*User:* ${user?.full_name} (${user?.email})`;
      window.open(`https://wa.me/233322291381?text=${msg}`, "_blank");
      setSubmitted(true);
      toast.success("Opening WhatsApp to submit your report...");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Report</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Get help with any issues
          </p>
        </div>
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Report Submitted!
          </h2>
          <p className="text-dark-400 text-sm mb-6">
            We've received your report and will get back to you shortly.
          </p>
          <Button
            onClick={() => {
              setSubmitted(false);
              setForm({
                issue_type: "",
                subject: "",
                message: "",
                transaction_ref: "",
              });
            }}
          >
            Submit Another Report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Report an Issue
        </h1>
        <p className="text-dark-400 text-sm mt-0.5">
          Let us know if something isn't right
        </p>
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="https://wa.me/233322291381?text=Hi%20PutDuckData%20team%2C%20I%20need%20help"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-600/10 border border-green-600/20 rounded-xl px-4 py-3 hover:border-green-600/40 transition-colors"
        >
          <Phone className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-white text-sm font-medium">WhatsApp Support</p>
            <p className="text-dark-500 text-xs">Chat with us directly</p>
          </div>
        </a>
        <a
          href="mailto:support@putduckdata.com"
          className="flex items-center gap-3 bg-blue-600/10 border border-blue-600/20 rounded-xl px-4 py-3 hover:border-blue-600/40 transition-colors"
        >
          <Mail className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-white text-sm font-medium">Email Support</p>
            <p className="text-dark-500 text-xs">support@putduckdata.com</p>
          </div>
        </a>
      </div>

      {/* Report Form */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-primary-600/10 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-500" />
          </div>
          <h3 className="text-white font-semibold text-sm">Submit a Report</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Issue Type
            </label>
            <select
              value={form.issue_type}
              onChange={(e) => setForm({ ...form, issue_type: e.target.value })}
              className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              required
            >
              <option value="">Select issue type...</option>
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Subject
            </label>
            <Input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          {(form.issue_type === "data_not_received" ||
            form.issue_type === "payment_issue" ||
            form.issue_type === "refund_request") && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Transaction Reference (optional)
              </label>
              <Input
                type="text"
                value={form.transaction_ref}
                onChange={(e) =>
                  setForm({ ...form, transaction_ref: e.target.value })
                }
                placeholder="e.g. DATA-XXXXXXXX"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Describe the issue
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tell us what happened in detail..."
              rows={4}
              className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
              required
            />
          </div>

          <Button type="submit" fullWidth loading={loading}>
            <Send className="w-4 h-4 mr-2" />
            Submit Report
          </Button>
        </form>
      </div>

      {/* Common issues */}
      <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-dark-400">
          <strong className="text-yellow-400">Data not received?</strong> Data
          delivery can take up to 5 minutes depending on network load. If it's
          been longer, submit a report with your transaction reference.
        </div>
      </div>
    </div>
  );
};

export default Report;
