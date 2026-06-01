export default function ReturnsPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#F8F9FB]">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-[family-name:var(--font-playfair)] mb-8 text-[#1A1A1A] text-center">Returns & Exchange</h1>
        <div className="bg-white p-8 rounded-2xl shadow-sm text-[#6B7280] space-y-6 leading-relaxed">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Our Return Policy</h2>
          <p>We want you to be completely satisfied with your purchase. We accept returns and exchanges within 14 days of receiving your order.</p>
          
          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">Conditions for Return</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Items must be unworn, unwashed, and in their original condition.</li>
            <li>All original tags must still be attached.</li>
            <li>Items must be returned in their original packaging.</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">How to Initiate a Return</h2>
          <p>Please contact our support team via WhatsApp or the contact form with your order ID. Our courier will collect the item from your address.</p>
          
          <p className="text-sm mt-8 p-4 bg-[#F8F9FB] rounded-lg">
            Note: Original shipping fees are non-refundable. A return shipping fee may apply depending on your location.
          </p>
        </div>
      </div>
    </div>
  );
}
