import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  Package,
  X,
  AlertCircle,
  Loader2,
  Edit3,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import useAuthStore from '../../stores/authStore';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { cleanPlanName } from '../../utils/formatters';

const NETWORKS = ['MTN', 'TELECEL', 'AIRTEL_TIGO'];

const NETWORK_COLORS = {
  MTN: 'warning',
  TELECEL: 'danger',
  AIRTEL_TIGO: 'info',
};

const NETWORK_LABELS = {
  MTN: 'MTN',
  TELECEL: 'Telecel',
  AIRTEL_TIGO: 'AirtelTigo',
};

const EMPTY_FORM = {
  network: 'MTN',
  plan_name: '',
  data_volume: '',
  validity_days: '90',
  price: '',
  cost_price: '',
};

const AdminPlans = () => {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // null = create, object = edit
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkAction, setBulkAction] = useState(null);
  const [syncingPrices, setSyncingPrices] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin-plans-manage');
      const d = response.data || response;
      setPlans(d.plans || []);
    } catch (error) {
      toast.error(error?.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = plans.filter((plan) => {
    const matchesNetwork = activeTab === 'ALL' || plan.network === activeTab;
    const matchesSearch =
      !searchQuery ||
      plan.plan_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.data_volume?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNetwork && matchesSearch;
  });

  const plansByNetwork = NETWORKS.reduce((acc, network) => {
    acc[network] = filteredPlans.filter((p) => p.network === network);
    return acc;
  }, {});

  const handleToggle = async (plan) => {
    setTogglingId(plan.id);
    try {
      await api.put('/admin-plans-manage', {
        plan_id: plan.id,
        is_active: !plan.is_active,
      });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
      );
      toast.success(`Plan ${!plan.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update plan');
    } finally {
      setTogglingId(null);
    }
  };

  const handleBulkAction = async (action) => {
    setBulkAction(action);
    try {
      await api.put('/admin-plans-manage', { bulk_action: action });
      setPlans((prev) =>
        prev.map((p) => ({ ...p, is_active: action === 'activate_all' }))
      );
      toast.success(
        action === 'activate_all'
          ? 'All plans activated successfully'
          : 'All plans deactivated successfully'
      );
    } catch (error) {
      toast.error(error?.message || 'Bulk action failed');
    } finally {
      setBulkAction(null);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }
    setDeletingId(planId);
    try {
      await api.delete(`/admin-plans-manage?plan_id=${planId}`);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      toast.success('Plan deleted successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete plan');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      network: plan.network,
      plan_name: plan.plan_name,
      data_volume: plan.data_volume,
      validity_days: String(plan.validity_days || ''),
      price: String(plan.price || ''),
      cost_price: String(plan.cost_price || ''),
    });
    setShowModal(true);
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();

    if (!formData.plan_name || !formData.data_volume || !formData.price || !formData.validity_days) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPlan) {
        // UPDATE existing plan
        const response = await api.put('/admin-plans-manage', {
          plan_id: editingPlan.id,
          plan_name: formData.plan_name,
          data_volume: formData.data_volume,
          validity_days: Number(formData.validity_days),
          price: Number(formData.price),
        });

        const rd = response.data || response;
        const updatedPlan = rd.plan;
        if (updatedPlan) {
          setPlans((prev) =>
            prev.map((p) => (p.id === editingPlan.id ? { ...p, ...updatedPlan, price: parseFloat(updatedPlan.price), cost_price: parseFloat(updatedPlan.cost_price) } : p))
          );
        } else {
          await fetchPlans();
        }

        toast.success('Plan updated successfully');
      } else {
        // CREATE new plan
        const response = await api.post('/admin-plans-manage', {
          network: formData.network,
          plan_name: formData.plan_name,
          data_volume: formData.data_volume,
          validity_days: Number(formData.validity_days),
          price: Number(formData.price),
        });

        const rd = response.data || response;
        const newPlan = rd.plan;
        if (newPlan) {
          setPlans((prev) => [...prev, newPlan]);
        } else {
          await fetchPlans();
        }

        toast.success('Plan created successfully');
      }

      setFormData(EMPTY_FORM);
      setEditingPlan(null);
      setShowModal(false);
    } catch (error) {
      toast.error(error?.message || (editingPlan ? 'Failed to update plan' : 'Failed to create plan'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncPrices = async () => {
    setSyncingPrices(true);
    try {
      const response = await api.get('/auto-sync-plans');
      const d = response.data || response;
      toast.success(
        `1Papi sync done: ${d.updated} plans updated, ${d.skipped ?? 0} unmatched`
      );
      await fetchPlans();
    } catch (error) {
      toast.error(error?.message || '1Papi sync failed');
    } finally {
      setSyncingPrices(false);
    }
  };

  const activePlanCount = plans.filter((p) => p.is_active).length;
  const inactivePlanCount = plans.filter((p) => !p.is_active).length;

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-dark-800/50 rounded animate-pulse w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-dark-800/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-dark-800/50 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Plan Management</h1>
          <p className="text-dark-400">Manage data plans across all networks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPlans}
            className="p-2 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg transition-colors"
            title="Refresh plans"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleSyncPrices}
            loading={syncingPrices}
            disabled={syncingPrices}
            title="Pull latest cost prices from 1Papi"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncingPrices ? 'animate-spin' : ''}`} />
            Sync 1Papi Prices
          </Button>
          <Button onClick={handleOpenCreate} size="md">
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Total Plans</p>
              <p className="text-2xl font-bold text-white mt-1">{plans.length}</p>
            </div>
            <Package className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-green-500 mt-1">{activePlanCount}</p>
            </div>
            <ToggleRight className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Inactive</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{inactivePlanCount}</p>
            </div>
            <ToggleLeft className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <Card variant="default" padding="sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-2">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleBulkAction('activate_all')}
              loading={bulkAction === 'activate_all'}
              disabled={!!bulkAction}
            >
              <ToggleRight className="w-4 h-4 mr-1" />
              Activate All
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleBulkAction('deactivate_all')}
              loading={bulkAction === 'deactivate_all'}
              disabled={!!bulkAction}
            >
              <ToggleLeft className="w-4 h-4 mr-1" />
              Deactivate All
            </Button>
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search plans..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Network Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', ...NETWORKS].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${
                activeTab === tab
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'bg-dark-900/60 border border-dark-700 text-dark-400 hover:border-primary-600/40 hover:text-primary-400'
              }
            `}
          >
            {tab === 'ALL' ? 'All Networks' : NETWORK_LABELS[tab]}
            <span className="ml-2 text-xs opacity-70">
              ({tab === 'ALL' ? filteredPlans.length : plansByNetwork[tab]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Plans Table */}
      {filteredPlans.length === 0 ? (
        <Card variant="default" padding="lg">
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400 text-lg">No plans found</p>
            <p className="text-dark-500 text-sm mt-1">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create a new plan to get started'}
            </p>
          </div>
        </Card>
      ) : activeTab === 'ALL' ? (
        // Grouped view when "All Networks" is selected
        NETWORKS.map((network) => {
          const networkPlans = plansByNetwork[network];
          if (!networkPlans || networkPlans.length === 0) return null;
          return (
            <Card key={network} variant="default" padding="none">
              <div className="px-6 py-4 border-b border-dark-800 flex items-center gap-3">
                <Badge variant={NETWORK_COLORS[network]} size="sm">
                  {NETWORK_LABELS[network]}
                </Badge>
                <span className="text-dark-400 text-sm">
                  {networkPlans.length} plan{networkPlans.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <PlanTable
                  plans={networkPlans}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleOpenEdit}
                  togglingId={togglingId}
                  deletingId={deletingId}
                />
              </div>
            </Card>
          );
        })
      ) : (
        // Single network view
        <Card variant="default" padding="none">
          <div className="px-6 py-4 border-b border-dark-800 flex items-center gap-3">
            <Badge variant={NETWORK_COLORS[activeTab]} size="sm">
              {NETWORK_LABELS[activeTab]}
            </Badge>
            <span className="text-dark-400 text-sm">
              {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <PlanTable
              plans={filteredPlans}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleOpenEdit}
              togglingId={togglingId}
              deletingId={deletingId}
            />
          </div>
        </Card>
      )}

      {/* Create Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
              <h2 className="text-xl font-bold text-white">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button
                onClick={() => { setShowModal(false); setEditingPlan(null); }}
                className="p-1 text-dark-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPlan} className="p-6 space-y-4">
              {/* Network Select - disabled when editing */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Network
                </label>
                <select
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  disabled={!!editingPlan}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-smooth disabled:opacity-50"
                >
                  {NETWORKS.map((n) => (
                    <option key={n} value={n}>
                      {NETWORK_LABELS[n]}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Plan Name"
                placeholder="e.g. MTN 5GB"
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Data Volume"
                  placeholder="e.g. 5GB"
                  value={formData.data_volume}
                  onChange={(e) => setFormData({ ...formData, data_volume: e.target.value })}
                  required
                />
                <Input
                  label="Validity (days)"
                  type="number"
                  placeholder="e.g. 90"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                  required
                  min="1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Customer Price (GH₵)"
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                />
                <div>
                  <label className="block text-sm font-medium text-dark-500 mb-2">
                    Cost Price (GH₵)
                  </label>
                  <div className="w-full bg-dark-800/40 border border-dark-700/50 rounded-lg px-4 py-2.5 text-dark-500 text-sm cursor-not-allowed select-none flex items-center justify-between">
                    <span>{formData.cost_price ? `GH₵${Number(formData.cost_price).toFixed(2)}` : '—'}</span>
                    <span className="text-xs text-dark-600">Set by 1Papi sync</span>
                  </div>
                </div>
              </div>

              {formData.price && formData.cost_price && Number(formData.cost_price) > 0 && (
                <div className="bg-dark-800/50 rounded-xl p-3 space-y-1">
                  <p className="text-dark-400 text-sm">
                    Profit per sale:{' '}
                    <span className="text-primary-600 font-semibold">
                      GH₵{(Number(formData.price) - Number(formData.cost_price)).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  className="flex-1"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Reusable plan table component
 */
const PlanTable = ({ plans, onToggle, onDelete, onEdit, togglingId, deletingId }) => {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-dark-800">
          <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">
            Plan Name
          </th>
          <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">
            Volume
          </th>
          <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">
            Validity
          </th>
          <th className="text-right text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">
            Price
          </th>
          <th className="text-right text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">
            Cost
          </th>
          <th className="text-center text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">
            Status
          </th>
          <th className="text-right text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-dark-800/50">
        {plans.map((plan) => (
          <tr
            key={plan.id}
            className="hover:bg-primary-600/5 transition-colors"
          >
            <td className="px-6 py-4">
              <p className="text-white font-medium text-sm">{cleanPlanName(plan.plan_name)}</p>
            </td>
            <td className="px-6 py-4">
              <Badge variant="primary" size="sm">{plan.data_volume}</Badge>
            </td>
            <td className="px-6 py-4">
              <span className="text-dark-300 text-sm">
                90 days
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <span className="text-white font-semibold text-sm">
                GH₵{Number(plan.price).toFixed(2)}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <span className="text-dark-400 text-sm">
                GH₵{Number(plan.cost_price).toFixed(2)}
              </span>
            </td>
            <td className="px-6 py-4 text-center">
              <button
                onClick={() => onToggle(plan)}
                disabled={togglingId === plan.id}
                className="inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title={plan.is_active ? 'Deactivate plan' : 'Activate plan'}
              >
                {togglingId === plan.id ? (
                  <Loader2 className="w-5 h-5 text-dark-400 animate-spin" />
                ) : plan.is_active ? (
                  <ToggleRight className="w-6 h-6 text-green-500 hover:text-green-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-dark-500 hover:text-dark-300" />
                )}
                <span
                  className={`text-xs font-medium ${
                    plan.is_active ? 'text-green-500' : 'text-dark-500'
                  }`}
                >
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </button>
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onEdit(plan)}
                  className="p-2 text-dark-400 hover:text-primary-500 hover:bg-primary-600/10 rounded-lg transition-colors"
                  title="Edit plan"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(plan.id)}
                  disabled={deletingId === plan.id}
                  className="p-2 text-dark-400 hover:text-red-500 hover:bg-red-600/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete plan"
                >
                  {deletingId === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AdminPlans;
