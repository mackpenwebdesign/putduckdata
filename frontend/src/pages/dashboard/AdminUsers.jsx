import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Shield,
  Ban,
  CheckCircle,
  Wallet,
  PlusCircle,
  MinusCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Banknote,
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
  Store,
} from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Fund / Deduct Modal                                                */
/* ------------------------------------------------------------------ */
const FundModal = ({ user: selectedUser, open, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [operation, setOperation] = useState('credit');
  const [loading, setLoading] = useState(false);

  if (!open || !selectedUser) return null;

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      await api.post('/admin-fund-wallet', { user_id: selectedUser.id, amount: parsedAmount, reason: reason.trim(), operation });
      toast.success(`${formatCurrency(parsedAmount)} ${operation === 'deduct' ? 'deducted from' : 'credited to'} ${selectedUser.full_name}`);
      setAmount(''); setReason(''); setOperation('credit');
      onClose(); if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || 'Failed to process');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <div>
            <h2 className="text-lg font-bold text-white">Fund / Deduct Wallet</h2>
            <p className="text-dark-400 text-xs mt-0.5">{selectedUser.full_name} — {selectedUser.email}</p>
            <p className="text-dark-500 text-xs">Current balance: <span className="text-primary-400 font-semibold">{formatCurrency(selectedUser.wallet_balance || 0)}</span></p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {['credit', 'deduct'].map((op) => (
              <button key={op} type="button" onClick={() => setOperation(op)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  operation === op
                    ? op === 'credit' ? 'bg-green-600/10 border-green-600/30 text-green-400' : 'bg-red-600/10 border-red-600/30 text-red-400'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'
                }`}>
                {op === 'credit' ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
          <Input label="Amount (GH₵)" type="number" min="0" step="0.01" placeholder="0.00" icon={Banknote} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Reason (optional)</label>
            <textarea rows={2} className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all resize-none" placeholder="Reason..." value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-dark-800">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={operation === 'deduct' ? 'danger' : 'primary'} size="sm" onClick={handleSubmit} loading={loading}>
            {operation === 'deduct' ? 'Deduct' : 'Credit'} Wallet
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Create / Edit User Modal                                           */
/* ------------------------------------------------------------------ */
const UserFormModal = ({ user, open, onClose, onSuccess }) => {
  const isEdit = !!user;
  const [form, setForm] = useState({ full_name: '', email: '', phone_number: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(isEdit
        ? { full_name: user.full_name || '', email: user.email || '', phone_number: user.phone_number || '', password: '' }
        : { full_name: '', email: '', phone_number: '', password: '' }
      );
    }
  }, [open, user]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { toast.error('Name and email are required'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put('/admin-users-manage', { user_id: user.id, full_name: form.full_name.trim(), email: form.email.trim(), phone_number: form.phone_number.trim() });
        toast.success('User updated');
      } else {
        await api.post('/admin-users-manage', { full_name: form.full_name.trim(), email: form.email.trim(), phone_number: form.phone_number.trim(), password: form.password });
        toast.success('User created');
      }
      onClose(); if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Input label="Full Name" placeholder="John Doe" value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email" type="email" placeholder="user@example.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone (optional)" placeholder="0244000000" value={form.phone_number} onChange={(e) => setForm(f => ({ ...f, phone_number: e.target.value }))} />
          {!isEdit && (
            <Input label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-dark-800">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                          */
/* ------------------------------------------------------------------ */
const DeleteModal = ({ user, open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  if (!open || !user) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/admin-users-manage?user_id=${user.id}`);
      toast.success('User deleted');
      onClose(); if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete user');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Delete User?</h3>
        <p className="text-dark-400 text-sm mb-1">This will permanently delete <span className="text-white font-medium">{user.full_name}</span>.</p>
        <p className="text-dark-500 text-xs mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" fullWidth size="sm" onClick={handleDelete} loading={loading}>Delete</Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Admin Users Page                                                   */
/* ------------------------------------------------------------------ */
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const [actionLoading, setActionLoading] = useState({});

  const [fundUser, setFundUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter) params.set('role', roleFilter);
      params.set('limit', pagination.limit);
      params.set('offset', pagination.offset);
      const res = await api.get(`/admin-users-manage?${params.toString()}`);
      const d = res.data || res;
      setUsers(d.users || []);
      setPagination(prev => ({ ...prev, total: d.pagination?.total || 0 }));
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search, roleFilter, pagination.offset, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(prev => ({ ...prev, [`role_${userId}`]: true }));
    try {
      await api.put('/admin-users-manage', { user_id: userId, role: newRole });
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err) { toast.error(err?.message || 'Failed'); }
    finally { setActionLoading(prev => { const n = { ...prev }; delete n[`role_${userId}`]; return n; }); }
  };

  const handleBlock = async (userId, block) => {
    setActionLoading(prev => ({ ...prev, [`block_${userId}`]: true }));
    try {
      await api.put('/admin-users-manage', { user_id: userId, is_blocked: block });
      toast.success(block ? 'User blocked' : 'User unblocked');
      fetchUsers();
    } catch (err) { toast.error(err?.message || 'Failed'); }
    finally { setActionLoading(prev => { const n = { ...prev }; delete n[`block_${userId}`]; return n; }); }
  };

  const handleResellerToggle = async (userId, approve) => {
    setActionLoading(prev => ({ ...prev, [`reseller_${userId}`]: true }));
    try {
      await api.put('/admin-users-manage', { user_id: userId, is_reseller: approve });
      toast.success(approve ? 'Partner approved' : 'Partner status removed');
      fetchUsers();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setActionLoading(prev => { const n = { ...prev }; delete n[`reseller_${userId}`]; return n; }); }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  return (
    <div className="space-y-5">
      <FundModal user={fundUser} open={!!fundUser} onClose={() => setFundUser(null)} onSuccess={fetchUsers} />
      <UserFormModal user={editUser} open={!!editUser} onClose={() => setEditUser(null)} onSuccess={fetchUsers} />
      <UserFormModal user={null} open={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={fetchUsers} />
      <DeleteModal user={deleteUser} open={!!deleteUser} onClose={() => setDeleteUser(null)} onSuccess={fetchUsers} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Manage Users</h1>
          <p className="text-dark-400 text-sm mt-0.5">View, search, and manage all platform users</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" /> Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all text-sm"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, offset: 0 })); }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPagination(prev => ({ ...prev, offset: 0 })); }}
          className="bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm"
        >
          <option value="">All Roles</option>
          <option value="admin">Admins</option>
          <option value="customer">Customers</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs text-dark-400">
        <Users className="w-4 h-4" />
        <span>{pagination.total} total users</span>
        {search && <span>matching "{search}"</span>}
      </div>

      {/* Users Table */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800/50">
            {users.map((u) => (
              <div key={u.id} className="p-4 hover:bg-primary-600/5 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                      u.is_admin ? 'bg-red-600/20 text-red-400' : 'bg-dark-700 text-dark-300'
                    }`}>
                      {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{u.full_name}</p>
                        {u.is_blocked && <Badge variant="danger" size="sm">Blocked</Badge>}
                      </div>
                      <p className="text-dark-400 text-xs truncate">{u.email}</p>
                      <p className="text-dark-500 text-[10px]">{u.phone_number || 'No phone'} · Joined {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Balance + role + actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">{formatCurrency(u.wallet_balance || 0)}</p>
                      <p className="text-dark-500 text-[10px]">Wallet</p>
                    </div>
                    <Badge variant={u.is_admin ? 'danger' : 'default'} size="sm">
                      {u.is_admin ? 'admin' : 'customer'}
                    </Badge>
                    {u.is_reseller && (
                      <Badge variant="success" size="sm">partner</Badge>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {/* Fund/Deduct */}
                      <button
                        onClick={() => setFundUser(u)}
                        className="p-1.5 rounded-lg bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-colors"
                        title="Fund / Deduct Wallet"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => setEditUser(u)}
                        className="p-1.5 rounded-lg bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-colors"
                        title="Edit User"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Approve / Revoke Reseller */}
                      {!u.is_admin && (
                        <button
                          onClick={() => handleResellerToggle(u.id, !u.is_reseller)}
                          disabled={!!actionLoading[`reseller_${u.id}`]}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            u.is_reseller
                              ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                              : 'bg-dark-700/50 text-dark-500 hover:bg-amber-600/10 hover:text-amber-400'
                          }`}
                          title={u.is_reseller ? 'Revoke partner status' : 'Approve as partner'}
                        >
                          {actionLoading[`reseller_${u.id}`]
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Store className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Block / Unblock */}
                      {!u.is_admin && (
                        <button
                          onClick={() => handleBlock(u.id, !u.is_blocked)}
                          disabled={!!actionLoading[`block_${u.id}`]}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            u.is_blocked
                              ? 'bg-green-600/10 text-green-400 hover:bg-green-600/20'
                              : 'bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20'
                          }`}
                          title={u.is_blocked ? 'Unblock User' : 'Block User'}
                        >
                          {actionLoading[`block_${u.id}`]
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : u.is_blocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Delete */}
                      {!u.is_admin && (
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-dark-500 text-xs">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600/10 border border-primary-600/20 rounded-lg text-xs text-primary-400 hover:bg-primary-600/20 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600/10 border border-primary-600/20 rounded-lg text-xs text-primary-400 hover:bg-primary-600/20 disabled:opacity-40 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
