import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { lunoRequest } from "../../shared/lunoClient.ts";
import { decryptSecret } from "../../shared/lunoCrypto.ts";

const COINGECKO_MAP: Record<string, string> = {
  XBT: "bitcoin", BTC: "bitcoin",
  ETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
  WBTC: "wrapped-bitcoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  MATIC: "matic-network",
};
const USD_STABLES = new Set(["USDC", "USDT", "USD", "BUSD"]);
const FIAT_ASSETS = new Set(["ZAR", "NGN", "KES", "EUR", "GBP", "USD"]);

function assetToCoingeckoId(asset: string): string | null {
  return COINGECKO_MAP[asset] || COINGECKO_MAP[asset.toUpperCase()] || null;
}

async function getUsdPrices(assets: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(assets.map(assetToCoingeckoId).filter(Boolean) as string[])];
  if (ids.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`
    );
    const data = await res.json();
    const priceMap: Record<string, number> = {};
    for (const asset of assets) {
      const id = assetToCoingeckoId(asset);
      if (id && data[id]?.usd) priceMap[asset] = Number(data[id].usd);
    }
    return priceMap;
  } catch (e) {
    return {};
  }
}

function toIsoTimestamp(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "number") return new Date(raw).toISOString();
  const n = Number(raw);
  if (isFinite(n) && n > 0) return new Date(n).toISOString();
  const parsed = Date.parse(raw);
  return isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const conns = await base44.asServiceRole.entities.LunoConnection.filter({ member_id: user.id });
    const conn = conns[0];
    if (!conn || conn.status !== "CONNECTED") {
      return Response.json({ error: "Luno account not connected" }, { status: 400 });
    }
    const keySecret = await decryptSecret(conn.api_secret_encrypted);
    const creds = { keyId: conn.api_key_id, keySecret };

    // 1. Balances
    const balanceData = await lunoRequest("/api/1/balance", creds);
    const balances = (balanceData.balance || [])
      .map((b: any) => ({
        account_id: b.account_id,
        asset: b.asset,
        balance: Number(b.balance),
        reserved: Number(b.reserved || 0),
      }))
      .filter((b: any) => b.balance > 0 || b.reserved > 0);

    // 2. Funding / receive addresses (crypto assets only)
    const cryptoAssets = [...new Set(balances.map((b: any) => b.asset))].filter(
      (a) => !FIAT_ASSETS.has(a)
    );
    const addresses: { asset: string; address: string }[] = [];
    for (const asset of cryptoAssets) {
      try {
        const fa = await lunoRequest("/api/1/funding_address", { ...creds, params: { asset } });
        if (fa.address) addresses.push({ asset, address: fa.address });
      } catch (e) {
        /* asset may not support a receive address — skip */
      }
    }

    // 3. Recent on-exchange transactions (cap to 5 non-zero accounts)
    const accountsWithBalance = balances.filter((b: any) => b.balance > 0).slice(0, 5);
    const exchangeTxns: any[] = [];
    for (const acc of accountsWithBalance) {
      try {
        const td = await lunoRequest(`/api/1/accounts/${acc.account_id}/transactions`, creds);
        const list = td.transactions || [];
        for (const t of list) {
          exchangeTxns.push({
            kind: t.kind || t.type || "TRANSACTION",
            asset: acc.asset,
            amount: Number(t.amount),
            description: t.description || "",
            timestamp: toIsoTimestamp(t.timestamp),
          });
        }
      } catch (e) {
        /* skip account */
      }
    }
    exchangeTxns.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    const exchangeTransactions = exchangeTxns.slice(0, 20);

    // 4. App-initiated send history (LunoTransaction records)
    const transactions = await base44.asServiceRole.entities.LunoTransaction.filter(
      { member_id: user.id },
      "-timestamp",
      20
    );

    // 5. Portfolio total value (USD + ZAR)
    const rates = await base44.asServiceRole.entities.ExchangeRate.filter({
      is_active: true,
      base_currency: "USD",
      quote_currency: "ZAR",
    });
    const usdZar = rates[0]?.rate || 0;
    const assets = balances.map((b: any) => b.asset);
    const prices = await getUsdPrices(assets);
    let usdTotal = 0;
    for (const b of balances) {
      const amt = b.balance;
      if (prices[b.asset] != null) usdTotal += amt * prices[b.asset];
      else if (USD_STABLES.has(b.asset)) usdTotal += amt;
      else if (b.asset === "ZAR" && usdZar > 0) usdTotal += amt / usdZar;
    }
    const zarTotal = usdZar > 0 ? usdTotal * usdZar : 0;

    return Response.json({
      balances,
      addresses,
      exchange_transactions: exchangeTransactions,
      transactions,
      total: {
        usd: Number(usdTotal.toFixed(2)),
        zar: Number(zarTotal.toFixed(2)),
        asset_count: balances.length,
        usd_zar_rate: usdZar,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}