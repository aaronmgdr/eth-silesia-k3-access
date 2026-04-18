// Mock code pool for hackathon
// In production, this would be replaced with an API call to kolektyw3's external service

const MOCK_CODES = [
  '1234', '5678', '9012', '3456', '7890',
  '2345', '6789', '0123', '4567', '8901',
  '1111', '2222', '3333', '4444', '5555',
  '6666', '7777', '8888', '9999', '0000',
  '1357', '2468', '9753', '8642', '7531',
];

let codeIndex = 0;
const usedCodes = new Set<string>();
const claimedByAddress = new Map<string, string>();

/**
 * Get the next available code from the pool.
 * If address is provided, applies rate limiting (1 code per address for NFT verification).
 * If address is not provided, distributes without rate limiting (for Stripe webhook).
 * In production, this would fetch from kolektyw3's external service.
 */
export function getNextCode(address?: string): string | null {
  // Apply rate limiting only if address is provided (NFT verification path)
  if (address) {
    const normalizedAddress = address.toLowerCase();
    if (claimedByAddress.has(normalizedAddress)) {
      console.warn(`Address ${address} already claimed a code`);
      return null;
    }
  }

  if (codeIndex >= MOCK_CODES.length) {
    console.warn('Code pool exhausted');
    return null;
  }

  const code = MOCK_CODES[codeIndex];
  codeIndex++;
  usedCodes.add(code);

  // Track address if provided (NFT path only)
  if (address) {
    claimedByAddress.set(address.toLowerCase(), code);
  }

  return code;
}

/**
 * Check if a code is valid and used
 */
export function isCodeUsed(code: string): boolean {
  return usedCodes.has(code);
}

/**
 * Check if an address has already claimed a code
 */
export function hasClaimedCode(address: string): boolean {
  return claimedByAddress.has(address.toLowerCase());
}

/**
 * Get code claimed by an address (for verification)
 */
export function getClaimedCode(address: string): string | null {
  return claimedByAddress.get(address.toLowerCase()) || null;
}

/**
 * Get remaining codes (for admin/debugging)
 */
export function getRemainingCodeCount(): number {
  return MOCK_CODES.length - codeIndex;
}

/**
 * Reset pool (for testing)
 */
export function resetCodePool(): void {
  codeIndex = 0;
  usedCodes.clear();
  claimedByAddress.clear();
}
