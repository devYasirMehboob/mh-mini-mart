import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import useNotificationPreferences from '../hooks/useNotificationPreferences';

export default function NotificationPreferencesDialog({ isOpen, onClose }) {
  const { preferences, isLoading, fetchPreferences, updatePreferences } = useNotificationPreferences();
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen, fetchPreferences]);

  useEffect(() => {
    if (preferences && Object.keys(preferences).length > 0) {
      const initialForm = {};
      Object.keys(preferences).forEach(key => {
        initialForm[key] = preferences[key]?.in_app_enabled ?? true;
      });
      setFormData(initialForm);
    }
  }, [preferences]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });
    
    const payload = {};
    notificationTypes.forEach(type => {
      payload[type.key] = {
        in_app_enabled: formData[type.key] !== false,
        sound_enabled: formData[type.key] !== false
      };
    });

    const result = await updatePreferences(payload);
    setIsSaving(false);
    if (result.success) {
      onClose();
    } else {
      setSaveMessage({ type: 'error', text: result.message });
    }
  };

  const notificationTypes = [
    { key: 'inventory_alerts', label: 'Inventory Alerts', desc: 'Low stock and out of stock warnings.' },
    { key: 'supplier_alerts', label: 'Supplier Alerts', desc: 'High balance warnings.' },
    { key: 'system_alerts', label: 'System Alerts', desc: 'Missing backups and system issues.' },
    { key: 'daily_summary', label: 'Daily Summary', desc: 'End of day sales and activity summary.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Notification Preferences</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading preferences...</div>
          ) : (
            <form id="preferences-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">App Notifications</h3>
                
                {notificationTypes.map(type => (
                  <div key={type.key} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{type.label}</label>
                      <p className="text-xs text-gray-500">{type.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={formData[type.key] !== false} // Default true
                        onChange={(e) => handleChange(type.key, e.target.checked)}
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                    </label>
                  </div>
                ))}
              </div>
              
              {saveMessage.text && (
                <div className={`p-3 text-sm rounded-lg ${saveMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {saveMessage.text}
                </div>
              )}
            </form>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="preferences-form"
            disabled={isLoading || isSaving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
