'use client';

import { motion } from 'framer-motion';

const shippingData = [
  { range: 'Alexandria', cost: 40, days: '1-2 business days' },
  { range: 'Cairo & Giza', cost: 50, days: '1-2 business days' },
  { range: 'Qalyubia, Beheira', cost: 55, days: '1-3 business days' },
  { range: 'Delta (Dakahlia, Gharbia, Monufia, Kafr El Sheikh, Sharqia, Damietta)', cost: 60, days: '1-3 business days' },
  { range: 'Canal Cities (Port Said, Ismailia, Suez)', cost: 65, days: '2-4 business days' },
  { range: 'Upper Egypt (Minya, Assiut, Sohag, Qena, Luxor, Aswan)', cost: 70, days: '3-5 business days' },
  { range: 'Red Sea, Sinai (North Sinai, South Sinai)', cost: 90, days: '3-5 business days' },
  { range: 'Matrouh, New Valley', cost: 90, days: '4-7 business days' },
];

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-6 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-8">Shipping Policy</h1>

          <div className="space-y-8">
            <section className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
              <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-3">Shipping Coverage</h2>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                We deliver to all 27 Egyptian governorates. Orders are processed within 24 hours of confirmation and shipped via our trusted courier partners.
              </p>
            </section>

            <section className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
              <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Shipping Costs & Delivery Times</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-3 pr-4 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Region</th>
                      <th className="text-left py-3 pr-4 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Cost</th>
                      <th className="text-left py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Est. Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {shippingData.map(row => (
                      <tr key={row.range}>
                        <td className="py-3 pr-4 text-[#1A1A1A]">{row.range}</td>
                        <td className="py-3 pr-4 font-semibold text-[#8BA4B8]">EGP {row.cost}</td>
                        <td className="py-3 text-[#6B7280]">{row.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
              <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-3">Order Processing</h2>
              <ul className="space-y-2 text-sm text-[#6B7280]">
                <li className="flex gap-2">• Orders placed before 2 PM are processed the same day.</li>
                <li className="flex gap-2">• Orders placed after 2 PM are processed the next business day.</li>
                <li className="flex gap-2">• You will receive a confirmation message once your order is shipped.</li>
                <li className="flex gap-2">• Delivery times are estimates and may vary during peak seasons or holidays.</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
              <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-3">Shipping Notes</h2>
              <ul className="space-y-2 text-sm text-[#6B7280]">
                <li className="flex gap-2">• Free shipping is not currently available — shipping costs are calculated at checkout based on your governorate.</li>
                <li className="flex gap-2">• We are not responsible for delays caused by the courier company after the package has been handed over.</li>
                <li className="flex gap-2">• For any shipping inquiries, please contact us via Instagram or our Contact page.</li>
              </ul>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
