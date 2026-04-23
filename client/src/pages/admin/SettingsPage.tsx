import React, { useState, useEffect } from 'react';
import { Calendar, Save, Clock, Info, History, DollarSign, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import { configApi, ordersApi } from '../../utils/api';

export const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    batch_name: '',
    cutoff_date: '',
    eta_start: '',
    eta_end: '',
    jpy_to_php_rate: '',
    is_ordering_open: '1',
    announcement_text: '',
    whatsapp_link: '',
    messenger_link: ''
  });
  const [batchHistory, setBatchHistory] = useState<any[]>([]);
  const [syncingRate, setSyncingRate] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await configApi.get();
      // Only update fields that exist in the DB response, ensure no nulls
      const incoming = data.config || {};
      const cleaned: any = {};
      Object.keys(incoming).forEach(key => {
        cleaned[key] = incoming[key] === null ? '' : incoming[key].toString();
      });
      setConfig(prev => ({ ...prev, ...cleaned }));
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatchHistory = async () => {
    try {
      const data = await ordersApi.getBatchHistory();
      setBatchHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load batch history:', err);
    }
  };

  useEffect(() => {
    loadConfig();
    loadBatchHistory();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await configApi.update(config);
      alert('System Configuration Updated! These changes will reflect immediately.');
    } catch (err: any) {
      alert(err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const syncRate = async () => {
    setSyncingRate(true);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/JPY');
      const data = await response.json();
      if (data && data.rates && data.rates.PHP) {
        const rate = data.rates.PHP.toFixed(2);
        setConfig(prev => ({ ...prev, jpy_to_php_rate: rate }));
      } else {
        throw new Error('Could not fetch PHP rate from API');
      }
    } catch (err) {
      console.error('Failed to sync rate:', err);
      alert('Failed to sync exchange rate. Please enter it manually.');
    } finally {
      setSyncingRate(false);
    }
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      return isoString.split('T')[0];
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary-500" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in text-gray-800 dark:text-gray-200 pb-10">
      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg text-primary-600">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white">General Configuration</h2>
            <p className="text-sm text-gray-500">Manage the ordering periods, rates, and announcements.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex items-center justify-between bg-gray-50 dark:bg-dark-surfaceAlt p-4 rounded-xl border border-gray-100 dark:border-gray-800">
               <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Ordering Status</label>
                  <p className="text-xs text-gray-500">Enable or disable new incoming orders.</p>
               </div>
               <div className="flex items-center gap-3">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="order_status" value="1" checked={config.is_ordering_open === '1'} onChange={() => setConfig({...config, is_ordering_open: '1'})} className="text-primary-500 focus:ring-primary-500" />
                    <span className="text-sm font-medium">Open</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="order_status" value="0" checked={config.is_ordering_open === '0'} onChange={() => setConfig({...config, is_ordering_open: '0'})} className="text-red-500 focus:ring-red-500" />
                    <span className="text-sm font-medium">Closed</span>
                 </label>
               </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Current Batch Name</label>
              <input 
                type="text" 
                className="input" 
                value={config.batch_name}
                onChange={(e) => setConfig({...config, batch_name: e.target.value})}
                placeholder="e.g. Summer Batch 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Order Cut-off Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="date" 
                  className="input pl-10" 
                  value={formatDateForInput(config.cutoff_date)}
                  onChange={(e) => setConfig({...config, cutoff_date: e.target.value ? e.target.value + 'T23:59:59+08:00' : ''})}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Countdown will target this date.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Exchange Rate (JPY to PHP)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="number" 
                  step="0.01"
                  className="input pl-10" 
                  value={config.jpy_to_php_rate}
                  onChange={(e) => setConfig({...config, jpy_to_php_rate: e.target.value})}
                  placeholder="0.38"
                />
                <button 
                  type="button"
                  onClick={syncRate}
                  disabled={syncingRate}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider border border-transparent hover:border-primary-100 dark:hover:border-primary-800"
                >
                  {syncingRate ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Auto-Sync
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Multiplier used when setting product prices from JPY.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Estimated Time of Arrival (ETA)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="date" 
                  className="input flex-1"
                  value={formatDateForInput(config.eta_start)}
                  onChange={(e) => setConfig({...config, eta_start: e.target.value ? e.target.value + 'T00:00:00+08:00' : ''})}
                />
                <span className="text-gray-400 font-medium">to</span>
                <input 
                  type="date" 
                  className="input flex-1"
                  value={formatDateForInput(config.eta_end)}
                  onChange={(e) => setConfig({...config, eta_end: e.target.value ? e.target.value + 'T23:59:59+08:00' : ''})}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Approximate range when items arrive in PH.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                 <MessageSquare size={16} /> Public Announcement Banner
              </label>
              <textarea 
                className="input min-h-[80px]" 
                value={config.announcement_text || ''}
                onChange={(e) => setConfig({...config, announcement_text: e.target.value})}
                placeholder="Message to display at the top of the customer landing page. Leave empty to hide banner."
              />
            </div>

            <div className="md:col-span-2 space-y-6 pt-4 border-t dark:border-gray-800">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Contact Support Links</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">WhatsApp Link/Number</label>
                   <input 
                     type="text" 
                     className="input" 
                     value={config.whatsapp_link || ''}
                     onChange={(e) => setConfig({...config, whatsapp_link: e.target.value})}
                     placeholder="https://wa.me/message/..."
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Messenger Link</label>
                   <input 
                     type="text" 
                     className="input" 
                     value={config.messenger_link || ''}
                     onChange={(e) => setConfig({...config, messenger_link: e.target.value})}
                     placeholder="https://m.me/username"
                   />
                 </div>
               </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-4 rounded-xl flex gap-3">
            <Info className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Note:</strong> Changing these dates will immediately update the <strong>Countdown Timer</strong> and <strong>ETA Text</strong> on the Customer Landing Page and in the tracking status of all active orders.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t dark:border-gray-800">
            <button type="submit" className="btn-primary flex items-center gap-2 px-8 py-3" disabled={saving}>
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg text-primary-600">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white">Batch History</h2>
            <p className="text-sm text-gray-500">Review past ordering batches and their performance.</p>
          </div>
        </div>

        <div className="space-y-3">
          {batchHistory.length > 0 ? (
            batchHistory.map((batch, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-dark-surfaceAlt border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-bold text-sm dark:text-white">{batch.name}</p>
                  <p className="text-xs text-gray-500">
                    {batch.date} • {batch.total_orders} orders • 
                    <span className="text-primary-600 font-bold ml-1">
                      ₱{(batch.total_revenue || 0).toLocaleString()}
                    </span>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-bold uppercase">
                  {batch.status}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-gray-50 dark:bg-dark-surfaceAlt rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
               <History size={32} className="mx-auto text-gray-300 mb-2" />
               <p className="text-xs text-gray-500 font-medium">No completed batches found yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
