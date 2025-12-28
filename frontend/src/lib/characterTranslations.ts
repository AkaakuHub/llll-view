export type LanguageCode = "ja" | "en" | "zh" | "ko";

type CharacterTranslation = {
	en: string;
	zh: string;
	ko?: string;
};

const CHARACTER_TRANSLATIONS: Record<string, CharacterTranslation> = {
	花帆: { en: "Kaho", zh: "花帆", ko: "카호" },
	さやか: { en: "Sayaka", zh: "沙耶香", ko: "사야카" },
	瑠璃乃: { en: "Rurino", zh: "瑠璃乃", ko: "루리노" },
	吟子: { en: "Ginko", zh: "吟子", ko: "긴코" },
	小鈴: { en: "Kosuzu", zh: "小鈴", ko: "코스즈" },
	姫芽: { en: "Hime", zh: "姬芽", ko: "히메" },
	セラス: { en: "Seras", zh: "塞拉斯", ko: "세라스" },
	泉: { en: "Izumi", zh: "泉", ko: "이즈미" },
	梢: { en: "Kozue", zh: "梢", ko: "코즈에" },
	綴理: { en: "Tsuzuri", zh: "綴理", ko: "츠즈리" },
	慈: { en: "Megumi", zh: "慈", ko: "메구미" },
	沙知: { en: "Sachi", zh: "沙知" },
	えな: { en: "Ena", zh: "惠奈" },
	びわこ: { en: "Biwako", zh: "琵琶子" },
	しいな: { en: "Shiina", zh: "椎奈" },
	ふたば: { en: "Hutaba", zh: "雙葉" },
	みのり: { en: "Minori", zh: "實里" },
	つかさ: { en: "Tsukasa", zh: "司" },
};

export const getCharacterTranslation = (
	name: string,
	language: LanguageCode,
): string | null => {
	if (language === "ja") return name;
	const entry = CHARACTER_TRANSLATIONS[name];
	if (!entry) return null;
	return entry[language] ?? null;
};
