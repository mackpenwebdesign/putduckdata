import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Send, Loader2, X, Users, Globe, UserCheck, Clock, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

const TARGET_OPTIONS = [
  { value: 'all',    label: 'Everyone',       sub: 'Logged-in users & guests', icon: Globe,      color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
  { value: 'users',  label: 'Logged-in only', sub: 'Users with accounts only', icon: UserCheck,  color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20' },
  { value: 'guests', label: 'Guests only',    sub: 'Visitors without accounts', icon: Users,      color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
];

const AdminBroadcasts = () => {
  const [form, setForm] = useState({ title: '', message: '', url: '', targets: 'all' });
  const [sending, setSending] = useState(false);
  const [active, setActive] = useState(null);
  const [loadingActive, setLoadingActive] = useState(true);

  const fetchActive = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = await api.get('/broadcasts-active?limit=1');
      const d = res.data || res;
      setActive(d.broadcasts?.[0] || null);
    } catch {
      setActive(null);
    } finally {
      setLoadingActive(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      await api.post('/admin-broadcast', {
        title:   form.title.trim(),
        message: form.message.trim(),
        url:     form.url.trim() || undefined,
        targets: form.targets,
      });
      toast.success('Broadcast sent! It will show as a popup to the selected audience.');
      setForm({ title: '', message: '', url: '', targets: 'all' });
      fetchActive();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    try {
      await api.post('/admin-broadcast', {
        title: '__CLEAR__', message: '__CLEAR__', targets: 'all',
      });
    } catch {}
    setActive(null);
    toast.success('Active broadcast cleared');
  };

  const timeAgo = (d) => {
    if (!d) return '';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Broadcasts</h1>
          <p className="text-dark-400 text-sm mt-0.5">Send popup announcements to users or guests</p>
        </div>
        <button onClick={fetchActive} className="p-2 rounded-xl bg-dark-800/50 border border-dark-700/50 text-dark-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loadingActive ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Current active broadcast */}
      <div>
        <p className="text-[10px] font-bold text-dark-600 uppercase tracking-widest mb-2.5">Currently Active</p>
        {loadingActive ? (
          <div className="h-24 bg-dark-800/40 rounded-2xl animate-pulse" />
        ) : active ? (
          <div className="bg-dark-900/60 border border-primary-500/20 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary-600/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Megaphone className="w-4 h-4 text-primary-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold text-sm truncate">{active.title}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex-shrink-0">
                      <CheckCircle className="w-2.5 h-2.5" /> Live
                    </span>
                  </div>
                  <p className="text-dark-400 text-xs leading-relaxed">{active.message}</p>
                  {active.url && <a href={active.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 text-xs hover:underline mt-1 block truncate">{active.url}</a>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-dark-600 text-[10px] flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(active.created_at)}</span>
                    <span className="text-dark-600 text-[10px]">→ {active.targets}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleClear} className="p-1.5 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-dark-900/60 border border-dark-800/60 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 bg-dark-800 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Megaphone className="w-5 h-5 text-dark-600" />
            </div>
            <p className="text-dark-500 text-sm font-medium">No active broadcast</p>
          </div>
        )}
      </div>

      {/* Create form */}
      <div className="bg-dark-900/60 border border-dark-800/60 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-primary-600/15 rounded-xl flex items-center justify-center">
            <Send className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">New Broadcast</h2>
            <p className="text-dark-500 text-xs">Replaces any currently active broadcast</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-dark-400 mb-1.5">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. 🎉 Special Promo Today!"
              maxLength={100}
              className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-dark-400 mb-1.5">Message <span className="text-red-400">*</span></label>
            <textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              placeholder="Write your announcement here..."
              rows={4}
              maxLength={500}
              className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 resize-none transition-all"
            />
            <p className="text-dark-700 text-[10px] mt-1 text-right">{form.message.length}/500</p>
          </div>

          {/* URL (optional) */}
          <div>
            <label className="block text-xs font-semibold text-dark-400 mb-1.5">Link URL <span className="text-dark-600">(optional)</span></label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-600/50 placeholder-dark-600 transition-all"
            />
          </div>

          {/* Audience */}
          <div>
            <label className="block text-xs font-semibold text-dark-400 mb-2">Audience</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TARGET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, targets: opt.value }))}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    form.targets === opt.value
                      ? `${opt.bg} ${opt.border} ${opt.color}`
                      : 'bg-dark-800/40 border-dark-700/50 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  <opt.icon className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p className="text-[10px] opacity-60 truncate">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !form.title.trim() || !form.message.trim()}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Broadcast</>}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 flex items-start gap-3">
        <Megaphone className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-amber-300/70 text-xs leading-relaxed">
          Only <span className="font-bold">one broadcast</span> can be active at a time. Sending a new one automatically replaces the current. It expires after <span className="font-bold">24 hours</span>.
        </p>
      </div>
    </div>
  );
};

export default AdminBroadcasts;
