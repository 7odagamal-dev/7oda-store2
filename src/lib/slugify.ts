const arabicToLatin: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'g', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': '', 'ئ': 'e', 'ؤ': 'w',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function transliterate(text: string): string {
  return [...text].map(c => arabicToLatin[c] || c).join('');
}

export function slugify(text: string, maxLength = 80): string {
  if (!text || !text.trim()) return `item-${Date.now().toString(36)}`;

  let slug = text.trim().toLowerCase();

  // Transliterate Arabic to Latin
  slug = transliterate(slug);

  // Replace underscores, spaces, and special chars with hyphens
  slug = slug
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  // If slug is empty after cleaning, fall back to timestamp
  if (!slug || slug === '-') {
    slug = `item-${Date.now().toString(36)}`;
  }

  return slug;
}
