export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#F8F9FB]">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-[family-name:var(--font-playfair)] mb-8 text-[#1A1A1A] text-center">Privacy Policy</h1>
        <div className="bg-white p-8 rounded-2xl shadow-sm text-[#6B7280] space-y-6 leading-relaxed">
          <p>At 7H , we respect your privacy and are committed to protecting your personal data. This privacy policy informs you about how we look after your personal data when you visit our website.</p>
          
          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">Data Collection</h2>
          <p>We collect personal information that you provide to us when you make a purchase, create an account, or contact us. This includes your name, email address, shipping address, and phone number.</p>

          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">How We Use Your Data</h2>
          <p>We use your data strictly to process your orders, provide customer support, and improve our services. We do not sell your personal information to third parties.</p>

          <h2 className="text-xl font-semibold text-[#1A1A1A] mt-8">Data Security</h2>
          <p>We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way.</p>
        </div>
      </div>
    </div>
  );
}
