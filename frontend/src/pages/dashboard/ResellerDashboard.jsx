import { useState, useEffect, useCallback } from 'react';
import {
  Store, Copy, Check, Users, Wallet, TrendingUp,
  Edit2, Save, X, Loader2, ArrowDownToLine,
  ExternalLink, RefreshCw, ShoppingBag, ChevronRight,
  BadgeCheck, Phone, CreditCard,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import useAuthStore from '../../stores/authStore';

const NETWORKS = ['MTN', 'TELECEL', 'AIRTEL_TIGO'];
const NETWORK_LABELS = { MTN: 'MTN', TELECEL: 'Telecel', AIRTEL_TIGO: 'AirtelTigo' };
const NETWORK_COLORS = {
  MTN: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  TELECEL: 'border-red-500/40 bg-red-500/10 text-red-400',
  AIRTEL_TIGO: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
};
const NETWORK_ACTIVE = {
  MTN: 'border-yellow-400 bg-yellow-400/20 text-yellow-300',
  TELECEL: 'border-red-400 bg-red-400/20 text-red-300',
  AIRTEL_TIGO: 'border-blue-400 bg-blue-400/20 text-blue-300',
};

const CopyBtn = ({ text, size = 'md' }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  const sz = size === 'lg' ? 'p-2 rounded-xl' : 'p-1.5 rounded-lg';
  const icon = size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <button onClick={copy} className={`${sz} text-dark-500 hover:text-primary-400 hover:bg-primary-600/10 transition-all flex-shrink-0`}>
      {copied ? <Check className={`${icon} text-green-400`} /> : <Copy className={icon} />}
    </button>
  );
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700/60 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-dark-800">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

export default function ResellerDashboard() {
  const { user, refreshUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [network, setNetwork] = useState('MTN');
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState({ account_number: '', account_name: '', momo_network: 'MTN' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [showCustomers, setShowCustomers] = useState(false);
  const [customers, setCustomers] = useState([]);

  const isReseller = user?.is_reseller;
  const isAdmin    = user?.is_admin;

  const fetchStats = useCallback(async () => {
    try { const res = await api.get('/reseller-stats'); setStats(res.data || res); } catch {}
  }, []);

  const fetchPlans = useCallback(async () => {
    try { const res = await api.get('/reseller-get-pricing'); setPlans((res.data || res).plans || []); } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (isReseller || isAdmin) {
        await Promise.all([fetchStats(), fetchPlans()]);
        const s = await api.get('/reseller-stats').then(r => r.data || r).catch(() => null);
        if (s && !s.referral_code) {
          await api.post('/reseller-activate', { action: 'get_referral_code' }).catch(() => {});
          await fetchStats();
        }
      }
      setLoading(false);
    };
    init();
  }, [isReseller, isAdmin]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post('/reseller-activate', { action: 'request_reseller' });
      toast.success('Application submitted! GH₵100 deducted. Admin will review shortly.');
      refreshUser();
    } catch (err) { toast.error(err.response?.data?.message || 'Application failed'); }
    finally { setApplying(false); }
  };

  const savePrice = async (planId) => {
    if (!editPrice) return;
    setSavingId(planId);
    try {
      await api.post('/reseller-set-pricing', { data_plan_id: planId, custom_price: parseFloat(editPrice) });
      toast.success('Price updated');
      setEditingId(null);
      fetchPlans();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingId(null); }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) < 5) return toast.error('Minimum withdrawal is GH₵5');
    if (!withdrawAccount.account_number || !withdrawAccount.account_name) return toast.error('Fill in all account details');
    setWithdrawing(true);
    try {
      await api.post('/withdrawal-request', { amount: parseFloat(withdrawAmount), account_details: withdrawAccount });
      toast.success('Withdrawal submitted!');
      setShowWithdraw(false);
      setWithdrawAmount('');
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Withdrawal failed'); }
    finally { setWithdrawing(false); }
  };

  const loadWithdrawHistory = async () => {
    try { setWithdrawHistory((await api.get('/withdrawal-history').then(r => r.data || r)).history || []); setShowWithdrawHistory(true); }
    catch { toast.error('Failed to load history'); }
  };

  const loadCustomers = async () => {
    try { setCustomers((await api.get('/reseller-customers').then(r => r.data || r)).customers || []); setShowCustomers(true); }
    catch { toast.error('Failed to load customers'); }
  };

  const filteredPlans = plans.filter(p => p.network === network);
  const shopUrl = stats?.referral_code ? `${window.location.origin}/shop/${stats.referral_code}` : null;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      <p className="text-dark-500 text-sm">Loading your dashboard…</p>
    </div>
  );

  // ── Not a reseller yet ────────────────────────────────────────────────────
  if (!isReseller && !isAdmin) return (
    <div className="max-w-md mx-auto py-10 space-y-5">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-600/20 to-primary-600/5 border border-primary-500/20 rounded-3xl flex items-center justify-center mx-auto">
          <Store className="w-10 h-10 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Become a Partner</h1>
          <p className="text-dark-400 text-sm mt-1">Get your own shop and sell data bundles at your price.</p>
        </div>
      </div>

      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-2.5">
        {['Set your own selling prices', 'Get a branded public shop page', 'Withdraw earnings to MoMo'].map(f => (
          <div key={f} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-primary-600/15 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-primary-400" />
            </div>
            <span className="text-dark-300 text-sm">{f}</span>
          </div>
        ))}
      </div>

      <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-primary-600/5 border-b border-dark-800 flex justify-between items-center">
          <span className="text-dark-300 text-sm font-medium">One-time registration fee</span>
          <span className="text-primary-400 font-bold text-xl">GH₵100</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-dark-500">Your wallet balance</span>
            <span className={`font-semibold ${(user?.wallet_balance || 0) >= 100 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(user?.wallet_balance || 0)}</span>
          </div>
          <p className="text-dark-600 text-xs">Admin approves within 24h after fee is deducted.</p>
          <button
            onClick={handleApply}
            disabled={applying || (user?.wallet_balance || 0) < 100}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Apply Now — GH₵100'}
          </button>
          {(user?.wallet_balance || 0) < 100 && (
            <p className="text-red-400 text-xs text-center">Insufficient balance. Fund your wallet first.</p>
          )}
        </div>
      </div>
    </div>
  );

  // ── Reseller Dashboard ────────────────────────────────────────────────────
  const available = stats?.balance?.available || 0;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-white">Partner Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary-600/15 border border-primary-500/30 text-primary-400">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified Partner
            </span>
          </div>
          <p className="text-dark-500 text-sm mt-1">Manage your shop, set prices, and track earnings</p>
        </div>
        <button onClick={() => { fetchStats(); fetchPlans(); }} className="p-2 rounded-xl bg-dark-800/60 border border-dark-700/50 text-dark-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Shop link banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600/15 via-primary-600/8 to-transparent border border-primary-500/20 rounded-2xl p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Store className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Your Shop Link</p>
              <p className="text-dark-500 text-[11px]">Share this link with customers to buy from you</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-dark-950/60 border border-dark-700/60 rounded-xl px-4 py-3">
            {shopUrl ? (
              <>
                <span className="flex-1 text-primary-300 text-sm font-mono truncate">{shopUrl}</span>
                <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-dark-500 hover:text-primary-400 transition-colors flex-shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <CopyBtn text={shopUrl} size="lg" />
              </>
            ) : (
              <span className="text-dark-600 text-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Setting up your shop…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Available', value: formatCurrency(available), sub: `Withdrawn: ${formatCurrency(stats?.balance?.total_withdrawn || 0)}`, color: 'text-green-400', icon: Wallet, iconBg: 'bg-green-500/10', iconColor: 'text-green-400' },
          { label: 'Total Earned', value: formatCurrency(stats?.statistics?.total_earned || 0), color: 'text-white', icon: TrendingUp, iconBg: 'bg-primary-600/10', iconColor: 'text-primary-400' },
          { label: 'Customers', value: stats?.statistics?.total_referrals || 0, sub: 'Via your shop', color: 'text-white', icon: Users, iconBg: 'bg-primary-600/10', iconColor: 'text-primary-400' },
          { label: 'Orders', value: stats?.statistics?.total_transactions || 0, sub: `Revenue: ${formatCurrency(stats?.statistics?.total_revenue || 0)}`, color: 'text-white', icon: ShoppingBag, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-dark-900/60 border border-dark-800/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-dark-500 font-semibold uppercase tracking-wider">{s.label}</span>
              <div className={`w-8 h-8 ${s.iconBg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
            </div>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-dark-600 text-[10px] mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {available >= 5 && (
          <button onClick={() => setShowWithdraw(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-colors">
            <ArrowDownToLine className="w-4 h-4" /> Withdraw {formatCurrency(available)}
          </button>
        )}
        <button onClick={loadWithdrawHistory} className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-xl text-sm font-medium transition-colors">
          <Wallet className="w-4 h-4" /> Withdrawal History
        </button>
        <button onClick={loadCustomers} className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-xl text-sm font-medium transition-colors">
          <Users className="w-4 h-4" /> My Customers
        </button>
      </div>

      {/* Pricing management */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-white font-bold text-sm">My Selling Prices</h2>
            <p className="text-dark-500 text-xs mt-0.5">Set custom prices above your cost to earn on every sale</p>
          </div>
          <div className="flex gap-1.5">
            {NETWORKS.map(n => (
              <button
                key={n}
                onClick={() => setNetwork(n)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${network === n ? NETWORK_ACTIVE[n] : 'border-dark-700 text-dark-500 hover:border-dark-600 hover:text-dark-400'}`}
              >
                {NETWORK_LABELS[n]}
              </button>
            ))}
          </div>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-500 text-sm">No plans available for {NETWORK_LABELS[network]}</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800/40">
            {filteredPlans.map(plan => (
              <div key={plan.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-dark-800/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">{plan.data_volume}</p>
                  <p className="text-dark-500 text-xs">{plan.validity_days}d validity</p>
                </div>

                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-dark-500 text-xs">Platform: {formatCurrency(plan.platform_price)}</p>
                  <p className="text-dark-600 text-[10px]">Your cost: {formatCurrency(plan.your_cost || 0)}</p>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  {editingId === plan.id ? (
                    <>
                      <input
                        type="number" step="0.01" value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="w-24 bg-dark-800 border border-primary-600/40 text-white text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-600/50"
                        placeholder="0.00" autoFocus
                      />
                      <button onClick={() => savePrice(plan.id)} disabled={savingId === plan.id} className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-50">
                        {savingId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-dark-500 hover:text-white rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {plan.custom_price
                        ? <span className="text-green-400 text-sm font-bold">{formatCurrency(plan.custom_price)}</span>
                        : <span className="text-dark-600 text-xs italic">Not set</span>
                      }
                      <button onClick={() => { setEditingId(plan.id); setEditPrice(plan.custom_price || ''); }} className="p-1.5 text-dark-600 hover:text-primary-400 hover:bg-primary-600/10 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent commissions */}
      {stats?.recent_commissions?.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-800">
            <h2 className="text-white font-bold text-sm">Recent Earnings</h2>
          </div>
          <div className="divide-y divide-dark-800/40">
            {stats.recent_commissions.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{c.from_user}</p>
                  <p className="text-dark-600 text-xs">{new Date(c.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className="text-green-400 font-bold text-sm">+{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      <Modal open={showWithdraw} onClose={() => setShowWithdraw(false)} title="Withdraw Earnings">
        <div className="space-y-4">
          <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-dark-400 text-sm">Available balance</span>
            <span className="text-green-400 font-bold text-lg">{formatCurrency(available)}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-dark-400 text-xs font-medium block mb-1.5">Amount (min GH₵5)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm font-semibold">GH₵</span>
                <input type="number" placeholder="0.00" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50 focus:border-primary-600/50" />
              </div>
            </div>

            <div>
              <label className="text-dark-400 text-xs font-medium block mb-1.5">MoMo Network</label>
              <select value={withdrawAccount.momo_network} onChange={e => setWithdrawAccount(p => ({ ...p, momo_network: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50">
                <option value="MTN">MTN MoMo</option>
                <option value="VODAFONE">Telecel Cash</option>
                <option value="AIRTELTIGO">AirtelTigo Money</option>
              </select>
            </div>

            <div>
              <label className="text-dark-400 text-xs font-medium block mb-1.5">MoMo Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input type="tel" placeholder="0241234567" value={withdrawAccount.account_number} onChange={e => setWithdrawAccount(p => ({ ...p, account_number: e.target.value }))}
                  className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50" />
              </div>
            </div>

            <div>
              <label className="text-dark-400 text-xs font-medium block mb-1.5">Account Name</label>
              <input type="text" placeholder="Full name on account" value={withdrawAccount.account_name} onChange={e => setWithdrawAccount(p => ({ ...p, account_name: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/50" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowWithdraw(false)} className="flex-1 py-2.5 rounded-xl border border-dark-700 text-dark-400 hover:text-white text-sm font-medium transition-colors">
              Cancel
            </button>
            <button onClick={handleWithdraw} disabled={withdrawing} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
              Withdraw
            </button>
          </div>
        </div>
      </Modal>

      {/* Withdrawal History Modal */}
      <Modal open={showWithdrawHistory} onClose={() => setShowWithdrawHistory(false)} title="Withdrawal History">
        {withdrawHistory.length === 0 ? (
          <div className="py-8 text-center">
            <Wallet className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-500 text-sm">No withdrawals yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {withdrawHistory.map(w => {
              const statusColor = { completed: 'text-green-400 bg-green-500/10', pending: 'text-yellow-400 bg-yellow-500/10', pending_manual: 'text-amber-400 bg-amber-500/10', rejected: 'text-red-400 bg-red-500/10' }[w.status] || 'text-dark-400 bg-dark-700';
              return (
                <div key={w.id} className="bg-dark-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{formatCurrency(w.amount)}</p>
                    <p className="text-dark-500 text-xs">{w.account_details?.account_number} · {w.account_details?.momo_network}</p>
                    <p className="text-dark-600 text-[10px] mt-0.5">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${statusColor}`}>{w.status?.replace(/_/g, ' ')}</span>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Customers Modal */}
      <Modal open={showCustomers} onClose={() => setShowCustomers(false)} title={`My Customers (${customers.length})`}>
        {customers.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-500 text-sm">No customers yet</p>
            <p className="text-dark-600 text-xs mt-1">Share your shop link to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map(c => (
              <div key={c.id} className="bg-dark-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
                  {c.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{c.full_name}</p>
                  <p className="text-dark-500 text-xs truncate">{c.email}</p>
                  <p className="text-dark-600 text-[10px]">{c.total_orders} orders</p>
                </div>
                <span className="text-green-400 text-sm font-bold flex-shrink-0">{formatCurrency(c.total_spent)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
