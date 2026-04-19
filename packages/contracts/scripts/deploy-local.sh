#!/bin/bash
set -e

# Load .env if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

echo "🚀 Deploying Kolektyw3AccessNFT to Anvil..."
echo ""

# Anvil defaults
ANVIL_RPC="${ANVIL_RPC:-http://127.0.0.1:8545}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb476cac3549df72e06522651e835}"
TREASURY="${TREASURY_ADDRESS:-0x70997970C51812e339D9B73b0245ad59E1ff86f0}"
OWNER="${OWNER_ADDRESS:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}"
# PERMIT2="${PERMIT2_ADDRESS:-0x000000000022D473030F116dFC393097967dFd67}"
USDC="${USDC_ADDRESS_SEPOLIA:-0x833589fCD6eDb6E08f4c7C32D4f71b1566469c18}"

echo "Configuration:"
echo "  RPC:       $ANVIL_RPC"
echo "  Treasury:  $TREASURY"
echo "  Owner:     $OWNER"
# echo "  Permit2:   $PERMIT2"
echo "  USDC:      $USDC"
echo ""

# Compile
echo "📦 Compiling contracts..."
forge build --silent

# Deploy
echo "⛓️  Deploying to Anvil..."
DEPLOYMENT=$(forge create src/Kolektyw3AccessNFT.sol:Kolektyw3AccessNFT \
  --broadcast \
  --json \
  --rpc-url $ANVIL_RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args $USDC $TREASURY $OWNER
)

CONTRACT_ADDRESS=$(echo $DEPLOYMENT | jq -r '.deployedTo')

echo ""
echo "✅ Deployment successful!"
echo ""
echo "Contract Address: $CONTRACT_ADDRESS"
echo ""
echo "📝 Add to frontend .env.local:"
echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
echo ""
echo "🧪 Quick tests:"
echo ""
echo "Check membership:"
echo "  cast call $CONTRACT_ADDRESS 'hasMembership(address)(bool)' $OWNER --rpc-url $ANVIL_RPC"
echo ""
echo "Check price:"
echo "  cast call $CONTRACT_ADDRESS 'membershipPrice()(uint256)' --rpc-url $ANVIL_RPC"
echo ""
echo "✨ Ready to test!"
