/**
 * Ids of films and shows from OpenSubtitles.com's catalogue, as opposed to the
 * media server's: `os-m-<film>`, `os-s-<show>[-<season>[-<episode>]]`, and `os`
 * for the catalogue itself in the library.
 */
export const CATALOGUE_LIBRARY = "os";
export const CATALOGUE_PREFIX = "os-";

export const isCatalogueId = (id: string) => id === CATALOGUE_LIBRARY || id.startsWith(CATALOGUE_PREFIX);
