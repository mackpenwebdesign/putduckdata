import { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  ClipboardList,
  Loader2,
  Zap,
} from 'lucide-react';
import api from '../../utils/api';
import { formatCurrency, cleanPlanName } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const CopyBtn = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : (label || 'Copy')}
    </button>
  );
};

const AdminManualQueue = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTx, setUpdatingTx] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchManualOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pending data purchases — filter manual ones client-side
      const res = await api.get('/admin-orders?type=data_purchase&status=pending&limit=100');
      const d = res.data || res;
      const all = d.transactions || [];
      // Keep only orders flagged for manual fulfilment
      setOrders(all.filter(tx => tx.metadata?.needs_manual_fulfil));
    } catch {
      toast.error('Failed to load manual orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchManualOrders(); }, [fetchManualOrders]);

  const updateOrder = async (txId, action) => {
    setUpdatingTx(`${txId}-${action}`);
    try {
      await api.put('/admin-orders', { transaction_id: txId, action });
      toast.success(action === 'complete' ? 'Order marked complete' : action === 'fail' ? 'Order marked failed' : 'Order refunded');
      fetchManualOrders();
    } catch (err) {
      toast.error(err?.message || 'Failed to update order');
    } finally {
      setUpdatingTx(null);
    }
  };

  const retryAll = async () => {
    setRetrying(true);
    try {
      const res = await api.put('/admin-orders', { action: 'verify_pending_24h' });
      const d = res.data || res;
      toast.success(`Sent to 1Papi: ${d.placed ?? 0} placed, ${d.failed ?? 0} failed, ${d.skipped ?? 0} skipped`);
      await fetchManualOrders();
    } catch (err) {
      toast.error(err?.message || 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  const copyAllNumbers = () => {
    const numbers = orders.map(o => o.recipient_phone).filter(Boolean);
    if (!numbers.length) return;
    navigator.clipboard.writeText(numbers.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success(`Copied ${numbers.length} number${numbers.length !== 1 ? 's' : ''}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Manual Queue</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Orders awaiting manual fulfilment — send data via your provider portal, then mark each as done
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={retryAll}
            disabled={retrying}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-primary-600/10 border border-primary-600/30 text-primary-400 hover:bg-primary-600/20 transition-colors disabled:opacity-50"
            title="Re-submit all pending orders from the last 24h to 1Papi. Run after syncing prices."
          >
            {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {retrying ? 'Sending...' : 'Send All to 1Papi'}
          </button>
          {orders.length > 0 && (
            <button
              onClick={copyAllNumbers}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition-colors"
            >
              {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? 'Copied all!' : `Copy all ${orders.length} numbers`}
            </button>
          )}
          <button
            onClick={fetchManualOrders}
            className="p-2 rounded-lg bg-dark-800/50 border border-dark-700/50 text-dark-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-dark-900/50 border border-dark-800 rounded-2xl">
          <CheckCircle className="w-12 h-12 text-green-500/40 mb-4" />
          <h3 className="text-white font-semibold mb-1">All caught up!</h3>
          <p className="text-dark-500 text-sm">No pending manual orders at the moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                {/* Left: phone + details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-lg font-bold tabular-nums tracking-wide">
                      {order.recipient_phone || '—'}
                    </span>
                    {order.recipient_phone && <CopyBtn text={order.recipient_phone} />}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-primary-600/10 text-primary-400 px-2 py-0.5 rounded-full font-medium">
                      {order.metadata?.data_volume || '?'}
                    </span>
                    <span className="bg-dark-800 text-dark-400 px-2 py-0.5 rounded-full">
                      {order.metadata?.network}
                    </span>
                    <span className="bg-dark-800 text-dark-400 px-2 py-0.5 rounded-full">
                      {cleanPlanName(order.metadata?.plan_name)}
                    </span>
                    <span className="text-green-400 font-semibold">{formatCurrency(order.amount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-dark-500">
                    <span>Customer: <span className="text-dark-300">{order.user_name}</span></span>
                    <span>Ref: <span className="text-dark-300 font-mono">{order.reference}</span></span>
                    <CopyBtn text={order.reference} label="Copy ref" />
                    <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Right: action buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateOrder(order.id, 'complete')}
                    disabled={!!updatingTx}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {updatingTx === `${order.id}-complete` ? 'Marking...' : 'Done'}
                  </button>
                  <button
                    onClick={() => updateOrder(order.id, 'refund')}
                    disabled={!!updatingTx}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {updatingTx === `${order.id}-refund` ? '...' : 'Refund'}
                  </button>
                  <button
                    onClick={() => updateOrder(order.id, 'fail')}
                    disabled={!!updatingTx}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {updatingTx === `${order.id}-fail` ? '...' : 'Fail'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {orders.length > 0 && (
        <div className="text-center text-dark-500 text-xs pt-2">
          {orders.length} order{orders.length !== 1 ? 's' : ''} pending · Total: {formatCurrency(orders.reduce((s, o) => s + o.amount, 0))}
        </div>
      )}
    </div>
  );
};

export default AdminManualQueue;
