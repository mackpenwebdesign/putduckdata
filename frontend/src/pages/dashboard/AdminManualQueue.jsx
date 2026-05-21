import { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  Loader2,
  Zap,
  Square,
  CheckSquare,
} from 'lucide-react';
import api from '../../utils/api';
import { formatCurrency, cleanPlanName } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

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
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchManualOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all orders and filter client-side for manual fulfilment ones
      const res = await api.get('/admin-orders?type=all&limit=200');
      const d = res.data || res;
      const all = d.transactions || [];
      setOrders(
        all.filter(
          tx => tx.metadata?.needs_manual_fulfil && !['completed', 'failed'].includes(tx.status)
        )
      );
    } catch {
      toast.error('Failed to load manual orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchManualOrders(); }, [fetchManualOrders]);

  // Clear selection when orders list refreshes
  useEffect(() => { setSelectedIds(new Set()); }, [orders]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

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

  const retryOrders = async () => {
    setRetrying(true);
    try {
      const body = { action: 'verify_pending_24h' };
      if (selectedIds.size > 0) {
        body.ids = [...selectedIds];
      }
      const res = await api.put('/admin-orders', body);
      const d = res.data || res;
      const selLabel = selectedIds.size > 0 ? `${selectedIds.size} selected` : 'all';
      toast.success(`Sent ${selLabel} to 1Papi: ${d.placed ?? 0} placed, ${d.failed ?? 0} failed, ${d.skipped ?? 0} skipped`);
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

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;
  const someSelected = selectedIds.size > 0;

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
            Orders awaiting manual fulfilment — select which to send, then tap Send to 1Papi
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={retryOrders}
            disabled={retrying}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-primary-600/10 border border-primary-600/30 text-primary-400 hover:bg-primary-600/20 transition-colors disabled:opacity-50"
            title={someSelected ? `Send ${selectedIds.size} selected order(s) to 1Papi` : 'Send all pending orders to 1Papi'}
          >
            {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {retrying
              ? 'Sending...'
              : someSelected
              ? `Send ${selectedIds.size} to 1Papi`
              : 'Send All to 1Papi'}
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
        <>
          {/* Select all row */}
          <div className="flex items-center gap-3 px-1">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-dark-400 hover:text-white transition-colors"
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-primary-400" />
                : <Square className="w-4 h-4" />}
              {allSelected ? 'Deselect all' : `Select all (${orders.length})`}
            </button>
            {someSelected && (
              <span className="text-xs text-primary-400 font-medium">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          <div className="space-y-2">
            {orders.map((order) => {
              const isSelected = selectedIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className={`bg-dark-900/80 border rounded-2xl p-4 transition-colors ${
                    isSelected ? 'border-primary-600/60 bg-primary-600/5' : 'border-dark-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(order.id)}
                      className="mt-1 flex-shrink-0 text-dark-500 hover:text-primary-400 transition-colors"
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary-400" />
                        : <Square className="w-4 h-4" />}
                    </button>

                    {/* Order details + actions */}
                    <div className="flex-1 flex items-start justify-between gap-3 flex-wrap min-w-0">
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
                          {order.metadata?.guest && (
                            <span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full text-[10px]">Guest</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-dark-500">
                          <span>Customer: <span className="text-dark-300">{order.user_name}</span></span>
                          <span>Ref: <span className="text-dark-300 font-mono">{order.reference}</span></span>
                          <CopyBtn text={order.reference} label="Copy ref" />
                          <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                        </div>
                        {order.metadata?.provider_error && (
                          <p className="text-[10px] text-red-400/70">
                            Error: {order.metadata.provider_error}
                          </p>
                        )}
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
                </div>
              );
            })}
          </div>
        </>
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
