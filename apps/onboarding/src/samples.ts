const urls = import.meta.glob<string>("../../../fixtures/*", { query: "?url", import: "default", eager: true });

export interface SampleDocument {
  fileName: string;
  url: string;
}

/** Documents from the repo's `fixtures/` folder, offered on every file field. */
export const sampleDocuments: readonly SampleDocument[] = Object.entries(urls)
  .map(([path, url]) => ({ fileName: path.slice(path.lastIndexOf("/") + 1), url }))
  .sort((a, b) => a.fileName.localeCompare(b.fileName));

export async function loadSample({ fileName, url }: SampleDocument): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load ${fileName}`);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}
