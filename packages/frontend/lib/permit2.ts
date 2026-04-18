import { PERMIT2_ADDRESS, USDC_ADDRESS } from './contract';

interface PermitDetails {
  token: `0x${string}`;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
}

interface PermitSingle {
  details: PermitDetails;
  spender: `0x${string}`;
  sigDeadline: bigint;
}

export function getPermit2Types() {
  return {
    PermitSingle: [
      { name: 'details', type: 'TokenPermissions' },
      { name: 'spender', type: 'address' },
      { name: 'sigDeadline', type: 'uint256' },
    ],
    TokenPermissions: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint160' },
    ],
  };
}

export function getPermit2Domain(chainId: number) {
  return {
    name: 'Permit2',
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
  };
}

export function createPermitSingle(
  amount: bigint,
  spender: `0x${string}`,
  deadline?: bigint
): PermitSingle {
  const sig_deadline = deadline || BigInt(Math.floor(Date.now() / 1000) + 3600);

  const permitDetails: PermitDetails = {
    token: USDC_ADDRESS as `0x${string}`,
    amount,
    nonce: 0n,
    deadline: sig_deadline,
  };

  return {
    details: permitDetails,
    spender,
    sigDeadline: sig_deadline,
  };
}
