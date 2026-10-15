// 헬프 센터(help.urbanstay.co.kr, 채널톡 기반 "Stay Guide") 연결. 2026-10-13 확인.
// - 검색은 `/ko?query=검색어`로 공유된다. 시설·서비스 명사(주차, 조식, 수영장, 짐 보관, 유아용품, 흡연, 식기세척기, 인원 추가)는 결과가 정확하고,
//   "바다 근처", "조용한 곳", "욕실 2개", "장기 투숙", "경주"처럼 막연한 표현은 잡음이거나 0건이라 링크를 걸지 않는다 (docs/ai-log.md).
// - 지점마다 카테고리가 있고(8~13편: 위치, 주차, 부대시설, 조식, 짐 보관, 인원추가·유아용품, 주방 용품, 냉난방, 가전, 쓰레기, FAQ), 30지점이 1:1로 맞는다.
const HELP = "https://help.urbanstay.co.kr";

const HELP_ARTICLE = {
  rules: `${HELP}/ko/articles/FAQ-객실-이용규정-05c13035`, // 기준 인원, 36개월 이하 미포함, 반려동물 동반 불가(전사 정책)
  extraGuests: `${HELP}/ko/articles/FAQ-추가-인원이-발생하는-경우-인원-추가-신청-방법은-293e6393`, // 최대 인원까지만, 1인 35,000원
} as const;

// 지점 id(공식 slug) → 헬프 센터 지점 카테고리
export const BRANCH_HELP: Record<string, string> = {
  "gangnam-sac-signity": "/ko/categories/강남-예술의전당-시그니티-a923bdbd",
  "gangnam-sac-roium": "/ko/categories/강남-예술의전당-로이움-ea3e4371",
  "boutique-ikseon": "/ko/categories/부티크-익선-8f54d40d",
  "myeongdong": "/ko/categories/명동-376f056f",
  "dongtan-hotel": "/ko/categories/호텔-동탄-e3f53360",
  "siheung-penthouse": "/ko/categories/시흥-펜트하우스-dd3bc387",
  "siheung-wavepark": "/ko/categories/시흥-웨이브파크-913ea686",
  "siheung-geobukseom": "/ko/categories/시흥-거북섬-e1c15516",
  "over-the-mountain": "/ko/categories/오버-더-마운틴-가평-4baf61c0",
  "incheon-chinatown": "/ko/categories/인천차이나타운-c666cc0a",
  "songdo-moonlight-park": "/ko/categories/송도달빛공원-a27b3458",
  "busan-station": "/ko/categories/부산역-a29f7b60",
  "haeundae-paragraph": "/ko/categories/해운대-패러그라프-ccb185ed",
  "busan-gijang": "/ko/categories/부산기장-9c9404fb",
  "busan-songdo-beach": "/ko/categories/부산송도해변-2679a717",
  "haeundae-station": "/ko/categories/해운대역-6fe15331",
  "seomyeon": "/ko/categories/서면-9b981927",
  "busan-cityhall": "/ko/categories/부산시청-e73569c0",
  "sokcho-xiella": "/ko/categories/속초자이엘라-b7e70770",
  "yangyang": "/ko/categories/양양-8ac64868",
  "sokcho-central": "/ko/categories/속초중앙-e0ff1bad",
  "sokcho-beach": "/ko/categories/속초해변-8821020a",
  "naksan-beach": "/ko/categories/낙산해변-fe1d2677",
  "sokcho-beach-c": "/ko/categories/속초해변C-9b5e713d",
  "sokcho-deungdae-beach": "/ko/categories/속초등대해변-41b087f0",
  "sokcho-beach-ab": "/ko/categories/속초해변AB-9a5fd437",
  "jeju": "/ko/categories/아카이브-제주-76e0683d",
  "jeju-airport": "/ko/categories/제주공항-9a17ede0",
  "ulsan": "/ko/categories/울산-37c8a87e",
  "dangjin-terminal": "/ko/categories/당진터미널-6ef76352",
};
export const branchHelpUrl = (branchId: string) => HELP + BRANCH_HELP[branchId];

const helpSearchUrl = (q: string) => `${HELP}/ko?query=${encodeURIComponent(q)}`;

// unhandled 문구 → 검색어. 아티클이 있다고 확인한 키워드만 (위 주석). 없으면 null
const KEYWORDS: [RegExp, string][] = [
  [/주차/, "주차"], [/조식|아침/, "조식"], [/수영장|풀장|스파/, "수영장"], [/짐|캐리어/, "짐 보관"],
  [/아기|유아|신생아|영유아/, "유아용품"], [/흡연|담배/, "흡연"], [/식기세척기/, "식기세척기"], [/인원 ?추가|추가 ?인원/, "인원 추가"],
];
export function helpSearchFor(text: string): string | null {
  const hit = KEYWORDS.find(([re]) => re.test(text));
  return hit ? helpSearchUrl(hit[1]) : null;
}

// 0건 이유·대안 문장 → 정책 아티클. 문장은 코드(src/lib/search.ts)가 만들므로 표현이 고정되어 있다
export function helpArticleFor(text: string): { label: string; url: string } | null {
  if (/반려동물/.test(text)) return { label: "반려동물 정책", url: HELP_ARTICLE.rules };
  if (/숙박 가능/.test(text)) return { label: "인원 추가 안내", url: HELP_ARTICLE.extraGuests };
  return null;
}
