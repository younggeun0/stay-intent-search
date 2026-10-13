// 공식 사이트 지점 slug와 이미지 id (2026-10-13, 홈 페이지 데이터와 큐레이션 목록에서 추출).
// 이미지 파일은 레포에 복사하지 않고 공식 CDN 주소로만 참조한다. 객실 사진이 없으면 지점 사진을 쓴다.
export const BRANCH_SITE: Record<string, { slug: string; image: string }> = {
  "gangnam-sac-signity": {
    "slug": "gangnam-sac-signity",
    "image": "ccf7ce94-c9ba-49e4-b206-1b18ffb88906"
  },
  "gangnam-sac-roium": {
    "slug": "gangnam-sac-roium",
    "image": "ecc497f6-0f3f-4f54-a296-1200dd17ffc0"
  },
  "ikseon": {
    "slug": "boutique-ikseon",
    "image": "3e7d053c-5ecc-44ef-b402-50e902932e28"
  },
  "busan-station": {
    "slug": "busan-station",
    "image": "09ec2829-3bfc-4031-a9de-7805e43724f5"
  },
  "haeundae-station": {
    "slug": "haeundae-station",
    "image": "820f17c1-f8d6-4146-af6c-ac7e1a04c3ba"
  },
  "haeundae-paragraph": {
    "slug": "haeundae-paragraph",
    "image": "0292b4db-8c84-4ac8-803a-05764d756324"
  },
  "busan-gijang": {
    "slug": "busan-gijang",
    "image": "c1a3e241-9b01-45e4-b533-d3f5586abdf7"
  },
  "sokcho-beach-c": {
    "slug": "sokcho-beach-c",
    "image": "a619bfd6-d510-479c-a517-b71b34aa607e"
  },
  "plott-sokcho": {
    "slug": "sokcho-xiella",
    "image": "ede8501d-f29d-4ae0-aa04-24d4912e71a0"
  },
  "plott-yangyang": {
    "slug": "yangyang",
    "image": "b649c871-746e-4539-b7cb-0b8e2840ba68"
  },
  "siheung-wavepark": {
    "slug": "siheung-wavepark",
    "image": "bb4fcd32-fe05-404e-a02d-58faf88d186f"
  },
  "gapyeong": {
    "slug": "over-the-mountain",
    "image": "e44c926d-a7d0-42bc-af55-b73218cd7487"
  },
  "songdo": {
    "slug": "songdo-moonlight-park",
    "image": "a2d166f8-2354-44c7-8c1b-8f3bcdf303f6"
  },
  "incheon-chinatown": {
    "slug": "incheon-chinatown",
    "image": "c745ed35-d42c-4763-8e84-79239430faa3"
  },
  "jeju-airport": {
    "slug": "jeju-airport",
    "image": "423fdff2-70b7-4d7c-8750-603fdd3acca6"
  }
};

export const ROOM_IMAGE: Record<string, string> = {
  "r01": "0dd36d47-ef77-4165-8dbd-5810c4e1439f",
  "r02": "1252c736-8af3-4978-adbb-3eeb21e91015",
  "r03": "fafc6fda-736a-494b-aadd-947ff207274a",
  "r04": "911f2cbd-f316-4c02-9920-64648c9609b4",
  "r07": "3ea5e947-f7a5-4ba3-9e94-fe362d1e7eda",
  "r08": "274ce3ae-1529-4c87-9831-551508cf081e",
  "r09": "bb60eaf0-31b0-400d-bb7d-790cd0519950",
  "r11": "9f553f2f-4b5f-4fc8-85b9-eaecda691b40",
  "r12": "1371429d-6dad-4263-8dc1-15618c9c747a",
  "r13": "37e58ef5-78b9-4d83-b71f-47127c8ad661",
  "r14": "d469d1ca-accc-444e-808c-dc15181a01e1",
  "r15": "6184a7e0-9e88-4a3a-bb51-ef563389ef12",
  "r16": "a69ce095-eedc-4219-8669-142d4d9cfb20",
  "r17": "12ce0226-488d-4f3f-bc43-898d49a91293",
  "r18": "acca56e9-4057-449a-b50e-e95770308e60",
  "r19": "e908a322-4db5-4a7c-bf68-09326d3c87d4",
  "r20": "4c844a2c-8ee4-49e8-ae5d-7e52455bb1aa",
  "r21": "61ee3705-8e76-410e-ab84-8c932fb21d26",
  "r22": "3158adc1-29db-4091-9337-56a09f412c69",
  "r23": "d3312e59-3327-43dc-9c8b-92e208f3fedf",
  "r24": "ef22e0e7-518a-46ac-9bfd-6e195e3ba329",
  "r25": "a7ec5737-57be-4d22-857b-61c2695bee6b",
  "r26": "de9c96d0-f117-4bc2-bc72-a467c9122934",
  "r27": "c568c3e1-2765-4c7a-b949-ef77974605b7",
  "r28": "0e7777a7-72bd-4413-a678-80d9bebf85ac",
  "r29": "7ff77faf-b487-4eda-856f-701ed27503bd",
  "r30": "f1d591ad-629a-482c-bbaf-4f1ed575443e",
  "r31": "3f39de9a-285f-48cc-b701-fddddf3cfbcc",
  "r32": "84881492-5742-46a1-b902-e024f55a88ab",
  "r33": "9868b3d7-18d4-422c-82ce-d6f63b9feab5",
  "r34": "eb40c07f-adc7-4a19-8052-35baac93b3bf",
  "r35": "90676288-b0f5-4d1e-9f37-79eed9e93660",
  "r36": "a2356014-4e4e-4b72-89b0-c04963659aae",
  "r37": "5a74c193-6891-4a75-8222-d48e4a8d2afb",
  "r40": "8c7d9add-9aeb-4ccf-a776-bccba9c54c42",
  "r41": "e980f5bf-a156-4c30-940e-fa7b2ee79d47",
  "r42": "f523eff5-f290-4db0-8f5a-4f882c8206ad",
  "r43": "615143a8-9ddf-4102-acf6-dfa631f956fb",
  "r44": "b3323c68-208d-471f-89cf-61b11cb4ab5f",
  "r45": "589ec6ca-1052-4653-837b-226357c7296a",
  "r46": "98ebb26b-7c50-4a8a-ba2d-db778e8659a2",
  "r47": "065f731b-5369-4db4-a1ff-9850d98a27e5",
  "r48": "1109be8a-3daf-446a-ba56-cba1a829d870",
  "r49": "cf0bb1d0-18ec-48e5-a56e-a2c2022cf07b",
  "r50": "d2379ba5-0be4-4f18-a340-3d2cdf4c6d62"
};
