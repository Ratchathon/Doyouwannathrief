/** Placeholder shapes shown the moment a page is opened, while its data streams in. */
const block = "animate-pulse bg-[#17191c]";

export function GridSkeleton({ title }: { title?: string }) {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด" className="mx-auto w-full max-w-[1360px] px-4 pt-6 pb-24 md:px-10">
      {title ? (
        <h1 className="font-display text-[34px] leading-none font-normal tracking-[0.02em] md:text-[44px]">{title}</h1>
      ) : (
        <div className={`${block} h-14 w-2/3 max-w-[520px]`} />
      )}
      <div className={`${block} mt-4 h-4 w-1/2 max-w-[360px]`} />
      <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex flex-col gap-2">
            <div className={`${block} aspect-[4/5]`} />
            <div className={`${block} h-3 w-1/3`} />
            <div className={`${block} h-4 w-4/5`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด" className="mx-auto flex w-full max-w-[1360px] flex-wrap gap-8 pt-8 pb-24 md:gap-14 md:px-10">
      <div className={`${block} aspect-[4/5] min-w-0 flex-[999_1_560px] md:max-h-[820px]`} />
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 px-4 md:px-0">
        <div className={`${block} h-3 w-1/4`} />
        <div className={`${block} h-7 w-4/5`} />
        <div className={`${block} h-12 w-1/3`} />
        <div className={`${block} h-28 w-full`} />
      </div>
    </div>
  );
}
