import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Save, Store, Bell, Wallet } from 'lucide-react';

export default function Settings() {
  const { gymKey } = useAuth();
  const [profile, setProfile] = useState({
    name: '', address: '', contact: '', email: '', taxReg: '', footerMessage: '',
    autoMessagingEnabled: false, reminderIntervals: [1, 3, 7], template: '',
    paymentSettings: {
      methods: ['easypaisa'],
      easypaisaNumber: '',
      jazzcashNumber: '',
      bankTitle: '',
      bankIban: ''
    },
    package: 'starter'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/profile?gymKey=${gymKey}`);
        if (res.data.profile) {
          setProfile(p => ({ ...p, ...res.data.profile }));
        }
      } catch {
         // Ignore if 404 on first load, will just use default state
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [gymKey]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleIntervalChange = (e) => {
    const val = e.target.value;
    const intervals = val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    setProfile(p => ({ ...p, reminderIntervals: intervals }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/profile', { gymKey, profile });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = (method) => {
    setProfile(prev => {
      const current = prev.paymentSettings?.methods || [];
      const methods = current.includes(method)
        ? current.filter(m => m !== method)
        : [...current, method];
      return {
        ...prev,
        paymentSettings: {
          ...prev.paymentSettings,
          methods: methods.length ? methods : [method]
        }
      };
    });
  };

  const handlePaymentField = (name, value) => {
    setProfile(prev => ({
      ...prev,
      paymentSettings: {
        ...prev.paymentSettings,
        [name]: value
      }
    }));
  };

  if (loading) return <div>Loading settings...</div>;

  const gymPackage = profile.package || 'starter';
  const canUsePaymentCollection = gymPackage === 'growth' || gymPackage === 'pro';
  const canUseTemplateEditing = gymPackage === 'pro';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gym Settings</h1>
          <p className="text-slate-500 mt-2">Manage your gym profile, automated sending, and message templates.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8 shadow-md">
          <Save size={18} /> {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gym Profile Section */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
               <Store size={20} />
             </div>
             <h2 className="text-lg font-bold text-slate-800">Gym Profile</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gym Name <span className="text-red-500">*</span></label>
            <input type="text" name="name" value={profile.name || ''} onChange={handleChange} className="input-field" placeholder="E.g. Titan Fitness" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea name="address" value={profile.address || ''} onChange={handleChange} className="input-field h-20" placeholder="Full gym address..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Contact No.</label>
               <input type="text" name="contact" value={profile.contact || ''} onChange={handleChange} className="input-field" placeholder="Phone number" />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
               <input type="email" name="email" value={profile.email || ''} onChange={handleChange} className="input-field" placeholder="Email address" />
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Tax Reg. No.</label>
               <input type="text" name="taxReg" value={profile.taxReg || ''} onChange={handleChange} className="input-field" placeholder="Optional" />
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Footer Message</label>
             <input type="text" name="footerMessage" value={profile.footerMessage || ''} onChange={handleChange} className="input-field" placeholder="e.g. Thanks for choosing us!" />
          </div>
        </div>

        {/* Messaging Settings */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
               <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                 <Bell size={20} />
               </div>
               <h2 className="text-lg font-bold text-slate-800">Automated Reminders</h2>
            </div>

            <div className="flex items-center justify-between mb-4">
               <div>
                  <h4 className="font-semibold text-slate-800">Enable Auto-Messaging</h4>
                  <p className="text-xs text-slate-500">Automatically send reminders via WhatsApp daily for overdue members.</p>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="autoMessagingEnabled" checked={profile.autoMessagingEnabled || false} onChange={handleChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
               </label>
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Reminder Intervals (Days After Due)</label>
               <input type="text" value={profile.reminderIntervals?.join(', ') || ''} onChange={handleIntervalChange} className="input-field" placeholder="e.g. 1, 3, 7" />
               <p className="text-xs text-slate-500 mt-1">Comma-separated days to send reminders after the due date.</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
               <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                 <SettingsIcon size={20} />
               </div>
               <h2 className="text-lg font-bold text-slate-800">Message Template</h2>
            </div>
            
            <div className="flex flex-wrap gap-2 text-xs mb-3">
               <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">{'{name}'}</span>
               <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">{'{amount}'}</span>
               <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">{'{date}'}</span>
            </div>

            <textarea 
               name="template"
               value={profile.template || ''} 
               onChange={handleChange} 
               className="input-field h-32 resize-y mb-4" 
               placeholder="Hi {name}, your gym fee is due..."
              disabled={!canUseTemplateEditing}
            />
            {!canUseTemplateEditing && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                Upgrade to <b>Pro</b> to edit your WhatsApp message template.
              </p>
            )}
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Live Preview</h4>
               <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {(profile.template || '').replace('{name}', 'Ali').replace('{amount}', '5000').replace('{date}', 'Oct 15')}
               </p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <div className="bg-violet-100 p-2 rounded-lg text-violet-600">
                <Wallet size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Payment Collection Settings</h2>
            </div>

            {canUsePaymentCollection ? (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  Choose payment methods and update receiving details for your members.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {['easypaisa', 'jazzcash', 'bank'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => toggleMethod(method)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        profile.paymentSettings?.methods?.includes(method)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>

                {profile.paymentSettings?.methods?.includes('easypaisa') && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">EasyPaisa Receiving Number</label>
                    <input
                      type="text"
                      className="input-field"
                      value={profile.paymentSettings?.easypaisaNumber || ''}
                      onChange={(e) => handlePaymentField('easypaisaNumber', e.target.value)}
                      placeholder="03XXXXXXXXX"
                    />
                  </div>
                )}

                {profile.paymentSettings?.methods?.includes('jazzcash') && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">JazzCash Receiving Number</label>
                    <input
                      type="text"
                      className="input-field"
                      value={profile.paymentSettings?.jazzcashNumber || ''}
                      onChange={(e) => handlePaymentField('jazzcashNumber', e.target.value)}
                      placeholder="03XXXXXXXXX"
                    />
                  </div>
                )}

                {profile.paymentSettings?.methods?.includes('bank') && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account Title</label>
                      <input
                        type="text"
                        className="input-field"
                        value={profile.paymentSettings?.bankTitle || ''}
                        onChange={(e) => handlePaymentField('bankTitle', e.target.value)}
                        placeholder="Account title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bank IBAN</label>
                      <input
                        type="text"
                        className="input-field"
                        value={profile.paymentSettings?.bankIban || ''}
                        onChange={(e) => handlePaymentField('bankIban', e.target.value)}
                        placeholder="PKXX...."
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
                <div className="font-bold mb-1">Upgrade required</div>
                Payment collection settings are available in <b>Growth</b> and <b>Pro</b> packages.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
