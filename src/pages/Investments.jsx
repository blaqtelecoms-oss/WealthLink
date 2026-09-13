import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/lib/supabaseData';
import { useAuth } from '@/lib/AuthContext';
import { useCoinbaseWallet } from '@/hooks/useCoinbaseWallet';
import {
  CHAINS,
  TOKENS,
  toWeiHex,
  encodeTransfer,
  getExplorerUrl,
  isValidAddress,
  truncateAddress,
} from '@/lib/coinbaseConfig';
import { formatCurrency } from '@/lib/simulation';
import PageHeader from '@/components/wealth/PageHeader';
import LiveInvestmentCard from '@/components/wealth/LiveInvestmentCard';
import PlanSelector from '@/components/wealth/PlanSelector';
import Disclaimer from '@/components/wealth/Disclaimer';
import EmptyState from '@/components/wealth/EmptyState';
import LunoPaymentForm from '@/components/wealth/LunoPaymentForm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  Loader2,
  Send,
  ArrowRight,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react';

export default function Investments() {
  const { user } = useAuth();
  const {
    address,
    chainId,
    connecting,
    error,
    connect,
    disconnect,
    switchChain,
    sendTransaction,
    getTransactionReceipt,
    setError,
  } = useCoinbaseWallet();
  const { toast } = useToast();

  const [config, setConfig] = useState(null);
  const [incentiveConfig, setIncentiveConfig] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ethPrice, setEthPrice] = useState(null);
  const [zarRate, setZarRate] = useState(null);

  const [planSelection, setPlanSelection] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState('USDC');
  const [payMethod, setPayMethod] = useState('coinbase');

  const [txState, setTxState] = useState('idle');
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [currentTxRecord, setCurrentTxRecord] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.entities.CoinbaseConfig.list('-updated_date', 1),
      base44.entities.IncentiveConfiguration.list('-updated_date', 1),
      base44.entities.Investment.filter({ member_id: user?.id }),
      base44.entities.ExchangeRate.filter(
        { base_currency: 'USD', quote_currency: 'ZAR', is_active: true },
        '-effective_date',
        1
      ),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([configs, incConfigs, invs, rates, ethData]) => {
        if (cancelled) return;
        const nextConfig = configs[0] || {
          status: 'ACTIVE',
          default_chain_id: 8453,
          supported_tokens: 'ETH,USDC',
          treasury_wallet_address: '',
        };
        setConfig(nextConfig);
        setIncentiveConfig(incConfigs[0]);
        setInvestments(invs);
        if (rates[0]) setZarRate(rates[0].rate);
        if (ethData?.ethereum?.usd) setEthPrice(ethData.ethereum.usd);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const refreshInvestments = () => {
    base44.entities.Investment.filter({ member_id: user?.id }).then(setInvestments);
  };

  const selectedChainId = config?.default_chain_id || 8453;
  const treasuryAddress = config?.treasury_wallet_address;
  const isConfigActive = config?.status === 'ACTIVE';
  const hasTreasury = isValidAddress(treasuryAddress);
  const kycRequired = incentiveConfig?.kyc_required_for_investment !== false;
  const kycVerified = user?.kyc_status === 'VERIFIED';
  const canInvest = isConfigActive && hasTreasury && zarRate !== null;
  const kycBlocked = kycRequired && !kycVerified;
  const isConnected = !!address;
  const isWrongNetwork = isConnected && chainId !== selectedChainId;

  const amt = planSelection?.amount || 0;
  const usdAmount = amt;
  const token = TOKENS[selectedChainId]?.[tokenSymbol];
  const onChainAmount =
    tokenSymbol === 'USDC'
      ? usdAmount
      : ethPrice && usdAmount
      ? usdAmount / ethPrice
      : null;
  const formValid = planSelection && usdAmount > 0 && !!token && isValidAddress(treasuryAddress);

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
              try {
                await base44.entities.CoinbaseTransaction.update(currentTxRecord, {
                  status: success ? 'CONFIRMED' : 'FAILED',
                  confirmed_at: success ? new Date().toISOString() : undefined,
                });
              } catch (e) {
                /* admin may need to update manually */
              }
            }
            if (success) {
              try {
                await base44.functions.invoke('notifyPaymentConfirmed', { transactionReference: txHash });
              } catch (_) {
                /* email send is best-effort */
              }
            }
            refreshInvestments();
            return;
          }
        } catch (e) {
          /* keep polling */
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (!cancelled) {
        setTxState('failed');
        setTxError('Confirmation timed out. Check the block explorer for the latest status.');
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [txState, txHash, currentTxRecord, getTransactionReceipt]);

  const handlePlanSelected = (selection) => {
    setPlanSelection(selection);
    setTxState('idle');
    setTxHash(null);
    setTxError(null);
    setCurrentTxRecord(null);
  };

  const handleSend = async () => {
    if (!isConnected) {
      connect();
      return;
    }
    if (isWrongNetwork) {
      switchChain(selectedChainId);
      return;
    }
    if (!formValid) return;

    setTxState('awaiting_approval');
    setTxError(null);

    try {
      const weiHex = toWeiHex(onChainAmount, token.decimals);
      const txParams = token.contractAddress
        ? {
            from: address,
            to: token.contractAddress,
            data: encodeTransfer(treasuryAddress, weiHex),
          }
        : { from: address, to: treasuryAddress, value: weiHex };

      const hash = await sendTransaction(txParams);
      setTxHash(hash);
      setTxState('broadcast');

      const record = await base44.entities.CoinbaseTransaction.create({
        member_id: user.id,
        wallet_address: address,
        chain_id: selectedChainId,
        chain_name: CHAINS[selectedChainId].name,
        token_symbol: tokenSymbol,
        amount: String(onChainAmount),
        recipient_address: treasuryAddress,
        token_contract_address: token.contractAddress || '',
        transaction_hash: hash,
        status: 'PENDING',
        block_explorer_url: getExplorerUrl(selectedChainId, hash),
        timestamp: new Date().toISOString(),
      });
      setCurrentTxRecord(record.id);

      try {
        await base44.functions.invoke('createInvestment', {
          amount: amt,
          planName: planSelection.plan.name,
          periodDays: planSelection.period,
          transactionReference: hash,
        });
        toast({
          title: 'Investment submitted',
          description: 'Payment broadcast — awaiting on-chain confirmation.',
        });
        refreshInvestments();
      } catch (invErr) {
        setTxState('failed');
        setTxError(
          `Payment sent but investment recording failed: ${invErr.message}. Please contact support with tx ${hash.slice(0, 10)}…`
        );
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-[#d4af37] rounded-full animate-spin" />
      </div>
    );
  }

  const ctaLabel = !isConnected
    ? 'Connect Wallet'
    : isWrongNetwork
    ? `Switch to ${CHAINS[selectedChainId].name}`
    : !formValid
    ? 'Enter investment details'
    : 'Confirm & Pay';
  const ctaDisabled =
    !canInvest ||
    kycBlocked ||
    (isConnected && !isWrongNetwork && !formValid) ||
    txState === 'awaiting_approval' ||
    txState === 'broadcast';
  const ctaBusy = connecting || txState === 'awaiting_approval';

  return (
    <>
      <PageHeader
        eyebrow="Live investing"
        title="Investments"
        description="Fund your investment from your Coinbase Wallet or your connected Luno account. Choose a plan, pay, and track confirmation in real time."
      />

      <div className="space-y-6">
        {/* Daily growth banner */}
        <div className="rounded-2xl border border-[#c5a059]/20 bg-gradient-to-r from-[#c5a059]/10 to-transparent p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-[#d4af37] shrink-0" />
          <p className="text-sm font-medium text-white">
            Earn <span className="text-[#d4af37] font-bold">1.5% Daily Growth</span> — Invest Today. Grow Daily. Build Tomorrow.
          </p>
        </div>

        {/* Notices */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {!isConfigActive && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0" /> Live investing is not yet available. Please check back soon.
          </div>
        )}

        {isConfigActive && !hasTreasury && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0" /> The treasury wallet has not been configured yet. Investments are temporarily disabled.
          </div>
        )}

        {isConfigActive && hasTreasury && zarRate === null && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0" /> No active USD/ZAR exchange rate is configured. Investments are temporarily disabled until an administrator sets one.
          </div>
        )}

        {canInvest && kycBlocked && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-300">
              <ShieldAlert className="h-4 w-4 shrink-0" /> KYC verification is required before you can invest.
            </div>
            <Link
              to="/profile"
              className="shrink-0 rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/10"
            >
              Complete KYC →
            </Link>
          </div>
        )}

        {isWrongNetwork && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Your wallet is on {CHAINS[chainId]?.name || 'an unknown network'}. Switch to {CHAINS[selectedChainId].name} to continue.
          </div>
        )}

        {/* Investment cards — primary focus */}
        {investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investments yet"
            description="Choose a plan below and fund it from your Coinbase Wallet to get started."
          />
        ) : (
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#d4af37]">Your Investments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {investments.map((inv) => (
                <LiveInvestmentCard key={inv.id} investment={inv} />
              ))}
            </div>
          </div>
        )}

        {/* Plan selector */}
        <PlanSelector
          zarRate={zarRate}
          canInvest={canInvest}
          kycBlocked={kycBlocked}
          onSelect={handlePlanSelected}
        />

        {/* Payment form */}
        {planSelection && canInvest && (
          <div className="rounded-2xl border border-white/10 bg-[#0b1525] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Invest in {planSelection.plan.name} — {planSelection.period === 1 ? 'Daily' : `${planSelection.period} days`}
              </h3>
              <button
                onClick={() => {
                  setPlanSelection(null);
                  resetTx();
                }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>

            {/* Amount summary */}
            <div className="rounded-lg border border-[#c5a059]/20 bg-[#c5a059]/[.06] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Investment amount</span>
                <span className="font-semibold text-white">{formatCurrency(planSelection.amount)}</span>
              </div>
            </div>

            {/* Pay with tab toggle */}
            <div>
              <label className="block mb-2.5 text-sm font-semibold text-[#cbd5e1]">Pay with</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0b1220] border border-[#344155] rounded-[11px]">
                <button
                  type="button"
                  onClick={() => setPayMethod('coinbase')}
                  className={`rounded-[7px] py-3 px-3.5 text-sm font-semibold transition-all ${
                    payMethod === 'coinbase'
                      ? 'bg-[#d6a84f] text-[#17120a] shadow-[0_4px_12px_rgba(214,168,79,0.2)]'
                      : 'bg-transparent text-[#8d9bb0] hover:bg-[#253247] hover:text-[#f8fafc]'
                  }`}
                >
                  Coinbase Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('luno')}
                  className={`rounded-[7px] py-3 px-3.5 text-sm font-semibold transition-all ${
                    payMethod === 'luno'
                      ? 'bg-[#d6a84f] text-[#17120a] shadow-[0_4px_12px_rgba(214,168,79,0.2)]'
                      : 'bg-transparent text-[#8d9bb0] hover:bg-[#253247] hover:text-[#f8fafc]'
                  }`}
                >
                  Luno
                </button>
              </div>
            </div>

            {payMethod === 'luno' ? (
              <LunoPaymentForm
                user={user}
                planSelection={planSelection}
                treasuryAddress={treasuryAddress}
                canInvest={canInvest}
                kycBlocked={kycBlocked}
                onDone={refreshInvestments}
              />
            ) : (
              <>
            {/* Token selector */}
            <div>
              <label className="block mb-2.5 text-sm font-semibold text-[#cbd5e1]">Select asset</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTokenSymbol('USDC')}
                  className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                    tokenSymbol === 'USDC'
                      ? 'bg-[#c5a059] text-[#0a0e14]'
                      : 'bg-white/[.03] text-slate-400 hover:bg-white/[.06]'
                  }`}
                >
                  USDC
                  <span className="block text-[10px] font-normal opacity-70">≈ $1.00</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTokenSymbol('ETH')}
                  disabled={!ethPrice}
                  className={`py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    tokenSymbol === 'ETH'
                      ? 'bg-[#c5a059] text-[#0a0e14]'
                      : 'bg-white/[.03] text-slate-400 hover:bg-white/[.06]'
                  }`}
                >
                  ETH
                  <span className="block text-[10px] font-normal opacity-70">
                    {ethPrice ? `≈ $${ethPrice.toFixed(0)}` : 'unavailable'}
                  </span>
                </button>
              </div>
            </div>

            {/* USD equivalent + on-chain amount */}
            {usdAmount > 0 && onChainAmount > 0 && (
              <div className="rounded-lg border border-[#c5a059]/20 bg-[#c5a059]/[.06] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">USD equivalent</span>
                  <span className="font-semibold text-white">{formatCurrency(usdAmount)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-slate-400">You'll send</span>
                  <span className="font-semibold text-[#d4af37]">
                    {onChainAmount.toFixed(tokenSymbol === 'USDC' ? 2 : 6)} {tokenSymbol}
                  </span>
                </div>
              </div>
            )}

            {/* Payment summary */}
            {isConnected && !isWrongNetwork && formValid && txState === 'idle' && (
              <div className="rounded-xl border border-white/10 bg-[#07101d] p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment summary</p>
                <SummaryRow label="From" value={truncateAddress(address)} />
                <SummaryRow label="To (treasury)" value={truncateAddress(treasuryAddress)} />
                <SummaryRow label="Amount" value={`${onChainAmount.toFixed(tokenSymbol === 'USDC' ? 2 : 6)} ${tokenSymbol}`} />
                <SummaryRow label="Network" value={CHAINS[selectedChainId].name} />
              </div>
            )}

            {/* Transaction status */}
            {txState !== 'idle' && (
              <TxStatusBanner
                txState={txState}
                txHash={txHash}
                txError={txError}
                chainId={selectedChainId}
                onReset={resetTx}
              />
            )}

            {/* Confirm button */}
            {txState === 'idle' && (
              <Button
                className="w-full bg-[#c5a059] text-[#0a0e14] hover:bg-[#d4af37]"
                size="lg"
                onClick={handleSend}
                disabled={ctaDisabled || ctaBusy}
              >
                {ctaBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isWrongNetwork ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {ctaBusy
                  ? txState === 'awaiting_approval'
                    ? 'Awaiting wallet approval...'
                    : 'Connecting...'
                  : ctaLabel}
              </Button>
            )}
              </>
            )}
          </div>
        )}

        <Disclaimer text="Returns are modelled on crypto/forex market performance. Liquidity is available at maturity. Past performance does not guarantee future results. On-chain payments are irreversible — always verify the treasury address." />
      </div>
    </>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-200">{value}</span>
    </div>
  );
}

function TxStatusBanner({ txState, txHash, txError, chainId, onReset }) {
  if (txState === 'awaiting_approval') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
        <Loader2 className="h-4 w-4 animate-spin" /> Waiting for you to approve the transaction in your wallet…
      </div>
    );
  }
  if (txState === 'broadcast') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
        <Clock className="h-4 w-4" /> Payment broadcast — awaiting on-chain confirmation…
        {txHash && (
          <a
            href={getExplorerUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-[#d4af37] hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> View
          </a>
        )}
      </div>
    );
  }
  if (txState === 'confirmed') {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Payment confirmed! Your investment is being processed.
        </div>
        {txHash && (
          <a
            href={getExplorerUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[#d4af37] hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> View on explorer
          </a>
        )}
        <button
          onClick={onReset}
          className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs text-slate-400 hover:text-white"
        >
          Make another investment
        </button>
      </div>
    );
  }
  if (txState === 'failed') {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-rose-300">
          <XCircle className="h-4 w-4" /> {txError || 'Transaction failed.'}
        </div>
        {txHash && (
          <a
            href={getExplorerUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[#d4af37] hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> View on explorer
          </a>
        )}
        <button
          onClick={onReset}
          className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs text-slate-400 hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }
  return null;
}