/** Frame for plain inner pages: a big condensed title on a rule, then the content. */
export function PageShell({
  title,
  intro,
  children,
  width = "narrow",
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <div className={`mx-auto w-full px-4 pt-7 pb-24 md:px-10 md:pt-12 ${width === "narrow" ? "max-w-[1100px]" : "max-w-[1360px]"}`}>
      <h1 className="cond text-[64px] leading-[0.88] break-words md:text-[96px]">{title}</h1>
      {intro && <div className="mt-3 border-t-2 border-print pt-2 text-[15px] font-semibold md:text-base">{intro}</div>}
      <div className="mt-8 md:mt-10">{children}</div>
    </div>
  );
}

export function FormSkeleton() {
  return <div aria-busy="true" aria-label="กำลังโหลด" className="h-80 animate-pulse bg-[#e8e8e4]" />;
}
