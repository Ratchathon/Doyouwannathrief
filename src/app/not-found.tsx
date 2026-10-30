import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pt-10 pb-28 md:px-10 md:pt-16">
      <p className="cond text-[min(42vw,260px)] leading-[0.8] text-magenta">404</p>
      <h1 className="cond mt-4 border-t-2 border-print pt-3 text-[48px] leading-[0.9] md:text-[72px]">THIS PAGE IS SOLD OUT</h1>
      <p className="mt-3 max-w-[520px] text-[15px] md:text-base">ไม่เจอหน้านี้ อาจถูกลบไปแล้ว หรือพิมพ์ลิงก์ผิด ลองหาของจากหน้าแรกแทน</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/" className="btn">
          BACK TO THE COVER
        </Link>
        <Link href="/discover" className="btn-outline">
          DISCOVER
        </Link>
      </div>
    </div>
  );
}
