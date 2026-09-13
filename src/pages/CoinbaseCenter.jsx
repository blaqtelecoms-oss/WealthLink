import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/lib/supabaseData';
import { useAuth } from '@/lib/AuthContext';
import { useCoinbaseWallet } from '@/hooks/useCoinbaseWallet';
import { CHAINS, TOKENS, toWeiHex, encodeTransfer, getExplorerUrl, isValidAddress, truncateAddress } from '@/lib/coinbaseConfig';
import PageHeader from '@/components/wealth/PageHeader';
import BackButton from '@/components/wealth/BackButton';
import StatusPill from '@/components/wealth/StatusPill';
import SecurityNotice from '@/components/wealth/SecurityNotice';
import WalletCard from '@/components/coinbase/WalletCard';
import BalanceCard from '@/components/coinbase/BalanceCard';
import PaymentForm from '@/components/coinbase/PaymentForm';
import TransactionStatus from '@/components/coinbase/TransactionStatus';
import LunoSection from '@/components/luno/LunoSection';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Send, Loader2, ArrowRight, History, Settings2, ExternalLink, KeyRound } from 'lucide-react';

export default function CoinbaseCenter() {
  const { user } = useAuth();
  const { address, chainId, connecting, error, connect, disconnect, switchChain, sendTransaction, getTransactionReceipt, getBalances, setError } = useCoinbaseWallet();

  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('ETH');
  const [selectedChainId, setSelectedChainId] = useState(8453);

  const [txState, setTxState] = useState('idle');
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [currentTxRecord, setCurrentTxRecord] = useState(null);

  const [balances, setBalances] = useState(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const loadBalances = async () => {
    if (!address || !chainId) { setBalances(null); return; }
    setBalancesLoading(true);
    try {
      setBalances(await getBalances(chainId));
    } catch (e) {
      setBalances(null);
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => { loadBalances(); }, [address, chainId]);

  useEffect(() => {
    Promise.all([
      base44.entities.CoinbaseConfig.list('-updated_date', 1),
      base44.entities.CoinbaseTransaction.filter({ member_id: user?.id }),
    ]).then(([configs, txns]) => {
      const cfg = configs[0];
      setConfig(cfg);
      if (cfg?.default_chain_id) setSelectedChainId(cfg.default_chain_id);
      setHistory(txns);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const refreshHistory = () => {
    base44.entities.CoinbaseTransaction.filter({ member_id: user?.id }).then(setHistory);
  };

  const supportedTokens = config?.supported_tokens?.split(',').map((s) => s.trim()) || ['ETH', 'USDC'];
  const tokens = TOKENS[selectedChainId] || {};
  const activeToken = tokens[tokenSymbol];
  const isConnected = !!address;
  const isWrongNetwork = isConnected && chainId !== selectedChainId;
  const formValid = isValidAddress(recipient) && Number(amount) > 0 && !!activeToken;

  // Poll for transaction receipt
  useEffect(() => {
    if (txState !== 'broadcast' || !txHash) return;
    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 60; i++) {
        if (cancelled) return;
        try {
          const receipt = await getTransactionReceipt(txHash);
          if (receipt) {
            if (cancelled) return;
            const success = receipt.status === '0x1';
            setTxState(success ? 'confirmed' : 'failed');
            if (!success) setTxError('Transaction failed on-chain.');
            if (currentTxRecord) {
              await base44.entities.CoinbaseTransaction.update(currentTxRecord, {
                status: success ? 'CONFIRMED' : 'FAILED',
                confirmed_at: success ? new Date().toISOString() : undefined,
              });
            }
            refreshHistory();
            loadBalances();
            return;
          }
        } catch (e) { /* keep polling */ }
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (!cancelled) {
        setTxState('failed');
        setTxError('Confirmation timed out. Check the block explorer for the latest status.');
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [txState, txHash, currentTxRecord, getTransactionReceipt]);

  const handleSend = async () => {
    if (!isConnected) { connect(); return; }
    if (isWrongNetwork) { switchChain(selectedChainId); return; }
    if (!formValid) return;

    setTxState('awaiting_approval');
    setTxError(null);

    try {
      const weiHex = toWeiHex(amount, activeToken.decimals);
      const txParams = activeToken.contractAddress
        ? { from: address, to: activeToken.contractAddress, data: encodeTransfer(recipient, weiHex) }
        : { from: address, to: recipient, value: weiHex };

      const hash = await sendTransaction(txParams);
      setTxHash(hash);
      setTxState('broadcast');

      const record = await base44.entities.CoinbaseTransaction.create({
        member_id: user.id,
        wallet_address: address,
        chain_id: selectedChainId,
        chain_name: CHAINS[selectedChainId].name,
        token_symbol: tokenSymbol,
        amount,
        recipient_address: recipient,
        token_contract_address: activeToken.contractAddress || '',
        transaction_hash: hash,
        status: 'PENDING',
        block_explorer_url: getExplorerUrl(selectedChainId, hash),
        timestamp: new Date().toISOString(),
      });
      setCurrentTxRecord(record.id);
      refreshHistory();
    } catch (err) {
      setTxState('failed');
      setTxError(err.message || 'Transaction rejected.');
    }
  };

  const resetTx = () => {
    setTxState('idle');
    setTxHash(null);
    setTxError(null);
    setCurrentTxRecord(null);
  };

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#d4af37]" /></div>;

  const ctaLabel = !isConnected ? 'Connect Wallet' : isWrongNetwork ? `Switch to ${CHAINS[selectedChainId].name}` : !formValid ? 'Enter payment details' : 'Confirm Payment';
  const ctaDisabled = (isConnected && !isWrongNetwork && !formValid) || txState === 'awaiting_approval' || txState === 'broadcast';
  const ctaBusy = connecting || txState === 'awaiting_approval';

  return (
    <>
      <BackButton to="/" />
      <PageHeader eyebrow="Crypto Center" title="Crypto Center" description="Connect your Luno exchange account and your Coinbase self-custody wallet. Send crypto, view balances, and track activity across both integrations." action={<StatusPill value={isConnected ? 'CONNECTED' : 'NOT_CONNECTED'} />} />

      <div className="mb-6 rounded-2xl border border-white/10 bg-[#0b1525] p-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4af37]">Luno — Getting started</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Don't have a Luno account yet? You'll need one to connect your exchange and fund your investments. Once your account is set up, generate an API key to link it here.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://www.luno.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#c5a059]/20 bg-[#c5a059]/5 px-4 py-2.5 text-sm font-medium text-[#d4af37] transition hover:border-[#c5a059]/40 hover:bg-[#c5a059]/10">
            <ExternalLink className="h-4 w-4" /> Create a Luno account
          </a>
          <a href="https://www.luno.com/en-za/api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[.06]">
            <KeyRound className="h-4 w-4" /> Get your Luno API credentials
          </a>
        </div>
      </div>

      <LunoSection user={user} />

      <div className="mt-8 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4af37]">Coinbase — Self-custody Wallet</h2>
      </div>

      <SecurityNotice title="Self-custody payments">
        WealthLink never holds your funds, private keys, or recovery phrase. All transactions are signed and approved by you in your own Coinbase Wallet. Always verify the recipient address and amount before confirming.
      </SecurityNotice>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <div className="space-y-5">
          <WalletCard address={address} chainId={chainId} connecting={connecting} onConnect={connect} onDisconnect={disconnect} />
          <BalanceCard balances={balances} loading={balancesLoading} chainId={chainId} onRefresh={loadBalances} isConnected={!!address} />

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {isWrongNetwork && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Your wallet is on {CHAINS[chainId]?.name || 'an unknown network'}. Switch to {CHAINS[selectedChainId].name} to continue.
            </div>
          )}

          <PaymentForm recipient={recipient} amount={amount} tokenSymbol={tokenSymbol} selectedChainId={selectedChainId} onChange={(field, val) => {
            if (field === 'selectedChainId') { setSelectedChainId(val); setTokenSymbol('ETH'); setError(null); }
            else if (field === 'tokenSymbol') setTokenSymbol(val);
            else if (field === 'recipient') setRecipient(val);
            else if (field === 'amount') setAmount(val);
          }} />

          {isConnected && !isWrongNetwork && formValid && txState === 'idle' && (
            <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-6">
              <h3 className="text-sm font-semibold text-white">Payment summary</h3>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="From" value={truncateAddress(address)} />
                <Row label="To" value={truncateAddress(recipient)} />
                <Row label="Amount" value={`${amount} ${tokenSymbol}`} />
                <Row label="Network" value={CHAINS[selectedChainId].name} />
              </div>
            </div>
          )}

          <Button className="w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]" size="lg" onClick={handleSend} disabled={ctaDisabled || ctaBusy}>
            {ctaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : isWrongNetwork ? <ArrowRight className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {ctaBusy ? (txState === 'awaiting_approval' ? 'Awaiting approval...' : 'Connecting...') : ctaLabel}
          </Button>

          <TransactionStatus txState={txState} txHash={txHash} txError={txError} chainId={selectedChainId} recipient={recipient} amount={amount} tokenSymbol={tokenSymbol} onReset={resetTx} />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#d4af37]" />
              <h2 className="text-sm font-semibold text-white">Recent payments</h2>
            </div>
            <div className="mt-3 space-y-2">
              {history.length ? history.slice(0, 10).map((tx) => (
                <div key={tx.id} className="rounded-lg border border-white/10 bg-[#07101d] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{tx.amount} {tx.token_symbol}</span>
                    <StatusPill value={tx.status} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500">{truncateAddress(tx.recipient_address)}</p>
                  {tx.block_explorer_url && (
                    <a href={tx.block_explorer_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-[#d4af37] hover:underline">
                      View on explorer →
                    </a>
                  )}
                </div>
              )) : <p className="py-6 text-center text-sm text-slate-500">No payments yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-5">
            <h2 className="text-sm font-semibold text-white">Supported tokens</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {supportedTokens.map((sym) => <li key={sym} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" /> {sym} on {CHAINS[selectedChainId].name}</li>)}
            </ul>
          </div>

          {(user?.role === 'admin' || ['ADMIN','SUPER_ADMIN','FINANCE_ADMIN','COMPLIANCE_OFFICER'].includes(user?.app_role)) && (
            <Link to="/coinbase/admin" className="group flex items-center justify-between rounded-2xl border border-[#c5a059]/15 bg-[#c5a059]/5 p-4 transition hover:border-[#c5a059]/30">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-[#d4af37]" />
                <div>
                  <p className="text-sm font-semibold text-white">Admin settings</p>
                  <p className="text-xs text-slate-500">Configure network, tokens & audit trail</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-[#d4af37]" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between"><span className="text-slate-500">{label}</span><span className="font-mono text-slate-200">{value}</span></div>;
}