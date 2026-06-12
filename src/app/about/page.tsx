import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#F8F9FB]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h1 className="text-4xl font-[family-name:var(--font-playfair)] mb-8 text-[#1A1A1A]">Our Story</h1>
        <div className="text-[#6B7280] space-y-6 leading-relaxed">
          <p>
            7H  was born out of a desire to redefine luxury streetwear in Egypt. We believe that true luxury lies in the details—the perfect cut, the finest fabrics, and the timeless designs that transcend seasonal trends.
          </p>
          <p>
            Every piece in our collection is meticulously crafted for the modern minimalist. We source premium materials to ensure that our clothing not only looks exceptional but feels extraordinary.
          </p>
          <p>
            Our mission is simple: to provide high-end, elegant fashion that empowers individuals to express their unique style with confidence and sophistication.
          </p>
        </div>
        <div className="mt-12">
          <Link href="/shop" className="inline-block px-8 py-3 bg-[#8BA4B8] text-white text-sm tracking-wider uppercase rounded-full hover:bg-[#6B8BA0] transition-colors">
            Explore The Collection
          </Link>
        </div>
      </div>
    </div>
  );
}
