import { parseVerbalNumbers } from "./verbal-numeric-parser";

export interface ParsedNlp {
  amount: number;
  type: "income" | "expense";
  category: string;
  tags: string[];
  description: string;
}

const PERSIAN_STOP_WORDS = new Set([
  "تومان",
  "تومن",
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
  "خریدم",
  "هزینه",
  "کردم",
  "شد",
  "جهت",
  "به خاطر",
  "واسه ی",
  "واسه",
  "برا",
  "ی",
  "یک",
  "عدد",
  "تا",
  "من",
  "بابتِ",
  "برایِ",
  "واسهٔ",
  "خرید",
  "فروش",
]);

const INCOME_TRIGGERS = [
  "فروش",
  "فروختم",
  "درآمد",
  "حقوق",
  "واریز",
  "طلب",
  "هدیه",
  "جایزه",
  "گرفتم",
  "سود",
  "فروختن",
  "طلبم",
  "گرفتن",
  "فروخته",
  "دستمزد",
  "کارکرد",
];

const EXPENSE_TRIGGERS = [
  "خرید",
  "خریدن",
  "خریدم",
  "پرداخت",
  "پرداختم",
  "پرداختی",
  "هزینه",
  "خرج",
  "کاهش",
  "دادم",
  "دادن",
  "خریداری",
  "پرداخت شد",
];

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

  let cleanedText = parseVerbalNumbers(toEnglishDigits(nlpText.trim()));
  const splitKeywords = [
    "واسه ی",
    "واسه",
    "بابت",
    "برای",
    "جهت",
    "به خاطر",
    "برا",
  ];
  let titlePart = cleanedText;
  let tagPart = "";

  for (const kw of splitKeywords) {
    const kwRegex = new RegExp(`\\b${kw}\\b|${kw}`, "i");
    if (kwRegex.test(cleanedText)) {
      const parts = cleanedText.split(kwRegex);
      if (parts.length >= 2) {
        titlePart = parts[0].trim();
        tagPart = parts.slice(1).join(" ").trim();
        break;
      }
    }
  }

  const normalizedText = toEnglishDigits(titlePart);
  const rawWords = normalizedText.split(/\s+/).filter(Boolean);
  const words = rawWords
    .map((w) => w.replace(/[,،\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim())
    .filter(Boolean);

  let parsedAmount = 0;
  let parsedType: "income" | "expense" = "expense";
  const titleTags: string[] = [];
  const extraTags: string[] = [];
  let triggeredWord = "";

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

  if (parsedAmount > 0 && parsedAmount < 1000) {
    parsedAmount = parsedAmount * 1000;
  }

  if (parsedAmount <= 0) return null;

  const normalizedFullText = toEnglishDigits(cleanedText);

  const hasIncomeTrigger = INCOME_TRIGGERS.some((trigger) =>
    normalizedFullText.includes(trigger),
  );
  const hasExpenseTrigger = EXPENSE_TRIGGERS.some((trigger) =>
    normalizedFullText.includes(trigger),
  );

  if (hasIncomeTrigger && !hasExpenseTrigger) {
    parsedType = "income";
  } else if (hasExpenseTrigger && !hasIncomeTrigger) {
    parsedType = "expense";
  } else if (hasIncomeTrigger && hasExpenseTrigger) {
    const firstIncomeIdx = INCOME_TRIGGERS.reduce((min, trigger) => {
      const idx = normalizedFullText.indexOf(trigger);
      return idx !== -1 && idx < min ? idx : min;
    }, Infinity);
    const firstExpenseIdx = EXPENSE_TRIGGERS.reduce((min, trigger) => {
      const idx = normalizedFullText.indexOf(trigger);
      return idx !== -1 && idx < min ? idx : min;
    }, Infinity);
    parsedType = firstIncomeIdx < firstExpenseIdx ? "income" : "expense";
  }

  for (const word of words) {
    const cleanWord = word.toLowerCase();
    const isStopWord = PERSIAN_STOP_WORDS.has(cleanWord);
    const isNumeric = !isNaN(parseFloat(cleanWord.replace(/,/g, "")));
    const isUnit =
      cleanWord.includes("هزار") ||
      cleanWord.includes("میلیون") ||
      cleanWord.includes("ملیون");
    const isTrigger =
      INCOME_TRIGGERS.includes(cleanWord) ||
      EXPENSE_TRIGGERS.includes(cleanWord);

    if (!isStopWord && !isNumeric && !isUnit && !isTrigger) {
      titleTags.push(word);
    } else if (isTrigger && !triggeredWord) {
      triggeredWord = word;
    }
  }

  if (tagPart) {
    const cleanTags = tagPart
      .split(/[\s,،]+/)
      .map((t) => t.trim())
      .filter((t) => t && !PERSIAN_STOP_WORDS.has(t));
    extraTags.push(...cleanTags);
  }

  let parsedCategory = titleTags.join(" ");
  if (!parsedCategory) {
    parsedCategory = triggeredWord || "عمومی";
  }

  const allTags = Array.from(new Set([...titleTags, ...extraTags]));

  return {
    amount: parsedAmount,
    type: parsedType,
    category: parsedCategory,
    tags: allTags.length > 0 ? allTags : [parsedCategory],
    description: cleanedText,
  };
}
