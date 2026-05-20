import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Receipt, Search, Filter, Download, ChevronDown, ChevronUp,
  Smartphone, CreditCard, Landmark, RotateCcw,
  FileText, Trash2, CheckSquare, Square, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, Hash, RefreshCw,
} from 'lucide-react';
import Card, { CardContent } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const TRANSACTION_TYPES = {
  data_purchase: 'Data Purchase',
  wallet_fund: 'Wallet Funding',
  wallet_funding: 'Wallet Funding',
  admin_fund: 'Admin Credit',
  refund: 'Refund',
};

const STATUS_CONFIG = {
  success: { variant: 'success', label: 'Delivered' },
  completed: { variant: 'success', label: 'Delivered' },
  pending: { variant: 'warning', label: 'Pending' },
  failed: { variant: 'danger', label: 'Failed' },
  processing: { variant: 'info', label: 'Processing' },
};

const ICON_MAP = {
  data_purchase: { icon: Smartphone, bg: 'bg-primary-600/10', text: 'text-primary-400' },
  wallet_fund: { icon: CreditCard, bg: 'bg-green-500/15', text: 'text-green-400' },
  wallet_funding: { icon: CreditCard, bg: 'bg-green-500/15', text: 'text-green-400' },
  admin_fund: { icon: Landmark, bg: 'bg-dark-700/60', text: 'text-dark-300' },
  refund: { icon: RotateCcw, bg: 'bg-amber-500/15', text: 'text-amber-400' },
};

const DEFAULT_ICON = { icon: FileText, bg: 'bg-dark-700/50', text: 'text-dark-400' };

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return null; // fallback to formatted date only
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Select / delete state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // 'selected' | 'all' | null

  // Expandable rows
  const [expandedId, setExpandedId] = useState(null);

  // Auto-sync state for pending orders
  const [syncing, setSyncing] = useState(false);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions-history');
      const d = response.data || response;
      setTransactions(d.transactions || []);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Check if there are pending/processing data purchases to auto-poll
  const hasPendingOrders = useMemo(() => {
    return transactions.some(tx =>
      tx.type === 'data_purchase' && ['pending', 'processing'].includes(tx.status)
    );
  }, [transactions]);

  // Auto-poll every 2 minutes if there are pending orders (conserves Vercel invocations + provider rate limits)
  useEffect(() => {
    if (hasPendingOrders) {
      pollIntervalRef.current = setInterval(() => {
        syncPendingOrders(true); // silent mode
      }, 120000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [hasPendingOrders]);

  const syncPendingOrders = useCallback(async (silent = false) => {
    if (syncing) return;
    if (!silent) setSyncing(true);
    try {
      const res = await api.post('/order-status-check', {});
      const d = res.data || res;
      const statusChanged = (d.updated || []).some(u => u.new_status !== 'pending' && u.new_status !== 'processing');
      if (statusChanged) {
        if (!silent) toast.success('Order status updated!');
        fetchTransactions(); // Refresh to show new statuses
      } else if (!silent) {
        toast('No status changes yet', { icon: 'ℹ️' });
      }
    } catch {
      if (!silent) toast.error('Failed to check order status');
    } finally {
      if (!silent) setSyncing(false);
    }
  }, [syncing]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Hide failed data purchases — they were refunded and shouldn't appear in history
      if (tx.type === 'data_purchase' && tx.status === 'failed') return false;

      const matchesSearch =
        tx.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.metadata?.phone_number?.includes(searchQuery) ||
        tx.metadata?.network?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || tx.type === filterType;
      const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, searchQuery, filterType, filterStatus]);

  // Summary stats — only count confirmed (success/completed) purchases, not failed/pending/refunded ones
  const stats = useMemo(() => {
    let totalSpent = 0;
    let totalFunded = 0;
    transactions.forEach(tx => {
      const amt = parseFloat(tx.amount || 0);
      if (tx.type === 'data_purchase' && ['success', 'completed'].includes(tx.status)) totalSpent += amt;
      if (['wallet_fund', 'wallet_funding', 'admin_fund', 'refund'].includes(tx.type)) totalFunded += amt;
    });
    return { count: transactions.length, totalSpent, totalFunded };
  }, [transactions]);

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    const headers = ['Date', 'Type', 'Amount', 'Status', 'Reference'];
    const rows = filteredTransactions.map(tx => [
      formatDate(tx.created_at),
      TRANSACTION_TYPES[tx.type] || tx.type,
      formatAmount(tx.amount, tx.type),
      (STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending).label,
      tx.reference || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transactions exported');
  };

  // Select helpers
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // Delete handlers
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await api.delete('/transactions-delete', {
        data: { transaction_ids: [...selectedIds] }
      });
      toast.success(`${selectedIds.size} transaction(s) deleted`);
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(null);
      fetchTransactions();
    } catch {
      toast.error('Failed to delete transactions');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setDeleting(true);
    try {
      await api.delete('/transactions-delete', {
        data: { clear_all: true }
      });
      toast.success('All transaction history cleared');
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(null);
      fetchTransactions();
    } catch {
      toast.error('Failed to clear transactions');
    } finally {
      setDeleting(false);
    }
  };

  const formatAmount = (amount, type) => {
    const isCredit = ['wallet_fund', 'wallet_funding', 'admin_fund', 'refund'].includes(type);
    const prefix = isCredit ? '+' : '-';
    return `${prefix}${formatCurrency(parseFloat(Math.abs(amount)))}`;
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy · hh:mm a');
    } catch {
      return dateString;
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-dark-800/50 rounded-lg animate-pulse w-48 mb-2" />
            <div className="h-4 bg-dark-800/30 rounded animate-pulse w-64" />
          </div>
          <div className="h-9 bg-dark-800/50 rounded-xl animate-pulse w-24" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4">
              <div className="h-3 bg-dark-800/40 rounded animate-pulse w-16 mb-3" />
              <div className="h-6 bg-dark-800/50 rounded animate-pulse w-24" />
            </div>
          ))}
        </div>
        {/* Rows skeleton */}
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b border-dark-800/50 flex items-center gap-4">
              <div className="w-10 h-10 bg-dark-800/50 rounded-xl animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-dark-800/50 rounded animate-pulse w-40" />
                <div className="h-3 bg-dark-800/30 rounded animate-pulse w-56" />
              </div>
              <div className="h-5 bg-dark-800/50 rounded-full animate-pulse w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Transactions</h1>
          <p className="text-dark-400 text-sm mt-0.5">View and manage your transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPendingOrders && (
            <Button
              onClick={() => syncPendingOrders(false)}
              variant="outline"
              size="sm"
              disabled={syncing}
              className="border-yellow-600/40 text-yellow-400 hover:bg-yellow-600/10"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Checking...' : 'Check Status'}
            </Button>
          )}
          {transactions.length > 0 && (
            <>
              <Button
                onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                variant="outline"
                size="sm"
                className={selectMode ? 'border-primary-600 text-primary-400' : ''}
              >
                {selectMode ? <XCircle className="w-4 h-4 mr-1.5" /> : <CheckSquare className="w-4 h-4 mr-1.5" />}
                {selectMode ? 'Cancel' : 'Select'}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm('all')}
                variant="outline"
                size="sm"
                className="border-red-600/40 text-red-400 hover:bg-red-600/10"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Clear
              </Button>
            </>
          )}
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Auto-sync indicator */}
      {hasPendingOrders && (
        <div className="flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-4 py-2.5">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <p className="text-dark-400 text-xs">
            <span className="text-yellow-400 font-medium">Auto-checking</span> pending orders every 30 seconds
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-3 sm:p-4 hover:border-dark-700/80 transition-colors min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash className="w-3 h-3 text-dark-500 flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-dark-500 font-medium uppercase tracking-wide truncate">Total</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">{stats.count}</span>
          </div>
          <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-3 sm:p-4 hover:border-red-900/30 transition-colors min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="w-3 h-3 text-red-400/70 flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-dark-500 font-medium uppercase tracking-wide truncate">Spent</span>
            </div>
            <span className="text-sm sm:text-lg font-bold text-white truncate block">{formatCurrency(stats.totalSpent)}</span>
          </div>
          <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-3 sm:p-4 hover:border-green-900/30 transition-colors min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3 h-3 text-green-400/70 flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-dark-500 font-medium uppercase tracking-wide truncate">Funded</span>
            </div>
            <span className="text-sm sm:text-lg font-bold text-white truncate block">{formatCurrency(stats.totalFunded)}</span>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <Card variant="default" padding="sm">
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by reference, description, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="lg:w-auto"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dark-800">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {Object.entries(TRANSACTION_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {(filterType !== 'all' || filterStatus !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-800">
              <span className="text-xs text-dark-400">Active:</span>
              {filterType !== 'all' && (
                <Badge variant="primary" size="sm">{TRANSACTION_TYPES[filterType]}</Badge>
              )}
              {filterStatus !== 'all' && (
                <Badge variant="info" size="sm">{STATUS_CONFIG[filterStatus].label}</Badge>
              )}
              {searchQuery && (
                <Badge variant="default" size="sm">"{searchQuery}"</Badge>
              )}
              <button
                onClick={() => { setFilterType('all'); setFilterStatus('all'); setSearchQuery(''); }}
                className="text-xs text-primary-600 hover:text-primary-500 ml-auto font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Select Mode: Select All + action bar */}
      {selectMode && filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between bg-dark-900/80 border border-dark-800 rounded-xl px-4 py-2.5">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-dark-300 hover:text-white transition-colors"
          >
            {selectedIds.size === filteredTransactions.length
              ? <CheckSquare className="w-4 h-4 text-primary-400" />
              : <Square className="w-4 h-4" />
            }
            <span>{selectedIds.size === filteredTransactions.length ? 'Deselect All' : 'Select All'}</span>
          </button>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                onClick={() => setShowDeleteConfirm('selected')}
                variant="outline"
                size="sm"
                className="border-red-600/40 text-red-400 hover:bg-red-600/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card variant="default" padding="lg">
          <CardContent>
            <EmptyState
              icon={Receipt}
              title={searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'No transactions found'
                : 'No transactions yet'}
              description={searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Your transaction history will appear here once you make a purchase or fund your wallet'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-dark-800/60">
            {filteredTransactions.map((tx) => {
              const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
              const iconCfg = ICON_MAP[tx.type] || DEFAULT_ICON;
              const IconComp = iconCfg.icon;
              const isCredit = ['wallet_fund', 'wallet_funding', 'admin_fund', 'refund'].includes(tx.type);
              const isExpanded = expandedId === tx.id;
              const isSelected = selectedIds.has(tx.id);
              const relative = timeAgo(tx.created_at);

              return (
                <div key={tx.id} className="group">
                  <div
                    className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary-600/5' : 'hover:bg-primary-600/5'
                    }`}
                    onClick={() => {
                      if (selectMode) {
                        toggleSelect(tx.id);
                      } else {
                        setExpandedId(isExpanded ? null : tx.id);
                      }
                    }}
                  >
                    {/* Checkbox in select mode */}
                    {selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(tx.id); }}
                        className="flex-shrink-0"
                      >
                        {isSelected
                          ? <CheckSquare className="w-5 h-5 text-primary-400" />
                          : <Square className="w-5 h-5 text-dark-600 hover:text-dark-400" />
                        }
                      </button>
                    )}

                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconCfg.bg}`}>
                      <IconComp className={`w-[18px] h-[18px] ${iconCfg.text}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white text-sm font-semibold truncate">
                          {TRANSACTION_TYPES[tx.type] || tx.type}
                        </h4>
                        <Badge variant={statusConfig.variant} size="sm" className="hidden sm:inline-flex">
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-dark-500 text-xs mt-0.5 truncate">
                        {tx.type === 'data_purchase' && tx.metadata
                          ? `${tx.metadata.data_volume || ''} ${tx.metadata.network || ''} to ${tx.metadata.phone_number || tx.recipient_phone || ''}${tx.status === 'failed' ? ' · Refunded' : ''}`
                          : tx.description || tx.reference || ''
                        }
                      </p>
                    </div>

                    {/* Amount + Status + Time */}
                    <div className="text-right flex-shrink-0 min-w-0 max-w-[110px] sm:max-w-none">
                      <div className={`text-sm font-bold truncate ${isCredit ? 'text-green-400' : 'text-white'}`}>
                        {formatAmount(tx.amount, tx.type)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant={statusConfig.variant} size="sm">
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="text-dark-600 text-[10px] mt-0.5 hidden sm:block">
                        {relative || formatDate(tx.created_at).split('·')[0]}
                      </div>
                    </div>

                    {/* Expand indicator */}
                    {!selectMode && (
                      <div className="flex-shrink-0 text-dark-600">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && !selectMode && (
                    <div className="px-5 sm:px-6 pb-4 pt-0 bg-primary-600/5">
                      <div className="border-t border-dark-800/40 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex justify-between sm:block">
                          <span className="text-dark-500 text-xs">Date & Time</span>
                          <span className="text-white text-xs sm:block sm:mt-0.5">{formatDate(tx.created_at)}</span>
                        </div>
                        {tx.reference && (
                          <div className="col-span-1 sm:col-span-2">
                            <span className="text-dark-500 text-xs">Reference</span>
                            <p className="text-dark-300 text-xs font-mono mt-0.5 truncate max-w-full" title={tx.reference}>{tx.reference}</p>
                          </div>
                        )}
                        {tx.metadata?.phone_number && (
                          <div className="flex justify-between sm:block">
                            <span className="text-dark-500 text-xs">Phone</span>
                            <span className="text-white text-xs sm:block sm:mt-0.5">{tx.metadata.phone_number}</span>
                          </div>
                        )}
                        {tx.metadata?.network && (
                          <div className="flex justify-between sm:block">
                            <span className="text-dark-500 text-xs">Network</span>
                            <span className="text-white text-xs sm:block sm:mt-0.5">{tx.metadata.network}</span>
                          </div>
                        )}
                        {tx.metadata?.plan_name && (
                          <div className="flex justify-between sm:block">
                            <span className="text-dark-500 text-xs">Plan</span>
                            <span className="text-white text-xs sm:block sm:mt-0.5">{tx.metadata.plan_name}</span>
                          </div>
                        )}
                        {tx.metadata?.data_volume && (
                          <div className="flex justify-between sm:block">
                            <span className="text-dark-500 text-xs">Data Volume</span>
                            <span className="text-white text-xs sm:block sm:mt-0.5">{tx.metadata.data_volume}</span>
                          </div>
                        )}
                        {tx.metadata?.payment_method && (
                          <div className="flex justify-between sm:block">
                            <span className="text-dark-500 text-xs">Payment Method</span>
                            <span className="text-white text-xs sm:block sm:mt-0.5">{tx.metadata.payment_method}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {filteredTransactions.length > 0 && (
        <div className="text-center text-xs text-dark-500">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {showDeleteConfirm === 'all' ? 'Clear All History?' : 'Delete Transactions?'}
                </h3>
                <p className="text-dark-400 text-sm">
                  {showDeleteConfirm === 'all'
                    ? 'This will permanently remove all your transaction history.'
                    : `This will permanently delete ${selectedIds.size} selected transaction(s).`
                  }
                </p>
              </div>
            </div>
            <p className="text-dark-500 text-xs mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(null)}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={showDeleteConfirm === 'all' ? handleClearAll : handleDeleteSelected}
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : showDeleteConfirm === 'all' ? 'Clear All' : `Delete (${selectedIds.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
