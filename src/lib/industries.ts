/**
 * 業種 for work history: a static two-level list (大分類 → 中分類), based on
 * the Japan Standard Industrial Classification with friendlier names.
 * Codes are stored on WorkEntry.industry ("G" = 大分類 only, "G-software"
 * = 中分類); labels come from here, so they can be reworded any time.
 */

export type IndustryItem = { code: string; ja: string; en: string };
export type IndustryGroup = IndustryItem & { children: IndustryItem[] };

const g = (
  code: string,
  ja: string,
  en: string,
  children: [string, string, string][],
): IndustryGroup => ({
  code,
  ja,
  en,
  children: children.map(([c, cja, cen]) => ({
    code: `${code}-${c}`,
    ja: cja,
    en: cen,
  })),
});

export const INDUSTRIES: IndustryGroup[] = [
  g("A", "農業・林業・漁業", "Agriculture, forestry & fishing", [
    ["agri", "農業", "Agriculture"],
    ["forest", "林業", "Forestry"],
    ["fish", "漁業・水産養殖", "Fishing & aquaculture"],
  ]),
  g("C", "建設・不動産", "Construction & real estate", [
    ["general", "総合建設・ゼネコン", "General construction"],
    ["specialty", "設備・専門工事", "Specialist & installation work"],
    ["housing", "住宅・リフォーム", "Housing & renovation"],
    ["realestate", "不動産（売買・仲介・管理）", "Real estate"],
    ["architecture", "建築設計", "Architecture & design"],
  ]),
  g("E", "製造・メーカー", "Manufacturing", [
    ["food", "食品・飲料", "Food & beverages"],
    ["textile", "繊維・アパレル", "Textiles & apparel"],
    ["chemical", "化学・素材", "Chemicals & materials"],
    ["pharma", "医薬品・化粧品", "Pharmaceuticals & cosmetics"],
    ["steel", "鉄鋼・金属", "Steel & metals"],
    ["machinery", "機械・産業機器", "Machinery & industrial equipment"],
    ["electronics", "電機・電子部品・半導体", "Electronics & semiconductors"],
    ["auto", "自動車・輸送機器", "Automotive & transport equipment"],
    ["precision", "精密機器・医療機器", "Precision & medical devices"],
    ["other", "その他の製造業", "Other manufacturing"],
  ]),
  g("F", "エネルギー・インフラ", "Energy & utilities", [
    ["power", "電力", "Electric power"],
    ["gas", "ガス", "Gas"],
    ["water", "水道・環境", "Water & environment"],
    ["renewable", "再生可能エネルギー", "Renewable energy"],
  ]),
  g("G", "IT・通信", "IT & telecommunications", [
    ["software", "ソフトウェア・SaaS", "Software & SaaS"],
    ["internet", "インターネットサービス・Web", "Internet services & web"],
    ["si", "SIer・ITコンサルティング", "Systems integration & IT consulting"],
    ["games", "ゲーム", "Games"],
    ["telecom", "通信キャリア", "Telecommunications"],
    ["hardware", "情報機器・ハードウェア", "IT hardware"],
  ]),
  g("M", "マスコミ・広告・出版", "Media, advertising & publishing", [
    ["broadcast", "放送（テレビ・ラジオ）", "Broadcasting"],
    ["newspaper", "新聞", "Newspapers"],
    ["publishing", "出版・印刷", "Publishing & printing"],
    ["advertising", "広告・PR", "Advertising & PR"],
    ["entertainment", "映像・音楽・エンタメ", "Film, music & entertainment"],
  ]),
  g("H", "運輸・物流", "Transport & logistics", [
    ["rail", "鉄道", "Railways"],
    ["air", "航空", "Airlines"],
    ["shipping", "海運", "Shipping"],
    ["trucking", "陸運・物流・倉庫", "Road freight, logistics & warehousing"],
    ["travel", "旅行", "Travel"],
  ]),
  g("I", "商社・小売", "Trading & retail", [
    ["trading", "総合商社・専門商社", "Trading companies"],
    ["wholesale", "卸売", "Wholesale"],
    ["department", "百貨店・スーパー", "Department stores & supermarkets"],
    ["convenience", "コンビニ・専門店", "Convenience & specialty stores"],
    ["ecommerce", "EC・通販", "E-commerce"],
  ]),
  g("J", "金融・保険", "Finance & insurance", [
    ["bank", "銀行", "Banking"],
    ["securities", "証券・投資", "Securities & investment"],
    ["insurance", "保険", "Insurance"],
    ["credit", "クレジット・リース", "Credit & leasing"],
    ["fintech", "フィンテック", "Fintech"],
  ]),
  g("L", "コンサル・専門サービス", "Consulting & professional services", [
    ["consulting", "経営・戦略コンサルティング", "Management consulting"],
    ["legal", "法律（弁護士・司法書士など）", "Legal"],
    ["accounting", "会計・税務", "Accounting & tax"],
    ["research", "研究・調査", "Research"],
    ["design", "デザイン・クリエイティブ", "Design & creative"],
    ["hr", "人材サービス", "Recruitment & HR services"],
  ]),
  g("O", "教育・学習支援", "Education", [
    ["school", "学校（小・中・高）", "Schools (K-12)"],
    ["international", "インターナショナルスクール", "International schools"],
    ["university", "大学・研究機関", "Universities & research institutes"],
    ["cram", "塾・予備校", "Cram schools & tutoring"],
    ["language", "語学教育", "Language education"],
    ["edtech", "教育サービス・EdTech", "Education services & EdTech"],
  ]),
  g("P", "医療・福祉", "Healthcare & welfare", [
    ["hospital", "病院・クリニック", "Hospitals & clinics"],
    ["dental", "歯科", "Dentistry"],
    ["pharmacy", "薬局", "Pharmacies"],
    ["care", "介護・福祉", "Nursing care & welfare"],
    ["childcare", "保育", "Childcare"],
  ]),
  g("N", "ホテル・飲食・レジャー", "Hospitality, food service & leisure", [
    ["hotel", "ホテル・旅館", "Hotels"],
    ["restaurant", "飲食", "Restaurants & food service"],
    ["leisure", "レジャー・スポーツ", "Leisure & sports"],
    ["beauty", "美容・理容", "Beauty & personal care"],
    ["wedding", "ブライダル・冠婚葬祭", "Weddings & ceremonies"],
  ]),
  g("S", "公務・団体", "Public sector & organisations", [
    ["government", "官公庁・自治体", "Government"],
    ["diplomacy", "外交・国際機関", "Diplomacy & international organisations"],
    ["nonprofit", "NPO・NGO・財団", "Non-profits & foundations"],
    ["defense", "防衛・警察・消防", "Defence, police & fire"],
  ]),
  g("X", "その他", "Other", [
    ["self", "自営業・フリーランス", "Self-employed & freelance"],
    ["startup", "起業・スタートアップ", "Founder / startup"],
    ["other", "その他", "Other"],
  ]),
];

const BY_CODE = new Map<string, { group: IndustryGroup; item: IndustryItem }>();
for (const group of INDUSTRIES) {
  BY_CODE.set(group.code, { group, item: group });
  for (const item of group.children) BY_CODE.set(item.code, { group, item });
}

export function isIndustryCode(code: string): boolean {
  return BY_CODE.has(code);
}

/** The 大分類 code of a stored code ("G-software" → "G"). */
export function industryGroupOf(code: string | null | undefined): string {
  return code ? (BY_CODE.get(code)?.group.code ?? "") : "";
}

/** "IT・通信 › ソフトウェア・SaaS" (or just the 大分類), null if unknown. */
export function industryLabel(
  code: string | null | undefined,
  locale: "ja" | "en",
): string | null {
  const hit = code ? BY_CODE.get(code) : undefined;
  if (!hit) return null;
  const name = (x: IndustryItem) => (locale === "en" ? x.en : x.ja);
  return hit.item === hit.group
    ? name(hit.group)
    : `${name(hit.group)} › ${name(hit.item)}`;
}
