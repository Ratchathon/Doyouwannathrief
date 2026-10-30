"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PHOTO_LABELS, missingPhotos, type PhotoKind } from "@/lib/products/listing";
import { removePhoto } from "@/lib/products/photo-actions";
import { uploadPhoto } from "@/lib/products/upload";

type Photo = { id: string; kind: PhotoKind; url: string };

/** One slot per photo the standard asks for; each uploads on its own. */
export function PhotoSlots({ shopId, productId, hasFlaws, photos }: { shopId: string; productId: string; hasFlaws: boolean; photos: Photo[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<PhotoKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kinds: PhotoKind[] = ["front", "back", "label", ...(hasFlaws ? (["flaw"] as PhotoKind[]) : []), "extra"];
  const missing = missingPhotos(photos.map((p) => p.kind), hasFlaws);

  async function upload(kind: PhotoKind, file: File | undefined) {
    if (!file) return;
    setBusy(kind);
    setError(null);
    const problem = await uploadPhoto({ file, shopId, productId, kind });
    setBusy(null);
    if (problem) setError(problem);
    else router.refresh();
  }

  async function remove(id: string) {
    setError(null);
    const result = await removePhoto({ photoId: id });
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {missing.length > 0 ? (
        <p className="bg-highlight px-3 py-2 font-medium">ยังขาดรูป: {missing.map((k) => PHOTO_LABELS[k]).join(", ")}</p>
      ) : (
        <p className="border-2 border-print px-3 py-2 font-medium">รูปครบตามมาตรฐานแล้ว</p>
      )}
      {error && (
        <p role="alert" className="bg-highlight px-3 py-2 font-medium">
          {error}
        </p>
      )}
      <ul aria-label="รูปสินค้า" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kinds.map((kind) => {
          const have = photos.filter((p) => p.kind === kind);
          const shown = have[0];
          const inputId = `photo-${kind}`;
          return (
            <li key={kind} className="flex flex-col gap-2">
              <span className="wide text-[11px]">
                {kind.toUpperCase()} · <span className="font-sans font-normal tracking-normal">{PHOTO_LABELS[kind]}</span>
              </span>
              <div className="relative aspect-[4/5] overflow-hidden border-2 border-print bg-photo">
                {shown ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shown.url} alt={PHOTO_LABELS[kind]} className="size-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-muted">ยังไม่มีรูป</span>
                )}
                {busy === kind && <span className="absolute inset-0 flex items-center justify-center bg-paper/80 wide text-xs">UPLOADING…</span>}
              </div>
              <label htmlFor={inputId} className="btn-outline h-10 cursor-pointer px-3 text-[11px]">
                {shown && kind !== "extra" ? "REPLACE" : "UPLOAD"}
              </label>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                aria-label={`อัปโหลดรูป ${PHOTO_LABELS[kind]}`}
                className="sr-only"
                disabled={busy !== null}
                onChange={(e) => {
                  void upload(kind, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {have.map((p) =>
                kind === "extra" || kind === "flaw" ? (
                  <button key={p.id} type="button" onClick={() => void remove(p.id)} className="text-left text-sm underline underline-offset-4">
                    ลบรูปนี้
                  </button>
                ) : null,
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
