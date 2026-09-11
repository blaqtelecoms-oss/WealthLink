import { useState, useEffect, useCallback, useRef } from 'react';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { CHAINS, TOKENS, parseChainId, fromWeiHex, encodeBalanceOf } from '@/lib/coinbaseConfig';

let sdk = null;
let provider = null;

function getProvider() {
  if (provider) return provider;
  if (!sdk) {
    sdk = new CoinbaseWalletSDK({
      appName: 'WealthLink Partner Network',
      appChainIds: [8453, 1],
    });
  }
  provider = sdk.makeWeb3Provider();
  return provider;
}

export function useCoinbaseWallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const listenersAttached = useRef(false);

  const attachListeners = useCallback(() => {
    if (listenersAttached.current) return;
    const p = getProvider();
    p.on('accountsChanged', (accounts) => {
      setAddress(accounts[0] || null);
      if (!accounts[0]) setChainId(null);
    });
    p.on('chainChanged', (hex) => setChainId(parseChainId(hex)));
    p.on('disconnect', () => { setAddress(null); setChainId(null); });
    listenersAttached.current = true;
  }, []);

  // Silently check if already connected (no popup)
  useEffect(() => {
    let cancelled = false;
    const p = getProvider();
    attachListeners();
    p.request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (cancelled || !accounts[0]) return;
        setAddress(accounts[0]);
        return p.request({ method: 'eth_chainId' }).then((hex) => setChainId(parseChainId(hex)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [attachListeners]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const p = getProvider();
      attachListeners();
      const accounts = await p.request({ method: 'eth_requestAccounts' });
      const hexChain = await p.request({ method: 'eth_chainId' });
      setAddress(accounts[0]);
      setChainId(parseChainId(hexChain));
    } catch (err) {
      setError(err.message || 'Connection rejected');
    } finally {
      setConnecting(false);
    }
  }, [attachListeners]);

  const disconnect = useCallback(() => {
    try {
      const p = getProvider();
      if (p.disconnect) p.disconnect();
    } catch (e) { /* ignore */ }
    setAddress(null);
    setChainId(null);
  }, []);

  const switchChain = useCallback(async (targetChainId) => {
    const chain = CHAINS[targetChainId];
    if (!chain) return;
    try {
      const p = getProvider();
      await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chain.hexChainId }] });
      setChainId(targetChainId);
    } catch (err) {
      if (err.code === 4902) {
        setError(`Please add ${chain.name} network to your wallet first.`);
      } else {
        setError(err.message || 'Failed to switch network');
      }
    }
  }, []);

  const sendTransaction = useCallback(async (txParams) => {
    const p = getProvider();
    return await p.request({ method: 'eth_sendTransaction', params: [txParams] });
  }, []);

  const getTransactionReceipt = useCallback(async (txHash) => {
    const p = getProvider();
    return await p.request({ method: 'eth_getTransactionReceipt', params: [txHash] });
  }, []);

  // Fetch live on-chain balances (native ETH + USDC) for the active chain
  const getBalances = useCallback(async (targetChainId) => {
    if (!address) return null;
    const chain = CHAINS[targetChainId];
    if (!chain) return null;
    const p = getProvider();
    const result = { ETH: null, USDC: null };
    try {
      const hex = await p.request({ method: 'eth_getBalance', params: [address, 'latest'] });
      result.ETH = fromWeiHex(hex, 18);
    } catch (e) { /* ignore */ }
    const usdc = TOKENS[targetChainId]?.USDC;
    if (usdc?.contractAddress) {
      try {
        const hex = await p.request({
          method: 'eth_call',
          params: [{ to: usdc.contractAddress, data: encodeBalanceOf(address) }, 'latest'],
        });
        result.USDC = fromWeiHex(hex, usdc.decimals);
      } catch (e) { /* ignore */ }
    }
    return result;
  }, [address]);

  return { address, chainId, connecting, error, connect, disconnect, switchChain, sendTransaction, getTransactionReceipt, getBalances, setError };
}