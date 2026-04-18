// Code service abstraction — swap this implementation for real NumberCode service
// Real service: fetch unused code from external system (Google Sheet / API),
// mark it as used, and associate it with the member address.

export interface CodeServiceResult {
  code: string;
}

// TODO: Replace with real NumberCode service integration
export async function getAccessCode(address: string): Promise<CodeServiceResult> {
  // Fake deterministic code for hackathon demo — consistent per address+day
  const day = new Date().toISOString().slice(0, 10);
  const seed = address.toLowerCase() + day;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const code = String(100000 + (hash % 900000));
  return { code };
}
