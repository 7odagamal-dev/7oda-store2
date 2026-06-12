'use client';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function pageBtnClass(pn: number, cur: number): string {
  return pn === cur
    ? 'bg-[#1A1A1A] text-white w-8 h-8 text-xs font-medium rounded-lg transition-all'
    : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F5F8] w-8 h-8 text-xs font-medium rounded-lg transition-all';
}

export function AdminPagination({ page, totalPages, total, onPageChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-[#E5E7EB]">
      <p className="text-sm text-[#6B7280]">
        Page {page} of {totalPages}
        <span className="ml-2 text-[#9CA3AF]">({total} total)</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F5F8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (page <= 4) {
            pageNum = i + 1;
          } else if (page >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = page - 3 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={pageBtnClass(pageNum, page)}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F5F8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}