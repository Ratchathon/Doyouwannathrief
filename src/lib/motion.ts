/** View transition name shared by an item's card photo and its item-page photo, so one morphs into the other. */
export function photoMorphName(id: string) {
  return `photo-${id}`;
}

/**
 * A view transition name must be unique on the page, or the browser skips the
 * whole transition. On pages where an item can show up in several rows, only
 * its first card morphs.
 */
export function morphClaimer() {
  const seen = new Set<string>();
  return (id: string) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  };
}
