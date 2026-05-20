import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { Phone, User, Mail, Wifi, Zap, CreditCard } from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";

const GuestAFA = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    buyer_name: "",
    buyer_contact: "",
    recipient_phone: "",
    network: "MTN",
    data_plan_id: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("paystack");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = { ...formData };
      let res;
      if (paymentMethod === "paystack") {
        res = await api.post("/guest-purchase", body);
        const d = res.data || res;
        window.location.href = d.authorization_url;
      } else {
        toast.error("MoMo coming soon");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to submit AFA order");
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { id: 1, network: "MTN", volume: "1GB", price: "5.00" },
    { id: 2, network: "MTN", volume: "3GB", price: "12.00" },
    { id: 3, network: "TELECEL", volume: "1GB", price: "5.50" },
    // Add more plans as needed
  ];

  return (
    <div className="min-h-screen bg-dark-950 p-6">
      <div className="max-w-md mx-auto bg-dark-900 border border-dark-800 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center">
          <Zap className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Guest AFA Order
          </h1>
          <p className="text-dark-400 text-sm">
            No account needed - fill details and pay instantly
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Your Name *
            </label>
            <Input
              icon={<User className="w-4 h-4" />}
              name="buyer_name"
              value={formData.buyer_name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Contact (Phone/Email) *
            </label>
            <Input
              icon={<Mail className="w-4 h-4" />}
              name="buyer_contact"
              value={formData.buyer_contact}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Recipient Phone *
            </label>
            <Input
              icon={<Phone className="w-4 h-4" />}
              name="recipient_phone"
              value={formData.recipient_phone}
              onChange={handleChange}
              placeholder="0241234567"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Network *
            </label>
            <select
              name="network"
              value={formData.network}
              onChange={handleChange}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              required
            >
              <option value="MTN">MTN</option>
              <option value="TELECEL">Telecel</option>
              <option value="AIRTEL_TIGO">AirtelTigo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Data Plan ID *
            </label>
            <Input
              name="data_plan_id"
              value={formData.data_plan_id}
              onChange={handleChange}
              placeholder="e.g. 1 (from shop)"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="paystack">Paystack (Card/MoMo)</option>
              </select>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Processing..." : "Pay & Submit Order"}
          </Button>
        </form>

        <p className="text-xs text-dark-500 text-center">
          Order will appear in admin queue for fast approval and delivery
        </p>
      </div>
    </div>
  );
};

export default GuestAFA;
