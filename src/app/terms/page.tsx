export default function TermsPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#F8F9FB]">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-[family-name:var(--font-playfair)] mb-8 text-[#1A1A1A] text-center">Terms & Conditions</h1>
        <div className="bg-white p-8 rounded-2xl shadow-sm text-[#6B7280] space-y-6 leading-relaxed">
          <p>Welcome to OG Old Gold. By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">1. Products & Pricing</h2>
          <p>All products are subject to availability. We reserve the right to limit the quantity of any products we offer. Prices for our products are subject to change without notice.</p>

          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">2. Accuracy of Information</h2>
          <p>We attempt to be as accurate as possible. However, we do not warrant that product descriptions or other content is completely accurate, complete, reliable, current, or error-free.</p>

          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">3. Intellectual Property</h2>
          <p>All content included on this site, such as text, graphics, logos, images, and software, is the property of OG Old Gold and protected by international copyright laws.</p>
        </div>
      </div>
    </div>
  );
}
