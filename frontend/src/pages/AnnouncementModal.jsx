import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

export default function AnnouncementModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [actionUrl, setActionUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMsg('Title and Message are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const payload = {
      title: title.trim(),
      message: message.trim(),
      severity,
      action_url: actionUrl.trim() || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString().slice(0, 19).replace('T', ' ') : null,
    };

    const res = await onSubmit(payload);
    setIsSubmitting(false);

    if (res?.success) {
      setTitle('');
      setMessage('');
      setSeverity('info');
      setActionUrl('');
      setExpiresAt('');
      onClose();
    } else {
      setErrorMsg(res?.message || 'Failed to post announcement.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">New System Announcement</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Announcement Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Scheduled Maintenance / Bakery Notice"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'info', label: 'Info', color: 'border-blue-500 text-blue-700 bg-blue-50' },
                { key: 'warning', label: 'Warning', color: 'border-amber-500 text-amber-700 bg-amber-50' },
                { key: 'critical', label: 'Critical', color: 'border-red-500 text-red-700 bg-red-50' },
                { key: 'success', label: 'Success', color: 'border-green-500 text-green-700 bg-green-50' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSeverity(item.key)}
                  className={`rounded-lg border py-2 text-center text-xs font-semibold transition-all ${
                    severity === item.key
                      ? item.color + ' ring-2 ring-gray-900'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Content <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter announcement details for staff..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action URL (Optional)
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="e.g., /inventory/products or /expenses"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">Optional internal path to redirect staff when clicked.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-resolves the announcement after this timestamp.</p>
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Posting...' : 'Broadcast Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
