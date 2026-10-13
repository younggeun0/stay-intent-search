import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "대화형 숙소 검색",
  description: "필터로 표현되지 않는 조건을 말로 찾는 숙소 검색 (채용 과제 프로토타입)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard는 Google Fonts에 없어 공식 사이트와 같은 CDN에서 불러온다. 가변 글꼴 + 쓰는 글자만 받는 dynamic subset */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
