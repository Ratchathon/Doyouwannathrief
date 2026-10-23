export const CATEGORIES = {
  tops: "เสื้อ",
  outerwear: "เสื้อคลุม/แจ็กเก็ต",
  bottoms: "กางเกง/กระโปรง",
  dresses: "เดรส",
  shoes: "รองเท้า",
  bags: "กระเป๋า",
  accessories: "เครื่องประดับ",
  headwear: "หมวก",
} as const;

export const CONDITIONS = {
  like_new: "เหมือนใหม่",
  good: "สภาพดี",
  fair: "มีร่องรอยใช้งาน",
} as const;

export type Category = keyof typeof CATEGORIES;
export type Condition = keyof typeof CONDITIONS;
export type Measurement = "chest" | "length" | "shoulder" | "waist";
export type PhotoKind = "front" | "back" | "label" | "flaw" | "extra";

export const MEASUREMENT_LABELS: Record<Measurement, string> = {
  chest: "อก",
  length: "ยาว",
  shoulder: "ไหล่",
  waist: "เอว",
};

/** Measurements a buyer needs to judge fit, by category. */
export const REQUIRED_MEASUREMENTS: Record<Category, Measurement[]> = {
  tops: ["chest", "length", "shoulder"],
  outerwear: ["chest", "length", "shoulder"],
  dresses: ["chest", "length"],
  bottoms: ["waist", "length"],
  shoes: [],
  bags: [],
  accessories: [],
  headwear: [],
};

export const MAX_STYLES = 3;
const TITLE_MAX = 120;
const BRAND_MAX = 60;
const DESCRIPTION_MAX = 2000;
const SIZE_MAX = 20;
const MAX_BAHT = 1_000_000;
const MAX_CM = 300;

export type ListingInput = {
  title: string;
  brand: string;
  description: string;
  category: string;
  sizeLabel: string;
  price: string;
  condition: string;
  hasFlaws: boolean;
  flawsNote: string;
  chest: string;
  length: string;
  shoulder: string;
  waist: string;
  styles: string[];
};

export type Listing = {
  title: string;
  brand: string | null;
  description: string;
  category: Category;
  sizeLabel: string;
  priceSatang: number;
  condition: Condition;
  hasFlaws: boolean;
  flawsNote: string | null;
  chestCm: number | null;
  lengthCm: number | null;
  shoulderCm: number | null;
  waistCm: number | null;
  styles: string[];
};

type Field = keyof ListingInput;
export type ListingResult = { ok: true; value: Listing } | { ok: false; errors: Partial<Record<Field, string>> };

const isCategory = (v: string): v is Category => Object.hasOwn(CATEGORIES, v);
const isCondition = (v: string): v is Condition => Object.hasOwn(CONDITIONS, v);

/** Whole baht, commas allowed, to satang. Null if not a sensible price. */
export function parseBaht(input: string): number | null {
  const cleaned = input.trim().replaceAll(",", "");
  if (!/^\d+$/.test(cleaned)) return null;
  const baht = Number(cleaned);
  if (baht < 1 || baht > MAX_BAHT) return null;
  return baht * 100;
}

/** Centimetres with at most one decimal place, or null. Empty input is "absent". */
function parseCm(input: string): number | null | "invalid" {
  const cleaned = input.trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d)?$/.test(cleaned)) return "invalid";
  const cm = Number(cleaned);
  if (cm <= 0 || cm > MAX_CM) return "invalid";
  return cm;
}

export function validateListing(input: ListingInput): ListingResult {
  const errors: Partial<Record<Field, string>> = {};

  const title = input.title.trim();
  if (!title) errors.title = "ใส่ชื่อสินค้า";
  else if (title.length > TITLE_MAX) errors.title = `ชื่อสินค้ายาวได้ไม่เกิน ${TITLE_MAX} ตัวอักษร`;

  const brand = input.brand.trim();
  if (brand.length > BRAND_MAX) errors.brand = `ชื่อแบรนด์ยาวได้ไม่เกิน ${BRAND_MAX} ตัวอักษร`;

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX) errors.description = `รายละเอียดยาวได้ไม่เกิน ${DESCRIPTION_MAX} ตัวอักษร`;

  const category = input.category;
  if (!isCategory(category)) errors.category = "เลือกหมวดสินค้า";

  const sizeLabel = input.sizeLabel.trim();
  if (!sizeLabel) errors.sizeLabel = "ใส่ไซซ์ที่ติดป้าย เช่น M, 32, US 9";
  else if (sizeLabel.length > SIZE_MAX) errors.sizeLabel = `ไซซ์ยาวได้ไม่เกิน ${SIZE_MAX} ตัวอักษร`;

  const priceSatang = parseBaht(input.price);
  if (priceSatang === null) errors.price = "ใส่ราคาเป็นบาทเต็ม ตั้งแต่ 1 ถึง 1,000,000";

  const condition = input.condition;
  if (!isCondition(condition)) errors.condition = "เลือกสภาพสินค้า";

  const flawsNote = input.flawsNote.trim();
  if (input.hasFlaws && flawsNote.length < 3) errors.flawsNote = "บอกว่าตำหนิอยู่ตรงไหน เป็นแบบไหน";

  const required = isCategory(category) ? REQUIRED_MEASUREMENTS[category] : [];
  const cm: Record<Measurement, number | null> = { chest: null, length: null, shoulder: null, waist: null };
  for (const key of Object.keys(cm) as Measurement[]) {
    const parsed = parseCm(input[key]);
    if (parsed === "invalid") {
      errors[key] = `ใส่${MEASUREMENT_LABELS[key]}เป็นเซนติเมตร เช่น 56 หรือ 56.5`;
    } else if (parsed === null && required.includes(key)) {
      errors[key] = `ใส่ขนาด${MEASUREMENT_LABELS[key]} (ซม.)`;
    } else {
      cm[key] = parsed;
    }
  }

  const styles = input.styles;
  if (styles.length === 0) errors.styles = "เลือกสไตล์อย่างน้อย 1 แบบ";
  else if (styles.length > MAX_STYLES) errors.styles = `เลือกสไตล์ได้ไม่เกิน ${MAX_STYLES} แบบ`;
  else if (new Set(styles).size !== styles.length) errors.styles = "เลือกสไตล์ซ้ำกัน";

  if (Object.keys(errors).length > 0 || !isCategory(category) || !isCondition(condition) || priceSatang === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title,
      brand: brand || null,
      description,
      category,
      sizeLabel,
      priceSatang,
      condition,
      hasFlaws: input.hasFlaws,
      flawsNote: input.hasFlaws ? flawsNote : null,
      chestCm: cm.chest,
      lengthCm: cm.length,
      shoulderCm: cm.shoulder,
      waistCm: cm.waist,
      styles,
    },
  };
}

const REQUIRED_PHOTOS: PhotoKind[] = ["front", "back", "label"];

/** Photos still needed before an item can go on sale. */
export function missingPhotos(uploaded: PhotoKind[], hasFlaws: boolean): PhotoKind[] {
  const have = new Set(uploaded);
  const missing = REQUIRED_PHOTOS.filter((kind) => !have.has(kind));
  if (hasFlaws && !have.has("flaw")) missing.push("flaw");
  return missing;
}
