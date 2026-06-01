'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

const demoStats: Stats = {
  totalProducts: 0,
  totalOrders: 0,
  pendingOrders: 0,
  totalRevenue: 0,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(demoStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalProducts: data.totalProducts || 0,
            totalOrders: data.totalOrders || 0,
            pendingOrders: data.pendingOrders || 0,
            totalRevenue: data.totalRevenue || 0,
          });
        }
      } catch (error) {
        console.log('Error fetching stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Products', value: stats.totalProducts, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'bg-sky-100 text-sky-600' },
    { label: 'Total Orders', value: stats.totalOrders, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-amber-100 text-amber-600' },
    { label: 'Total Revenue', value: `EGP ${stats.totalRevenue.toLocaleString()}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-[#8BA4B8]/20 text-[#8BA4B8]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-[#1A1A1A] font-[family-name:var(--font-playfair)]">
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${stat.color} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link href="/admin/products">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-white rounded-2xl p-6 border border-[#E5E7EB] cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <h2 className="text-xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Manage Products</h2>
            <p className="text-[#6B7280] text-sm">Add, edit, or remove products from your store.</p>
          </motion.div>
        </Link>

        <Link href="/admin/orders">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-white rounded-2xl p-6 border border-[#E5E7EB] cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <h2 className="text-xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Manage Orders</h2>
            <p className="text-[#6B7280] text-sm">View and process customer orders.</p>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}