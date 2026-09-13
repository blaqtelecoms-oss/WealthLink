import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/lib/supabaseData';
import { useToast } from '@/components/ui/use-toast';
import StatusPill from '@/components/wealth/StatusPill';
import LunoConnectCard from '@/components/luno/LunoConnectCard';
import LunoBalances from '@/components/luno/LunoBalance';
import LunoSendForm from '@/components/luno/LunoSendForm';
import LunoHistory from '@/components/luno/LunoHistory';
import LunoPortfolioTotal from '@/components/luno/LunoPortfolioTotal';
import LunoExchangeTransactions from '@/components/luno/LunoExchangeTransactions';
import { Loader2, RefreshCw, LogOut } from 'lucide-react';

export default function LunoSection({ user }) {
  const { toast } = useToast();
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [balances, setBalances] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [exchangeTransactions, setExchangeTransactions] = useState([]);
  const [total, setTotal] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await base44.functions.invoke('lunoBalance', {});
      setBalances(res.data?.balances || []);
      setAddresses(res.data?.addresses || []);
      setTransactions(res.data?.transactions || []);
      setExchangeTransactions(res.data?.exchange_transactions || []);
      setTotal(res.data?.total || null);
    } catch (e) {
      setBalances([]);
      setAddresses([]);
      setTransactions([]);
      setExchangeTransactions([]);
      setTotal(null);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const conns = await base44.entities.LunoConnection.filter({ member_id: user?.id });
        setConnection(conns[0] || null);
      } catch (e) {
        setConnection(null);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (connection?.status === 'CONNECTED') loadData();
  }, [connection?.status, loadData]);

  const handleConnect = async (apiKeyId, apiSecret) => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('lunoConnect', { api_key_id: apiKeyId, api_secret: apiSecret });
      setConnection(res.data?.connection || { status: 'CONNECTED' });
      toast({ title: 'Luno connected', description: 'Your Luno account is now linked.' });
    } catch (e) {
      toast({ title: 'Connection failed', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      await base44.entities.LunoConnection.update(connection.id, {
        status: 'DISCONNECTED',
        disconnected_date: new Date().toISOString(),
      });
      setConnection(null);
      setBalances([]);
      setAddresses([]);
      setTransactions([]);
      setExchangeTransactions([]);
      setTotal(null);
      toast({ title: 'Luno disconnected' });
    } catch (e) {
      toast({ title: 'Disconnect failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleSend = async (asset, amount, recipient) => {
    setSending(true);
    const optimisticId = `opt_${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      asset,
      amount,
      recipient_address: recipient,
      transaction_reference: '—',
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    };
    setTransactions((prev) => [optimistic, ...prev]);
    try {
      await base44.functions.invoke('lunoSend', { asset, amount, recipient });
      toast({ title: 'Send confirmed', description: `Sent ${amount} ${asset} via Luno.` });
      loadData();
    } catch (e) {
      setTransactions((prev) => prev.filter((t) => t.id !== optimisticId));
      toast({ title: 'Send failed', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  const connected = connection?.status === 'CONNECTED';

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1525] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#d4af37]">Luno — Exchange</h2>
        </div>
        <StatusPill value={connected ? 'CONNECTED' : 'NOT_CONNECTED'} />
      </div>

      {!connected ? (
        <div className="mt-4">
          <LunoConnectCard onConnect={handleConnect} connecting={connecting} />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Connected key: <span className="font-mono text-slate-300">{connection.api_key_id}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-[#d4af37]"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" /> Disconnect
              </button>
            </div>
          </div>
          <LunoPortfolioTotal total={total} loading={dataLoading} />
          <LunoBalances balances={balances} addresses={addresses} loading={dataLoading} />
          <LunoExchangeTransactions transactions={exchangeTransactions} loading={dataLoading} />
          <LunoSendForm balances={balances} onSend={handleSend} sending={sending} />
          <LunoHistory transactions={transactions} />
        </div>
      )}
    </div>
  );
}