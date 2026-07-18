import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X, Check } from 'lucide-react';

export default function NotificationItem({ notification, onMarkRead, onDismiss, onResolve }) {
  const { id, title, message, severity, status, created_at, read_at, action_url } = notification;
  
  const isUnread = !read_at && status !== 'resolved';

  const getIcon = () => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    if (!isUnread) return 'bg-white';
    switch (severity) {
      case 'critical': return 'bg-red-50';
      case 'warning': return 'bg-amber-50';
      case 'success': return 'bg-green-50';
      default: return 'bg-blue-50';
    }
  };

  const timeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <div className={`p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${getBgColor()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium text-gray-900 ${isUnread ? 'font-bold' : ''}`}>
              {title}
            </h4>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {timeAgo(created_at)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {message}
          </p>
          
          <div className="mt-2 flex items-center gap-3">
            {action_url && (
              <Link 
                to={action_url} 
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View Details
              </Link>
            )}
            
            {status !== 'resolved' && onResolve && (
              <button 
                onClick={() => onResolve(id)}
                className="text-xs font-medium text-green-600 hover:text-green-800"
              >
                Resolve
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-2">
          {isUnread && onMarkRead && (
            <button 
              onClick={() => onMarkRead(id)}
              className="text-gray-400 hover:text-gray-600"
              title="Mark as read"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {onDismiss && (
            <button 
              onClick={() => onDismiss(id)}
              className="text-gray-400 hover:text-red-600"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
