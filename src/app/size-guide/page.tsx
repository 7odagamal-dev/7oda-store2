export default function SizeGuidePage() {
  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#F8F9FB]">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-[family-name:var(--font-playfair)] mb-8 text-[#1A1A1A] text-center">Size Guide</h1>
        <div className="bg-white p-8 rounded-2xl shadow-sm overflow-x-auto">
          <p className="text-[#6B7280] mb-6 text-center">All measurements are in centimeters (cm). We recommend comparing these measurements to a similar item you already own.</p>
          
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                <th className="py-4 font-semibold text-[#1A1A1A]">Size</th>
                <th className="py-4 font-semibold text-[#1A1A1A]">Chest</th>
                <th className="py-4 font-semibold text-[#1A1A1A]">Length</th>
                <th className="py-4 font-semibold text-[#1A1A1A]">Shoulder</th>
              </tr>
            </thead>
            <tbody className="text-[#6B7280]">
              <tr className="border-b border-[#F0F0F0]">
                <td className="py-4 font-medium text-[#1A1A1A]">S</td>
                <td className="py-4">50</td>
                <td className="py-4">70</td>
                <td className="py-4">44</td>
              </tr>
              <tr className="border-b border-[#F0F0F0]">
                <td className="py-4 font-medium text-[#1A1A1A]">M</td>
                <td className="py-4">53</td>
                <td className="py-4">72</td>
                <td className="py-4">46</td>
              </tr>
              <tr className="border-b border-[#F0F0F0]">
                <td className="py-4 font-medium text-[#1A1A1A]">L</td>
                <td className="py-4">56</td>
                <td className="py-4">74</td>
                <td className="py-4">48</td>
              </tr>
              <tr>
                <td className="py-4 font-medium text-[#1A1A1A]">XL</td>
                <td className="py-4">59</td>
                <td className="py-4">76</td>
                <td className="py-4">50</td>
              </tr>
            </tbody>
          </table>
          
          <div className="mt-8 p-6 bg-[#F8F9FB] rounded-xl">
            <h3 className="font-medium text-[#1A1A1A] mb-2">How to Measure</h3>
            <ul className="list-disc pl-5 text-[#6B7280] space-y-2 text-sm">
              <li><strong>Chest:</strong> Measure across the garment, 1cm below the armhole.</li>
              <li><strong>Length:</strong> Measure from the highest point of the shoulder down to the bottom hem.</li>
              <li><strong>Shoulder:</strong> Measure straight across the shoulders from seam to seam.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
