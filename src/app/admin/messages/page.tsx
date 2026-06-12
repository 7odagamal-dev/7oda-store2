'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback } from 'react';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminPagination } from '../components/AdminPagination';

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMessages = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/messages?page=' + page + '&limit=20');
      if (!res.ok) { setMessages([]); return; }
      const data = await res.json();
      setMessages(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const updateMessageStatus = async (messageId: string, newStatus: string) => {
    try {
      const res = await adminFetch('/api/admin/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: messageId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, status: newStatus } : msg));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('⚠️ Permanently delete this message?')) return;
    try {
      const res = await adminFetch(`/api/admin/messages?id=${messageId}`, { method: 'DELETE' });
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.indexOf("application/json") !== -1) data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete');
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      alert('Message deleted');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      alert('Delete failed: ' + errMsg);
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch =
      msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-amber-100 text-amber-700';
      case 'read': return 'bg-emerald-100 text-emerald-700';
      case 'replied': return 'bg-sky-100 text-sky-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unread': return 'New';
      case 'read': return 'Read';
      case 'replied': return 'Replied';
      default: return status;
    }
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-2">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Messages</h1>
        {unreadCount > 0 && (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            {unreadCount} NEW
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <input type="text" placeholder="Search messages..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all">
          <option value="all">All</option>
          <option value="unread">New</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (<div key={i} className="h-24 bg-[#F3F5F8] rounded-xl" />))}
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]"><p className="font-[family-name:var(--font-playfair)]">No messages found</p></div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredMessages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className={`bg-white rounded-xl border p-6 relative group shadow-sm hover:shadow-md transition-all ${message.status === 'unread' ? 'border-amber-300' : 'border-[#E5E7EB]'}`}>
                <button onClick={() => deleteMessage(message.id)}
                  className="absolute top-4 right-4 p-2 bg-rose-50 text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-500 hover:text-white transition-all z-10"
                  title="Delete permanently">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-[#1A1A1A]">{message.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${getStatusStyle(message.status)}`}>
                      {getStatusLabel(message.status)}
                    </span>
                  </div>
                  <p className="text-[#9CA3AF] text-xs">{new Date(message.created_at).toLocaleDateString('en-US')}</p>
                </div>
                <div className="mb-4">
                  <p className="text-[#8BA4B8] text-sm font-medium">{message.email}</p>
                </div>
                <p className="text-[#6B7280] mb-6 text-sm leading-relaxed border-l-2 border-[#E5E7EB] pl-4">{message.message}</p>
                <div className="flex flex-wrap gap-2 pt-4 border-t border-[#F0F0F0]">
                  <button onClick={() => updateMessageStatus(message.id, 'unread')}
                    className={`px-3 py-1 text-xs font-semibold uppercase rounded-full transition-all ${
                      message.status === 'unread' ? 'bg-amber-100 text-amber-700' : 'bg-[#F3F5F8] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}>New</button>
                  <button onClick={() => updateMessageStatus(message.id, 'read')}
                    className={`px-3 py-1 text-xs font-semibold uppercase rounded-full transition-all ${
                      message.status === 'read' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F3F5F8] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}>Read</button>
                  <button onClick={() => updateMessageStatus(message.id, 'replied')}
                    className={`px-3 py-1 text-xs font-semibold uppercase rounded-full transition-all ${
                      message.status === 'replied' ? 'bg-sky-100 text-sky-700' : 'bg-[#F3F5F8] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}>Replied</button>
                  <button onClick={() => { window.location.href = `mailto:${message.email}?subject=Reply - 7H Store`; }}
                    className="px-3 py-1 text-xs font-semibold uppercase rounded-full bg-[#8BA4B8] text-white hover:bg-[#6B8BA0] transition-all ml-auto">
                    Reply via Email
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </motion.div>
  );
}