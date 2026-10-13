import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

// 공식 사이트 제목 글꼴(AritaBuri)의 무료 대체. 한글 글꼴이라 미리 불러오지 않는다
const serif = Noto_Serif_KR({ weight: "600", variable: "--font-noto-serif", preload: false });

export const metadata: Metadata = {
  title: "대화형 숙소 검색",
  description: "필터로 표현되지 않는 조건을 말로 찾는 숙소 검색 (채용 과제 프로토타입)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${serif.variable} h-full antialiased`}>
      <head>
        {/* Pretendard는 Google Fonts에 없어 공식 사이트와 같은 CDN에서 불러온다 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
