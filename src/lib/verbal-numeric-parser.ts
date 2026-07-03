export interface NumberMaps {
  units: Record<string, number>;
  tens: Record<string, number>;
  hundreds: Record<string, number>;
  multipliers: Record<string, number>;
}

const maps: NumberMaps = {
  units: {
    یک: 1,
    یه: 1,
    دو: 2,
    سه: 3,
    چهار: 4,
    پنج: 5,
    شش: 6,
    شیش: 6,
    هفت: 7,
    هشت: 8,
    نه: 9,
    ده: 10,
    یازده: 11,
    دوازده: 12,
    سیزده: 13,
    چهارده: 14,
    پانزده: 15,
    پونزده: 15,
    شانزده: 16,
    شونزده: 16,
    هفده: 17,
    هجده: 18,
    نوزده: 19,
    بیست: 20,
  },
  tens: {
    سی: 30,
    چهل: 40,
    پنجاه: 50,
    شصت: 60,
    هفتاد: 70,
    هشتاد: 80,
    نود: 90,
  },
  hundreds: {
    صد: 100,
    دویست: 200,
    سیصد: 300,
    چهارصد: 400,
    پانصد: 500,
    پونصد: 500,
    ششصد: 600,
    شیشصد: 600,
    هفتصد: 700,
    هشتصد: 800,
    نهصد: 900,
  },
  multipliers: {
    هزار: 1000,
    میلیون: 1000000,
    ملیون: 1000000,
    میلیارد: 1000000000,
    ملیارد: 1000000000,
  },
};

const nonFinancialClassifiers = new Set([
  "عدد",
  "کیلو",
  "گرم",
  "متر",
  "ساعت",
  "روز",
  "اسلایس",
  "بسته",
  "لیتر",
  "کارتن",
  "جعبه",
  "جفت",
  "دست",
]);

function evaluateSegment(words: string[]): number {
  let total = 0;
  let currentAcc = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "و") continue;

    if (w === "نیم") {
      currentAcc += 0.5;
      continue;
    }

    const isDigits = /^\d+(?:\.\d+)?$/.test(w);

    if (isDigits) {
      currentAcc += parseFloat(w);
    } else if (maps.units[w] !== undefined) {
      currentAcc += maps.units[w];
    } else if (maps.tens[w] !== undefined) {
      currentAcc += maps.tens[w];
    } else if (maps.hundreds[w] !== undefined) {
      currentAcc += maps.hundreds[w];
    } else if (maps.multipliers[w] !== undefined) {
      const mult = maps.multipliers[w];
      if (currentAcc === 0) currentAcc = 1;
      total += currentAcc * mult;
      currentAcc = 0;
    }
  }

  if (total >= 1000000 && currentAcc > 0 && currentAcc < 1000) {
    total += currentAcc * 1000;
  } else {
    total += currentAcc;
  }

  return total;
}

export function parseVerbalNumbers(text: string): string {
  const tokens = text.split(/(\s+)/);
  const processedTokens: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i].trim();

    const isNumericWord =
      maps.units[token] !== undefined ||
      maps.tens[token] !== undefined ||
      maps.hundreds[token] !== undefined ||
      maps.multipliers[token] !== undefined ||
      token === "نیم" ||
      /^\d+$/.test(token);

    if (isNumericWord) {
      const segment: string[] = [];
      let j = i;

      while (j < tokens.length) {
        const subToken = tokens[j].trim();
        if (!subToken) {
          j++;
          continue;
        }

        const isSubNumeric =
          maps.units[subToken] !== undefined ||
          maps.tens[subToken] !== undefined ||
          maps.hundreds[subToken] !== undefined ||
          maps.multipliers[subToken] !== undefined ||
          subToken === "نیم" ||
          subToken === "و" ||
          /^\d+$/.test(subToken);

        if (isSubNumeric) {
          segment.push(subToken);
          j++;
        } else {
          break;
        }
      }

      while (segment.length > 0 && segment[segment.length - 1] === "و") {
        segment.pop();
        j--;
      }

      if (segment.length > 0) {
        const normalizedSegment = segment.map((word) => {
          if (/^\d+$/.test(word)) {
            return word;
          }
          return word;
        });

        const numericWords = normalizedSegment.map((w) => {
          if (/^\d+$/.test(w)) {
            const num = parseInt(w, 10);
            if (num === 1) return "یک";
            if (num === 2) return "دو";
            return w;
          }
          return w;
        });

        const hasOnlyDigits = normalizedSegment.every((w) => /^\d+$/.test(w));

        if (hasOnlyDigits) {
          processedTokens.push(segment.join(" "));
          if (j < tokens.length) {
            processedTokens.push(" ");
          }
          i = j;
          continue;
        }

        let value = evaluateSegment(numericWords);

        let nextWord = "";
        let k = j;
        while (k < tokens.length) {
          const checkToken = tokens[k].trim();
          if (checkToken) {
            nextWord = checkToken;
            break;
          }
          k++;
        }

        if (value < 1000 && !nonFinancialClassifiers.has(nextWord)) {
          value = value * 1000;
        }

        processedTokens.push(value.toString());
        if (j < tokens.length) {
          processedTokens.push(" ");
        }
        i = j;
      } else {
        processedTokens.push(tokens[i]);
        i++;
      }
    } else {
      processedTokens.push(tokens[i]);
      i++;
    }
  }

  return processedTokens.join("");
}
