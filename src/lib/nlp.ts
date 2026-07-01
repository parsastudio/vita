export interface ParsedNlp {
  amount: number;
  type: "income" | "expense";
  category: string;
  tags: string[];
  description: string;
}

const PERSIAN_STOP_WORDS = new Set([
  "تومان",
  "ریال",
  "بابت",
  "برای",
  "به",
  "با",
  "از",
  "تا",
  "رو",
  "در",
  "پرداخت",
  "خرید",
  "هزینه",
  "کردم",
  "شد",
]);

export function toEnglishDigits(str: string): string {
  const persianDigits = [
    /۰/g,
    /۱/g,
    /۲/g,
    /۳/g,
    /۴/g,
    /۵/g,
    /۶/g,
    /۷/g,
    /۸/g,
    /۹/g,
  ];
  const arabicDigits = [
    /٠/g,
    /١/g,
    /٢/g,
    /٣/g,
    /٤/g,
    /٥/g,
    /٦/g,
    /٧/g,
    /٨/g,
    /٩/g,
  ];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result
      .replace(persianDigits[i], String(i))
      .replace(arabicDigits[i], String(i));
  }
  return result;
}

export function parseNaturalLanguageTransaction(
  nlpText: string,
): ParsedNlp | null {
  if (!nlpText.trim()) return null;
  const normalizedText = toEnglishDigits(nlpText);
  const rawWords = normalizedText.split(/\s+/).filter(Boolean);
  const words = rawWords
    .map((w) => w.replace(/[.,،\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim())
    .filter(Boolean);

  let parsedAmount = 0;
  let parsedType: "income" | "expense" = "expense";
  const detectedTags: string[] = [];

  const millionMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(میلیون|ملیون)/);
  const thousandMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(هزار)/);

  if (millionMatch) {
    parsedAmount = parseFloat(millionMatch[1]) * 1000000;
  } else if (thousandMatch) {
    parsedAmount = parseFloat(thousandMatch[1]) * 1000;
  } else {
    for (const word of words) {
      const num = parseFloat(word.replace(/,/g, ""));
      if (!isNaN(num) && num > 0) {
        parsedAmount = num;
        break;
      }
    }
  }

  if (parsedAmount <= 0) return null;

  for (const word of words) {
    if (
      [
        "income",
        "salary",
        "earn",
        "deposit",
        "gift",
        "حقوق",
        "درآمد",
        "واریز",
      ].includes(word.toLowerCase())
    ) {
      parsedType = "income";
    } else if (
      !PERSIAN_STOP_WORDS.has(word) &&
      isNaN(parseFloat(word.replace(/,/g, ""))) &&
      !word.includes("هزار") &&
      !word.includes("میلیون") &&
      !word.includes("ملیون")
    ) {
      detectedTags.push(word);
    }
  }

  const parsedCategory = detectedTags[0] || "عمومی";
  return {
    amount: parsedAmount,
    type: parsedType,
    category: parsedCategory,
    tags: detectedTags,
    description: nlpText,
  };
}
