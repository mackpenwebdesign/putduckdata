import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, CheckCircle, XCircle, Clock, RefreshCw,
  Loader2, ChevronDown, ChevronUp, User, Phone, Hash,
  AlertCircle, MessageSquare, Wifi, Store,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending',  color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { key: 'approved', label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20'  },
];

const TYPE_TABS = [
  { key: 'all',  label: 'All',        icon: Smartphone },
  { key: 'momo', label: 'Wallet MoMo', icon: Smartphone },
  { key: 'afa',  label: 'AFA Orders',  icon: Store      },
];

const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const initials = (name) =>
  (name || 'U').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const parseMeta = (m) => {
  if (!m) return {};
  if (typeof m === 'string') { try { return JSON.parse(m); } catch { return {}; } }
  return m;
};

const AdminMomo = () => {
  const [statusTab, setStatusTab] = useState('pending');
  const [typeTab,   setTypeTab]   = useState('all');
  const [payments,  setPayments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionState, setActionState] = useState({});
  const [noteMap,     setNoteMap]     = useState({});

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin-momo-manage?status=${statusTab}&type=${typeTab}`);
      const d = res.data || res;
      setPayments(d.payments || []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [statusTab, typeTab]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleAction = async (paymentId, action) => {
    setActionState((prev) => ({ ...prev, [paymentId]: 'loading' }));
    try {
      const res = await api.put('/admin-momo-manage', {
        payment_id: paymentId,
        action,
        admin_note: noteMap[paymentId] || undefined,
      });
      const d = res.data || res;
      if (action === 'approve') {
        if (d.needs_manual) {
          toast.success('Approved — queued in Manual Queue for delivery');
        } else if (d.type === 'afa') {
          toast.success('Approved — data delivery initiated via provider ✓');
        } else {
          toast.success('Payment approved ✓');
        }
      } else {
        toast.success('Rejected');
      }
      setActionState((prev) => ({ ...prev, [paymentId]: 'done' }));
      setExpandedId(null);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action}`);
      setActionState((prev) => ({ ...prev, [paymentId]: null }));
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">MoMo Queue</h1>
          <p className="text-dark-400 text-sm mt-0.5">Review wallet MoMo payments and AFA partner orders</p>
        </div>
        <button onClick={fetchPayments} className="p-2 rounded-xl bg-dark-800/50 border border-dark-700/50 text-dark-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2">
        {TYPE_TABS.map((t) => (
          <button key={t.key} onClick={() => { setTypeTab(t.key); setExpandedId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              typeTab === t.key
                ? 'bg-primary-600/15 border-primary-500/30 text-primary-400'
                : 'bg-dark-800/40 border-dark-700/50 text-dark-500 hover:text-dark-300'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => { setStatusTab(tab.key); setExpandedId(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              statusTab === tab.key
                ? `${tab.bg} ${tab.border} ${tab.color}`
                : 'bg-dark-800/40 border-dark-700/50 text-dark-500 hover:text-dark-300'
            }`}>
            {tab.key === 'pending'  && <Clock className="w-3.5 h-3.5" />}
            {tab.key === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
            {tab.key === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
            {tab.label}
            {statusTab === tab.key && !loading && (
              <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${tab.bg}`}>{payments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Pending alert */}
      {statusTab === 'pending' && !loading && payments.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300/80 text-xs">
            <span className="font-bold">{payments.length} payment{payments.length > 1 ? 's' : ''}</span> waiting for review
          </p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-dark-800/40 rounded-2xl animate-pulse" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-dark-900/60 border border-dark-800/60 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-dark-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-6 h-6 text-dark-600" />
          </div>
          <p className="text-dark-400 text-sm font-semibold">No {statusTab} payments</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => {
            const meta       = parseMeta(p.metadata);
            const isAfa      = p.transaction_type === 'afa_purchase';
            const isExpanded = expandedId === p.id;
            const isLoading  = actionState[p.id] === 'loading';
            const displayName = p.full_name || meta.buyer_name || 'Guest';

            return (
              <div key={p.id} className={`bg-dark-900/60 border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-primary-500/30' : 'border-dark-800/60'}`}>
                {/* Row header */}
                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-dark-800/30 transition-colors" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isAfa ? 'bg-purple-600/15' : 'bg-primary-600/15'}`}>
                    <span className={`text-xs font-bold ${isAfa ? 'text-purple-400' : 'text-primary-400'}`}>{initials(displayName)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-semibold truncate">{displayName}</p>
                      {isAfa && (
                        <span className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">AFA</span>
                      )}
                      <span className={`hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        p.status === 'pending'  ? 'bg-amber-500/10 text-amber-400' :
                        p.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                                                  'bg-red-500/10 text-red-400'
                      }`}>{p.status}</span>
                    </div>
                    <p className="text-dark-500 text-[11px]">
                      {timeAgo(p.created_at)}
                      {isAfa && meta.recipient_phone ? ` · To: ${meta.recipient_phone}` : ''}
                      {isAfa && meta.reseller_name   ? ` · Via: ${meta.reseller_name}` : ''}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-green-400 font-bold text-sm">{formatCurrency(parseFloat(p.amount))}</p>
                    <p className="text-dark-600 text-[10px]">{isAfa ? (meta.network || 'AFA') : (p.transaction_type || 'wallet')}</p>
                  </div>

                  <div className="text-dark-600 flex-shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-dark-800/60 px-4 pb-4 pt-3 space-y-4">
                    {isAfa ? (
                      /* AFA order details */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Detail icon={User}  label="Buyer"          value={meta.buyer_name} />
                        <Detail icon={Phone} label="Buyer Contact"  value={meta.buyer_contact} />
                        <Detail icon={Wifi}  label="Recipient"      value={meta.recipient_phone} />
                        <Detail icon={Smartphone} label="MoMo From" value={p.phone_number} />
                        <Detail icon={Store} label="Partner"        value={`${meta.reseller_name || '—'} (${meta.reseller_code || ''})`} />
                        <Detail icon={Hash}  label="Plan"           value={`${meta.data_volume} · ${meta.network}`} />
                        <Detail icon={Hash}  label="Reference"      value={p.reference} mono />
                      </div>
                    ) : (
                      /* Regular wallet MoMo details */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Detail icon={User}  label="Customer"    value={displayName} />
                        <Detail icon={Hash}  label="Reference"   value={p.reference} mono />
                        <Detail icon={Phone} label="MoMo Number" value={p.phone_number} />
                        <Detail icon={Phone} label="Account"     value={p.user_phone || p.email} />
                      </div>
                    )}

                    {/* Admin note (reviewed) */}
                    {p.admin_note && p.status !== 'pending' && (
                      <div className="bg-dark-800/50 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-dark-600 uppercase tracking-widest mb-1">Admin Note</p>
                        <p className="text-dark-300 text-xs">{p.admin_note}</p>
                      </div>
                    )}

                    {/* AFA approve notice */}
                    {isAfa && p.status === 'pending' && (
                      <div className="flex items-start gap-2 bg-blue-500/8 border border-blue-500/20 rounded-xl px-3 py-2.5">
                        <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-blue-300/80 text-xs">
                          Confirm MoMo payment received, then approve. System will auto-deliver via the configured provider — falls back to Manual Queue if delivery fails.
                        </p>
                      </div>
                    )}

                    {/* Actions — pending only */}
                    {p.status === 'pending' && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-dark-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" /> Note (optional)
                          </label>
                          <input type="text" value={noteMap[p.id] || ''}
                            onChange={(e) => setNoteMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder={isAfa ? 'e.g. MoMo confirmed, queued for delivery' : 'e.g. Screenshot matches, credited'}
                            className="w-full bg-dark-800 border border-dark-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600/40 placeholder-dark-700"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(p.id, 'approve')} disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold transition-colors">
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            {isAfa ? 'Confirm & Queue' : 'Approve'}
                          </button>
                          <button onClick={() => handleAction(p.id, 'reject')} disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 disabled:opacity-50 text-red-400 text-xs font-bold transition-colors">
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Detail = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-2.5">
    <div className="w-7 h-7 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-3.5 h-3.5 text-dark-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-dark-600 uppercase tracking-widest">{label}</p>
      <p className={`text-white text-xs mt-0.5 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  </div>
);

export default AdminMomo;
