import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/lib/supabaseData';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/simulation';
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Link2,
  AlertTriangle,
} from 'lucide-react';

const LUNO_ASSETS = [
  { asset: 'USDC', coingecko: 'usd-coin', evm: true, dp: 2, stable: true },
  { asset: 'USDT', coingecko: 'tether', evm: true, dp: 2, stable: true },
  { asset: 'ETH', coingecko: 'ethereum', evm: true, dp: 6, stable: false },
  { asset: 'BTC', coingecko: 'bitcoin', evm: false, dp: 6, stable: false },
  { asset: 'XRP', coingecko: 'ripple', evm: false, dp: 6, stable: false },
  { asset: 'SOL', coingecko: 'solana', evm: false, dp: 6, stable: false },
];

function truncateAddress(addr) {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function LunoPaymentForm({
  user,
  planSelection,
  treasuryAddress,
  canInvest,
  kycBlocked,
  onDone,
}) {
  const { toast } = useToast();
  const [connection, setConnection] = useState(null);
  const [balances, setBalances] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [sendState, setSendState] = useState('idle');
  const [sendError, setSendError] = useState(null);
  const [txRef, setTxRef] = useState(null);

  const usdAmount = planSelection?.amount || 0;
  const isEvmTreasury = typeof treasuryAddress === 'string' && treasuryAddress.startsWith('0x');

  const loadLuno = async () => {
    setLoading(true);
    try {
      const conns = await base44.entities.LunoConnection.filter({ member_id: user?.id });
      setConnection(conns[0] || null);
      if (conns[0]?.status === 'CONNECTED') {
        const res = await base44.functions.invoke('lunoBalance', {});
        if (res?.data?.balances) setBalances(res.data.balances);
      }
      try {
        const ids = LUNO_ASSETS.map((a) => a.coingecko).join(',');
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
        );
        const d = await r.json();
        const map = {};
        for (const a of LUNO_ASSETS) {
          map[a.asset] = a.stable ? 1 : d[a.coingecko]?.usd || 0;
        }
        setPrices(map);
      } catch (_) {
        /* prices unavailable */
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLuno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const connected = connection?.status === 'CONNECTED';

  // Available assets: supported, held with balance > 0, and EVM-compatible if treasury is EVM
  const availableAssets = LUNO_ASSETS.filter((a) => {
    const bal = balances.find((b) => b.asset === a.asset);
    return bal && bal.balance > 0;
  });

  const selectableAssets = availableAssets.filter((a) =>
    isEvmTreasury ? a.evm : true
  );

  const disabledNonEvm = availableAssets.filter((a) => isEvmTreasury && !a.evm);

  const assetMeta = LUNO_ASSETS.find((a) => a.asset === selectedAsset);
  const price = assetMeta ? prices[assetMeta.asset] : 0;
  const sendAmount =
    assetMeta && price > 0 ? usdAmount / price : 0;
  const balance = balances.find((b) => b.asset === selectedAsset)?.balance || 0;
  const insufficient = sendAmount > balance;
  const formValid =
    connected && !!selectedAsset && price > 0 && sendAmount > 0 && !insufficient;

  const handleSend = async () => {
    if (!formValid) return;
    setSendState('sending');
    setSendError(null);
    try {
      const sendRes = await base44.functions.invoke('lunoSend', {
        asset: selectedAsset,
        amount: String(sendAmount.toFixed(assetMeta.dp)),
        recipient: treasuryAddress,
      });
      const reference =
        sendRes?.data?.reference || sendRes?.data?.transaction_reference || '';
      if (!reference) throw new Error('No transaction reference returned');
      setTxRef(reference);

      try {
        await base44.functions.invoke('createInvestment', {
          amount: usdAmount,
          planName: planSelection.plan.name,
          periodDays: planSelection.period,
          transactionReference: reference,
        });
        setSendState('confirmed');
        toast({
          title: 'Investment submitted',
          description: 'Payment sent from your Luno account.',
        });
        onDone?.();
      } catch (invErr) {
        setSendState('failed');
        setSendError(
          `Payment sent but investment recording failed: ${invErr.message}. Contact support with ref ${reference.slice(0, 14)}…`
        );
      }
    } catch (err) {
      setSendState('failed');
      setSendError(err.message || 'Luno send failed.');
    }
  };

  const reset = () => {
    setSendState('idle');
    setSendError(null);
    setTxRef(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-xl border border-[#3b4658] bg-[#172235] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          Your Luno account isn't connected yet.
        </div>
        <p className="text-xs text-slate-500">
          Connect your Luno account in the Crypto Center to pay for investments directly from your Luno balance.
        </p>
        <Link
          to="/coinbase"
          className="inline-flex items-center gap-2 rounded-lg border border-[#c5a059]/30 px-3 py-2 text-xs font-semibold text-[#d4af37] hover:bg-[#c5a059]/10"
        >
          <Link2 className="h-3.5 w-3.5" /> Connect Luno →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Luno source box */}
      <div className="rounded-xl border border-[#3b4658] bg-[#172235] p-[17px_20px]">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="w-[26px] h-[26px] rounded-full grid place-items-center bg-[#8bd6c1] text-[#10201f] text-[13px] font-extrabold">
            L
          </span>
          <span className="text-sm font-semibold text-[#e8edf5]">Luno</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#9aa8bb]">Send from</span>
          <span className="font-semibold text-[#f8fafc]">Luno account</span>
        </div>
        <div className="mt-3.5 rounded-lg border border-[#3b4658] bg-[#0d1727] px-3 py-3 text-[11px] leading-relaxed text-[#aebbd0] font-mono break-all">
          To (treasury): {truncateAddress(treasuryAddress)}
        </div>
      </div>

      {/* Asset selector */}
      <div>
        <label className="block mb-2.5 text-sm font-semibold text-[#cbd5e1]">
          Select asset
        </label>
        {selectableAssets.length === 0 ? (
          <p className="text-xs text-slate-500">
            You don't hold any supported assets in your Luno account. Deposit USDC, USDT, or ETH to invest via Luno.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {selectableAssets.map((a) => {
              const bal = balances.find((b) => b.asset === a.asset)?.balance || 0;
              const selected = selectedAsset === a.asset;
              return (
                <button
                  key={a.asset}
                  type="button"
                  onClick={() => {
                    setSelectedAsset(a.asset);
                    reset();
                  }}
                  className={`min-h-[72px] rounded-[10px] border p-3 text-left transition-all ${
                    selected
                      ? 'border-[#d6a84f] bg-[#332a19] text-[#f2c96d] shadow-[0_0_0_1px_rgba(214,168,79,0.22)]'
                      : 'border-[#3b4658] bg-[#1b293d] text-[#b9c5d5] hover:border-[#d6a84f] hover:bg-[#27364b] hover:text-white'
                  }`}
                >
                  <span className="block text-[15px] font-semibold">{a.asset}</span>
                  <span className="block mt-1 text-[11px] text-[#8493a8]">
                    Bal: {bal.toFixed(a.dp)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {disabledNonEvm.length > 0 && (
          <p className="mt-2.5 text-xs text-slate-500">
            {disabledNonEvm.map((a) => a.asset).join(', ')} are disabled because the treasury is an EVM address.
          </p>
        )}
      </div>

      {/* USD equivalent + send amount */}
      {selectedAsset && price > 0 && sendAmount > 0 && (
        <div className="rounded-xl border border-[#3b4658] bg-[#172235] p-[18px_20px] text-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#9aa8bb]">USD equivalent</span>
            <span className="font-semibold text-[#f8fafc]">{formatCurrency(usdAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9aa8bb]">You'll send</span>
            <span className="font-semibold text-[#e4b85d]">
              {sendAmount.toFixed(assetMeta.dp)} {selectedAsset}
            </span>
          </div>
          {insufficient && (
            <p className="text-xs text-rose-300">
              Insufficient Luno balance (have {balance.toFixed(assetMeta.dp)} {selectedAsset}).
            </p>
          )}
        </div>
      )}

      {/* Payment summary */}
      {selectedAsset && formValid && sendState === 'idle' && (
        <div className="rounded-xl border border-[#3b4658] bg-[#0d1727] p-4 space-y-3 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-[.13em] text-[#7f8da2]">
            Payment summary
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[#9aa8bb]">From</span>
            <span className="font-semibold text-[#f8fafc]">Luno</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9aa8bb]">To (treasury)</span>
            <span className="font-mono text-[#f8fafc]">{truncateAddress(treasuryAddress)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9aa8bb]">Amount</span>
            <span className="font-semibold text-[#f8fafc]">
              {sendAmount.toFixed(assetMeta.dp)} {selectedAsset}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9aa8bb]">Network</span>
            <span className="font-semibold text-[#f8fafc]">Luno</span>
          </div>
        </div>
      )}

      {/* Status banners */}
      {sendState === 'sending' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Sending from your Luno account…
        </div>
      )}
      {sendState === 'confirmed' && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> Payment sent! Your investment is being processed.
          </div>
          {txRef && (
            <p className="mt-2 text-xs text-slate-400 font-mono break-all">Ref: {txRef}</p>
          )}
          <button
            onClick={reset}
            className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs text-slate-400 hover:text-white"
          >
            Make another investment
          </button>
        </div>
      )}
      {sendState === 'failed' && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-rose-300">
            <XCircle className="h-4 w-4" /> {sendError || 'Transaction failed.'}
          </div>
          {txRef && (
            <p className="mt-2 text-xs text-slate-400 font-mono break-all">Ref: {txRef}</p>
          )}
          <button
            onClick={reset}
            className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs text-slate-400 hover:text-white"
          >
            Try again
          </button>
        </div>
      )}

      {/* Confirm button */}
      {sendState === 'idle' && (
        <button
          onClick={handleSend}
          disabled={!canInvest || kycBlocked || !formValid}
          className="w-full rounded-[10px] bg-[#d6a84f] text-[#17120a] py-4 text-[15px] font-bold transition-all hover:bg-[#e4b85d] hover:shadow-[0_8px_18px_rgba(214,168,79,0.2)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> Confirm investment
          </span>
        </button>
      )}
    </div>
  );
}