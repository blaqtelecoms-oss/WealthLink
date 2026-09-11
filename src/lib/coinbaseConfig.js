// Chain configurations for Coinbase Wallet integration
export const CHAINS = {
  8453: {
    id: 8453,
    name: 'Base',
    hexChainId: '0x2105',
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: 'ETH',
  },
  1: {
    id: 1,
    name: 'Ethereum',
    hexChainId: '0x1',
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: 'ETH',
  },
};

// Token configurations per chain (contract addresses for ERC-20 tokens)
export const TOKENS = {
  8453: {
    ETH: { symbol: 'ETH', name: 'Ether', decimals: 18, contractAddress: null },
    USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  },
  1: {
    ETH: { symbol: 'ETH', name: 'Ether', decimals: 18, contractAddress: null },
    USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  },
};

// Convert a decimal amount string to hex wei using BigInt (no floating point)
export function toWeiHex(amount, decimals = 18) {
  const clean = String(amount || '0').trim();
  if (!clean || clean === '.') return '0x0';
  const [whole, fraction = ''] = clean.split('.');
  const safeWhole = (whole || '0').replace(/^0+/, '') || '0';
  const fractionPadded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  const wei = BigInt(safeWhole) * BigInt(10) ** BigInt(decimals) + BigInt(fractionPadded || '0');
  return '0x' + wei.toString(16);
}

// Convert a hex wei string to a decimal number (no floating-point loss for display)
export function fromWeiHex(hex, decimals = 18) {
  if (!hex || hex === '0x') return 0;
  try {
    const big = BigInt(hex);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = big / divisor;
    const fraction = big % divisor;
    const wholeStr = whole.toString();
    const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    return fractionStr ? parseFloat(`${wholeStr}.${fractionStr}`) : Number(wholeStr);
  } catch (e) {
    return 0;
  }
}

// Encode an ERC-20 balanceOf(address) call
export function encodeBalanceOf(address) {
  return '0x70a08231' + address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

// Encode ERC-20 transfer(address,uint256) call
export function encodeTransfer(recipient, amountWeiHex) {
  const cleanRecipient = recipient.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const cleanAmount = amountWeiHex.replace(/^0x/, '').padStart(64, '0');
  return '0xa9059cbb' + cleanRecipient + cleanAmount;
}

// Truncate an Ethereum address for display
export function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Get block explorer URL for a transaction hash
export function getExplorerUrl(chainId, txHash) {
  const chain = CHAINS[chainId];
  if (!chain || !txHash) return '';
  return `${chain.explorerUrl}/tx/${txHash}`;
}

// Parse hex chainId to integer
export function parseChainId(hex) {
  return parseInt(hex, 16);
}

// Validate an Ethereum address
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}