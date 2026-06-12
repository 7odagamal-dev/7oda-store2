'use client';

import { ReactNode } from 'react';

interface BundleDisplayProps {
  bundle: {
    id: string;
    name?: string;
    description?: string | null;
    image?: string | null;
    image_source?: string;
    image_layout?: string;
    image_data?: Record<string, unknown>;
    product_images?: (string | null)[];
    discount_type?: string;
    discount_value?: number;
  };
  className?: string;
}

export function BundleImageDisplay({ bundle, className }: BundleDisplayProps) {
  const imgData = (bundle.image_data || {}) as { images?: string[]; adjustments?: Array<{ scale: number; rotate: number; panX?: number; panY?: number }> };
  const adjustments: Array<{ scale: number; rotate: number; panX?: number; panY?: number }> = imgData.adjustments || [];
  const images: string[] = [];

  if (bundle.image_source === 'custom') {
    if (bundle.image) images.push(bundle.image);
    if (imgData.images) images.push(...imgData.images);
  } else if (bundle.product_images && bundle.product_images.length >= 2) {
    images.push(...bundle.product_images.filter(Boolean) as string[]);
  }

  if (images.length >= 2) {
    const layout = bundle.image_layout || 'side-by-side';
    const max = LAYOUT_CONFIGS.find(l => l.id === layout)?.max || 2;
    return (
      <div className={`w-full aspect-[4/3] rounded-[var(--radius-xl)] overflow-hidden bg-card-hover mb-[var(--space-md)] ${className || ''}`}>
        <PublicLayoutRender images={images.slice(0, max)} layout={layout} adjustments={adjustments} />
      </div>
    );
  }

  return (
    <div className={`w-full aspect-[4/3] rounded-[var(--radius-xl)] bg-card-hover flex items-center justify-center mb-[var(--space-md)] ${className || ''}`}>
      <span className="text-[var(--text-3xl)] font-bold text-border font-[family-name:var(--font-playfair)]">7H</span>
    </div>
  );
}

export function BundleCard({ bundle, children }: { bundle: BundleDisplayProps['bundle']; children?: ReactNode }) {
  return (
    <div className="bg-card rounded-[var(--radius-xl)] border border-border p-[var(--space-lg)] text-center hover:shadow-md transition-all">
      <BundleImageDisplay bundle={bundle} />
      {bundle.name && <h3 className="font-bold text-[var(--text-sm)] mb-[var(--space-xs)] mt-[var(--space-md)]">{bundle.name}</h3>}
      {bundle.description && <p className="text-[var(--text-xs)] text-secondary mb-[var(--space-sm)]">{bundle.description}</p>}
      {bundle.discount_value && (
        <p className="text-[var(--text-sm)] font-bold text-rose-500">
          {bundle.discount_type === 'percentage' ? `${bundle.discount_value}% OFF` : `EGP ${bundle.discount_value} OFF`}
        </p>
      )}
      {children}
    </div>
  );
}

function PublicLayoutRender({ images, layout, adjustments }: { images: string[]; layout: string; adjustments: Array<{ scale: number; rotate: number; panX?: number; panY?: number }> }) {
  const img = (i: number) => {
    const adj = adjustments[i] || { scale: 1, rotate: 0, panX: 0, panY: 0 };
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={images[i]} alt=""
        className="w-full h-full object-cover"
        style={{ transform: `translate(${adj.panX || 0}px, ${adj.panY || 0}px) scale(${adj.scale}) rotate(${adj.rotate}deg)`, transition: 'transform 0.3s' }}
      />
    );
  };

  const count = images.length;

  if (layout === 'side-by-side') {
    return <div className="flex w-full h-full">{count >= 1 && <div className="w-1/2 h-full overflow-hidden">{img(0)}</div>}{count >= 2 && <><div className="w-[2px] bg-border shrink-0" /><div className="w-1/2 h-full overflow-hidden">{img(1)}</div></>}</div>;
  }
  if (layout === 'stacked') {
    return <div className="flex flex-col w-full h-full">{count >= 1 && <div className="w-full h-1/2 overflow-hidden">{img(0)}</div>}{count >= 2 && <><div className="h-[2px] bg-border shrink-0" /><div className="w-full h-1/2 overflow-hidden">{img(1)}</div></>}</div>;
  }
  if (layout === 'diagonal') {
    return <div className="w-full h-full relative"><div className="absolute inset-0 overflow-hidden">{img(0)}</div>{count >= 2 && <div className="absolute bottom-[6%] right-[6%] w-[42%] h-[42%] rounded-xl overflow-hidden border-2 border-white shadow-lg">{img(1)}</div>}</div>;
  }
  if (layout === 'split-diagonal') {
    return <div className="w-full h-full relative">{count >= 1 && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>{img(0)}</div>}{count >= 2 && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>{img(1)}</div>}</div>;
  }
  if (layout === 'overlap') {
    return <div className="w-full h-full relative"><div className="absolute inset-0 w-3/4 h-full overflow-hidden rounded-xl">{img(0)}</div>{count >= 2 && <div className="absolute bottom-[5%] right-0 w-[55%] h-[60%] rounded-xl overflow-hidden border-2 border-white shadow-lg">{img(1)}</div>}</div>;
  }
  if (layout === 'border') {
    return <div className="flex w-full h-full"><div className="w-[calc(50%-3px)] h-full overflow-hidden">{img(0)}</div>{count >= 2 && <><div className="w-[6px] bg-border shrink-0" /><div className="w-[calc(50%-3px)] h-full overflow-hidden">{img(1)}</div></>}</div>;
  }
  if (layout === 'row-3') {
    return <div className="flex w-full h-full">{[0, 1, 2].slice(0, count).map(i => <div key={i} className="flex-1 h-full overflow-hidden border-r last:border-r-0 border-border">{img(i)}</div>)}</div>;
  }
  if (layout === 'grid-top-2') {
    return <div className="flex flex-col w-full h-full"><div className="flex w-full h-1/2">{count >= 1 && <div className="flex-1 h-full overflow-hidden border-b border-r border-border">{img(0)}</div>}{count >= 2 && <div className="flex-1 h-full overflow-hidden border-b border-border">{img(1)}</div>}</div>{count >= 3 && <div className="w-1/2 h-1/2 mx-auto overflow-hidden">{img(2)}</div>}</div>;
  }
  if (layout === 'grid-bottom-2') {
    return <div className="flex flex-col w-full h-full">{count >= 1 && <div className="w-1/2 h-1/2 mx-auto overflow-hidden">{img(0)}</div>}<div className="flex w-full h-1/2">{count >= 2 && <div className="flex-1 h-full overflow-hidden border-t border-r border-border">{img(1)}</div>}{count >= 3 && <div className="flex-1 h-full overflow-hidden border-t border-border">{img(2)}</div>}</div></div>;
  }
  if (layout === 'grid-2x2') {
    return <div className="grid grid-cols-2 w-full h-full">{[0, 1, 2, 3].slice(0, count).map(i => <div key={i} className={`overflow-hidden ${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'border-r' : ''} border-border`}>{img(i)}</div>)}</div>;
  }
  if (layout === 'row-4') {
    return <div className="flex w-full h-full">{[0, 1, 2, 3].slice(0, count).map(i => <div key={i} className="flex-1 h-full overflow-hidden border-r last:border-r-0 border-border">{img(i)}</div>)}</div>;
  }
  if (layout === 'grid-3-1') {
    return <div className="flex w-full h-full"><div className="flex-1 h-full grid grid-cols-2">{count >= 1 && <div className="overflow-hidden border-b border-r border-border">{img(0)}</div>}{count >= 2 && <div className="overflow-hidden border-b border-border">{img(1)}</div>}{count >= 3 && <div className="overflow-hidden border-r border-border col-span-2">{img(2)}</div>}</div>{count >= 4 && <div className="w-1/3 h-full overflow-hidden border-l border-border">{img(3)}</div>}</div>;
  }

  return <div className="w-full h-full flex items-center justify-center bg-card-hover"><span className="text-3xl font-bold text-border font-[family-name:var(--font-playfair)]">7H</span></div>;
}

const LAYOUT_CONFIGS = [
  { id: 'side-by-side', max: 2 }, { id: 'stacked', max: 2 }, { id: 'diagonal', max: 2 },
  { id: 'split-diagonal', max: 2 }, { id: 'overlap', max: 2 }, { id: 'border', max: 2 },
  { id: 'row-3', max: 3 }, { id: 'grid-top-2', max: 3 }, { id: 'grid-bottom-2', max: 3 },
  { id: 'grid-2x2', max: 4 }, { id: 'row-4', max: 4 }, { id: 'grid-3-1', max: 4 },
];
