import { X, User, Mail, Phone, ShieldCheck, Calendar, CheckCircle2, LogOut, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function ProfileModal({ isOpen, onClose, user, onLogout }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const displayName = user?.full_name || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const role = user?.role || 'user';
  const email = user?.email || 'Not available';
  const phone = user?.phone || 'Not available';
  const isVerified = user?.is_verified !== false;
  
  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Recent Member';

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div 
        className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0f172a]/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User size={18} className="text-blue-500" />
              Account Profile
            </h2>
            <p className="text-xs text-gray-400">View personal details and account status</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Profile Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-950/30 to-purple-950/20 border border-blue-900/30">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xl font-bold text-white shadow-lg border-2 border-blue-400/30">
                {initials}
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-[#0b0f19] rounded-full"></div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate">{displayName}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {role}
                </span>
                {isVerified && (
                  <span className="text-[10px] flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>
              
              {user?.id && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
                  <span>User ID: <code className="text-gray-300 font-mono">#{user.id}</code></span>
                  <button 
                    onClick={handleCopyId}
                    className="text-gray-500 hover:text-white transition-colors"
                    title="Copy User ID"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Contact & Identity
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Email */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">Email Address</div>
                    <div className="text-sm font-medium text-white truncate">{email}</div>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                  Primary
                </span>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">Phone Number</div>
                    <div className="text-sm font-medium text-white font-mono">{phone}</div>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 size={11} /> OTP Verified
                </span>
              </div>

              {/* Joined Date */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Member Since</div>
                    <div className="text-sm font-medium text-white">{formattedDate}</div>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Security Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Security & Protection
            </h4>

            <div className="p-3.5 rounded-lg bg-[#0f172a] border border-[#1e293b] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">Two-Factor Authentication</div>
                  <div className="text-[11px] text-gray-400">SMS OTP security active on phone recovery</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Enabled
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1e293b] bg-[#0f172a]/80">
          <button
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            Logout of Account
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
