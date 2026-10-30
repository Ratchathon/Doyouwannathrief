import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "How it works" };

const h2 = "cond scroll-mt-24 border-b-2 border-print pb-2 text-[44px] leading-[0.9] md:text-[56px]";
const step = "flex gap-4 border-b border-print py-4";
const num = "cond tabular w-10 shrink-0 text-[40px] leading-none text-magenta";

function Steps({ items }: { items: [string, string][] }) {
  return (
    <ol>
      {items.map(([title, body], i) => (
        <li key={title} className={step}>
          <span aria-hidden="true" className={num}>
            {i + 1}
          </span>
          <span className="flex flex-col">
            <span className="wide text-[15px]">{title}</span>
            <span className="mt-1">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const FAQ: [string, string][] = [
  ["ของทุกชิ้นมีชิ้นเดียวจริงไหม", "จริง เป็นของมือสองที่ร้านคัดมา แต่ละชิ้นขายได้ครั้งเดียว ถ้ามีคนจองหรือซื้อแล้วจะขึ้นป้าย RESERVED หรือ SOLD"],
  ["ยื่นข้อเสนอราคาได้กี่ครั้ง", "ชิ้นละ 3 ครั้งต่อคน ร้านตอบภายใน 24 ชั่วโมง และต่อรองกลับได้ 3 รอบ ถ้ามีคนเสนอสูงกว่า ข้อเสนอของคุณจะหลุดและได้รับแจ้ง"],
  ["ทำไมเสนอแล้วโดนปฏิเสธทันที", "ร้านมีราคาต่ำสุดที่รับได้ (อย่างน้อย 75% ของราคาขาย) ซึ่งไม่เปิดเผย ข้อเสนอที่ต่ำกว่านั้นจะถูกตีกลับทันที"],
  ["ร้านไหนเข้ามาขายได้บ้าง", "เฉพาะร้านที่มีสไตล์ชัด แอดมินดูจากหน้าโซเชียลของร้านก่อนอนุมัติ หนึ่งบัญชีเปิดได้หนึ่งร้าน"],
  ["ตอนนี้ซื้อของได้จริงไหม", "ยังไม่ได้ เว็บนี้เป็นเดโม การจ่ายเงินและการส่งของเป็นการจำลองทั้งหมด ไม่มีการตัดเงินจริง"],
];

export default function HowItWorksPage() {
  return (
    <PageShell title="HOW IT WORKS" intro="ร้านมือสองที่คัดแล้วจากทั่วไทย รูปมาตรฐานเดียวกันทุกร้าน และเงินถูกพักไว้จนกว่าคุณได้ของ">
      <p className="wide mb-10 inline-block bg-highlight px-3 py-1.5 text-[11px]">DEMO · การซื้อขายในเว็บนี้เป็นการจำลอง</p>
      <div className="flex flex-col gap-16">
        <section aria-labelledby="buy">
          <h2 id="buy" className={h2}>
            BUYING
          </h2>
          <Steps
            items={[
              ["FIND IT", "ค้นจากชื่อ แบรนด์ ร้าน หรือสไตล์ แล้วกรองด้วยหมวด ไซซ์ ราคา และจังหวัด"],
              ["CHECK IT", "ทุกชิ้นมีรูปหน้า หลัง ป้าย และรูปตำหนิถ้ามี พร้อมขนาดวัดจริงเป็นเซนติเมตร"],
              ["BUY OR OFFER", "กด BUY NOW เพื่อซื้อราคาเต็ม หรือ MAKE AN OFFER เพื่อต่อราคา ตกลงแล้วต้องจ่ายภายใน 10 ชั่วโมง"],
              ["GET IT", "จ่ายผ่าน PromptPay (ในเดโมเป็น QR จำลอง) ร้านส่งของพร้อมเลขพัสดุ คุณกด I GOT IT เมื่อได้ของ เงินจึงถึงร้าน"],
            ]}
          />
        </section>
        <section aria-labelledby="authenticity">
          <h2 id="authenticity" className={h2}>
            AUTHENTICITY
          </h2>
          <p className="mt-4 max-w-[680px]">
            รูปป้ายแบรนด์และป้ายคอเป็นรูปบังคับ ให้คุณเทียบเองได้ก่อนซื้อ ร้านที่ขายของปลอมจะถูกปิด ถ้าสงสัยชิ้นไหน กด “แจ้งปัญหาสินค้านี้” ที่หน้าสินค้า
          </p>
        </section>
        <section aria-labelledby="sell">
          <h2 id="sell" className={h2}>
            SELLING
          </h2>
          <Steps
            items={[
              ["APPLY", "สมัครเปิดร้าน ใส่ชื่อร้าน ลิงก์ร้าน จังหวัด สไตล์ และหน้าโซเชียล รอแอดมินตรวจ"],
              ["LIST", "ลงของ ใส่ขนาดวัดจริง ถ่ายรูปหน้า หลัง ป้าย (และตำหนิ) ระบบย่อรูปให้ในเครื่อง"],
              ["ANSWER", "ตอบข้อเสนอภายใน 24 ชั่วโมง รับ ไม่รับ หรือเสนอกลับได้ 3 รอบ ขายนอกเว็บแล้วกด MARK SOLD ได้ในแตะเดียว"],
              ["SHIP", "ผู้ซื้อจ่ายแล้วให้แพ็กของ ใส่เลขพัสดุ เงินเข้าร้านเมื่อผู้ซื้อกดได้ของแล้ว"],
            ]}
          />
          <Link href="/sell/apply" className="btn mt-6">
            OPEN A SHOP
          </Link>
        </section>
        <section aria-labelledby="shipping">
          <h2 id="shipping" className={h2}>
            SHIPPING
          </h2>
          <p className="mt-4 max-w-[680px]">ร้านเป็นคนส่งของเองและใส่เลขพัสดุในเว็บ คุณติดตามสถานะได้ที่ MY ORDERS</p>
        </section>
        <section aria-labelledby="returns">
          <h2 id="returns" className={h2}>
            RETURNS
          </h2>
          <p className="mt-4 max-w-[680px]">ของมือสองชิ้นเดียวคืนไม่ได้ถ้าตรงตามรูปและคำอธิบาย ถ้าไม่ตรงปก แจ้งปัญหาก่อนกด I GOT IT เงินจะยังไม่ถึงร้านจนกว่าเรื่องจะจบ</p>
        </section>
        <section aria-labelledby="faq">
          <h2 id="faq" className={h2}>
            FAQ
          </h2>
          <div>
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-print py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {q}
                  <span aria-hidden="true" className="cond text-[28px] leading-none transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-[680px]">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
