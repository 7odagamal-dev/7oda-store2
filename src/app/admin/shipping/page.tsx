'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

interface ShippingRate {
  id: string;
  governorate: string;
  cost: number;
  estimated_days: string;
}

export default function AdminShipping() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState(0);
  const [editDays, setEditDays] = useState('');

  const fetchRates = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/shipping');
      if (res.ok) setRates(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const startEdit = (rate: ShippingRate) => {
    setEditingId(rate.id);
    setEditCost(rate.cost);
    setEditDays(rate.estimated_days);
  };

  const saveEdit = async (id: string) => {
    const res = await adminFetch('/api/admin/shipping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, cost: editCost, estimated_days: editDays }),
    });
    if (res.ok) {
      setRates(prev => prev.map(r => r.id === id ? { ...r, cost: editCost, estimated_days: editDays } : r));
      setEditingId(null);
    } else {
      alert('Failed to update');
    }
  };

  const totalGovernorates = rates.length;
  const averageCost = rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r.cost, 0) / rates.length) : 0;
  const minCost = rates.length > 0 ? Math.min(...rates.map(r => r.cost)) : 0;
  const maxCost = rates.length > 0 ? Math.max(...rates.map(r => r.cost)) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-8">Shipping Rates</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
          <p className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Governorates</p>
          <p className="text-2xl font-bold text-[#1A1A1A] font-[family-name:var(--font-playfair)]">{totalGovernorates}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
          <p className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Average Cost</p>
          <p className="text-2xl font-bold text-[#1A1A1A] font-[family-name:var(--font-playfair)]">EGP {averageCost}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
          <p className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Min Cost</p>
          <p className="text-2xl font-bold text-emerald-600 font-[family-name:var(--font-playfair)]">EGP {minCost}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
          <p className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Max Cost</p>
          <p className="text-2xl font-bold text-amber-600 font-[family-name:var(--font-playfair)]">EGP {maxCost}</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[...Array(10)].map((_, i) => (<div key={i} className="h-12 bg-[#F3F5F8] rounded-lg" />))}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Governorate</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Cost (EGP)</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Est. Delivery</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {rates.map(rate => (
                  <tr key={rate.id} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-[#1A1A1A]">{rate.governorate}</td>
                    <td className="px-5 py-3">
                      {editingId === rate.id ? (
                        <input type="number" value={editCost} onChange={e => setEditCost(Number(e.target.value))}
                          className="w-24 px-3 py-1.5 bg-white border border-[#8BA4B8] rounded-lg text-sm text-[#1A1A1A] focus:outline-none" min={0} />
                      ) : (
                        <span className="text-sm font-semibold text-[#8BA4B8]">EGP {rate.cost}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === rate.id ? (
                        <input type="text" value={editDays} onChange={e => setEditDays(e.target.value)}
                          className="w-28 px-3 py-1.5 bg-white border border-[#8BA4B8] rounded-lg text-sm text-[#1A1A1A] focus:outline-none" />
                      ) : (
                        <span className="text-sm text-[#6B7280]">{rate.estimated_days}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingId === rate.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveEdit(rate.id)}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-all">Save</button>
                          <button onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-[#F3F5F8] text-[#6B7280] rounded-lg text-xs font-semibold hover:bg-[#E5E7EB] transition-all">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(rate)}
                          className="px-3 py-1.5 border border-[#E5E7EB] text-[#6B7280] rounded-lg text-xs font-semibold hover:border-[#8BA4B8] hover:text-[#8BA4B8] transition-all">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
