#!/bin/bash
set -e

NETWORK="${1:-local}"

# Load .env if present
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

case "$NETWORK" in
  local)
    RPC="${ANVIL_RPC:-http://127.0.0.1:8545}"
    PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb476cac3549df72e06522651e835}"
    export USDC_ADDRESS="${USDC_ADDRESS:-0x833589FCd6edb6E08F4c7C32d4f71B1566469C18}"
    export TREASURY_ADDRESS="${TREASURY_ADDRESS:-0x70997970C51812e339D9B73b0245Ad59E1FF86f0}"
    export OWNER_ADDRESS="${OWNER_ADDRESS:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}"
    VERIFY=""
    ;;
  sepolia|base-sepolia)
    RPC="${BASE_SEPOLIA_RPC:-https://sepolia.base.org}"
    PRIVATE_KEY="${PRIVATE_KEY:?PRIVATE_KEY required for testnet}"
    export USDC_ADDRESS="${USDC_ADDRESS:-0x036CbD53842c5426634e7929541eC2318f3dCF7e}"
    export TREASURY_ADDRESS="${TREASURY_ADDRESS:?TREASURY_ADDRESS required}"
    export OWNER_ADDRESS="${OWNER_ADDRESS:?OWNER_ADDRESS required}"
    VERIFY="${ETHERSCAN_API_KEY:+--verify --etherscan-api-key $ETHERSCAN_API_KEY}"
    ;;
  mainnet|base)
    RPC="${BASE_MAINNET_RPC:-https://mainnet.base.org}"
    PRIVATE_KEY="${PRIVATE_KEY:?PRIVATE_KEY required for mainnet}"
    export USDC_ADDRESS="${USDC_ADDRESS:-0x833589FCd6edb6E08F4c7C32d4f71B1566469C18}"
    export TREASURY_ADDRESS="${TREASURY_ADDRESS:?TREASURY_ADDRESS required}"
    export OWNER_ADDRESS="${OWNER_ADDRESS:?OWNER_ADDRESS required}"
    VERIFY="${ETHERSCAN_API_KEY:+--verify --etherscan-api-key $ETHERSCAN_API_KEY}"
    ;;
  *)
    echo "Usage: $0 [local|sepolia|mainnet]"
    exit 1
    ;;
esac

echo "🚀 Deploying Kolektyw3AccessNFT to: $NETWORK"
echo ""
echo "Configuration:"
echo "  RPC:      $RPC"
echo "  USDC:     $USDC_ADDRESS"
echo "  Treasury: $TREASURY_ADDRESS"
echo "  Owner:    $OWNER_ADDRESS"
echo ""

forge build --silent

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  $VERIFY

echo ""
echo "✅ Done! Find the deployed address above (\"Deployed to:\")."
echo ""
echo "📝 Add to frontend .env.local:"
echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=<address above>"
echo "   NEXT_PUBLIC_CHAIN_ID=$([ "$NETWORK" = "mainnet" ] || [ "$NETWORK" = "base" ] && echo 8453 || ([ "$NETWORK" = "local" ] && echo 31337 || echo 84532))"
