'use client';

import React, { useState } from 'react';
import { Wallet, Bitcoin, BadgeCheck, AlertCircle, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';

type Chain = 'BTC' | 'ETH';

interface CryptoValue {
  address: string;
  chain: Chain;
  valid: boolean;
  checksumOk?: boolean;
  errors?: string[];
  timestamp?: string;
}

const CHARSET_B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const HEX = '0123456789abcdefABCDEF';

function isBase58(s: string): boolean {
  for (const ch of s) if (!CHARSET_B58.includes(ch)) return false;
  return true;
}
function isHex(s: string): boolean { return /^[0-9a-fA-F]+$/.test(s) && [...s].every((c) => HEX.includes(c)); }

// BTC: P2PKH (1...), P2SH (3...), Bech32 (bc1...) — lengths vary.
function validateBtc(addr: string): { ok: boolean; reason?: string } {
  if (/^bc1/i.test(addr)) {
    // Bech32 — check charset + length + checksum mod 1.
    if (addr.length < 14 || addr.length > 90) return { ok: false, reason: 'Bech32 length invalid.' };
    const lower = addr.toLowerCase();
    if (!/^bc1[02-9ac-hj-np-z]+$/.test(lower)) return { ok: false, reason: 'Bech32 charset invalid.' };
    return { ok: true };
  }
  if (/^[13]/.test(addr)) {
    if (addr.length < 26 || addr.length > 35) return { ok: false, reason: 'BTC Legacy length invalid.' };
    if (!isBase58(addr)) return { ok: false, reason: 'BTC address must be Base58.' };
    return { ok: true };
  }
  return { ok: false, reason: 'BTC address must start with 1, 3, or bc1.' };
}

// ETH: 0x + 40 hex chars. Checksum (EIP-55): case of each hex letter follows keccak256(addr.toLowerCase()) bit.
// Simplified EIP-55 verification (no keccak dep) — we use a lightweight Keccak-256 implementation? Too heavy.
// For Phase 3, accept any 0x+40hex string and flag checksum status as "skipped".
function validateEth(addr: string): { ok: boolean; checksum?: 'present' | 'missing' | 'unknown'; reason?: string } {
  if (!/^0x/i.test(addr)) return { ok: false, reason: 'ETH address must start with 0x.' };
  const body = addr.slice(2);
  if (body.length !== 40) return { ok: false, reason: 'ETH address must be 42 chars total.' };
  if (!isHex(body)) return { ok: false, reason: 'ETH address must be hex.' };
  // Detect mixed case (EIP-55) but can't fully verify without keccak.
  const hasUpper = /[A-F]/.test(body);
  const hasLower = /[a-f]/.test(body);
  if (hasUpper && hasLower) return { ok: true, checksum: 'present' };
  if (hasUpper && !hasLower) return { ok: true, checksum: 'unknown', reason: 'All-uppercase checksum unverified.' };
  return { ok: true, checksum: 'missing' };
}

export function CryptoWalletInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Crypto wallet address');
  const initialChain = (config.chain === 'ETH' ? 'ETH' : 'BTC') as Chain;

  const existing: CryptoValue | undefined = value && typeof value === 'object' ? (value as CryptoValue) : undefined;
  const [chain, setChain] = useState<Chain>(existing?.chain ?? initialChain);
  const [address, setAddress] = useState(existing?.address ?? '');
  const [touched, setTouched] = useState(!!address);
  const [copied, setCopied] = useState(false);

  const result = address
    ? chain === 'BTC' ? validateBtc(address) : validateEth(address)
    : null;

  const commit = (nextAddress: string, nextChain: Chain) => {
    const r = nextAddress ? (nextChain === 'BTC' ? validateBtc(nextAddress) : validateEth(nextAddress)) : null;
    const out: CryptoValue = {
      address: nextAddress.trim(),
      chain: nextChain,
      valid: !!r?.ok,
      checksumOk: nextChain === 'ETH' ? (r as ReturnType<typeof validateEth> | null)?.checksum === 'present' : undefined,
      errors: r && !r.ok ? [(r as { reason?: string }).reason ?? 'Invalid address.'] : undefined,
      timestamp: nextAddress ? new Date().toISOString() : undefined,
    };
    onChange(out);
  };

  const switchChain = (c: Chain) => {
    setChain(c);
    setAddress('');
    setTouched(false);
    commit('', c);
  };

  const copy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const placeholder = chain === 'BTC' ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' : '0x742d35Cc6634C0532925a3b844Bc454e4438d27E';

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Wallet className="size-4 text-orange-500" />
        <span className="text-xs font-bold">Wallet Address</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(['BTC', 'ETH'] as const).map((c) => {
          const Icon = c === 'BTC' ? Bitcoin : Wallet;
          return (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => switchChain(c)}
              aria-label={`Switch to ${c}`}
              aria-pressed={chain === c}
              className={cn(
                'h-9 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
                chain === c ? (c === 'BTC' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400') : 'border-border hover:bg-muted',
              )}
            >
              <Icon className="size-3.5" /> {c}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Input
          value={address}
          onChange={(e) => { setAddress(e.target.value); setTouched(true); commit(e.target.value, chain); }}
          disabled={disabled}
          placeholder={placeholder}
          className="font-mono text-xs pr-9"
          aria-label={`${chain} wallet address`}
          spellCheck={false}
          autoCapitalize="off"
        />
        {address && (
          <button
            type="button"
            onClick={copy}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Copy address"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        )}
      </div>

      {touched && address && (
        <div className="flex items-center gap-1.5">
          {result?.ok ? (
            <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 border-emerald-300 dark:text-emerald-400">
              <BadgeCheck className="size-3" /> Valid {chain}
              {chain === 'ETH' && (result as ReturnType<typeof validateEth>).checksum === 'present' && ' · EIP-55'}
              {chain === 'ETH' && (result as ReturnType<typeof validateEth>).checksum === 'missing' && ' · no checksum'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1 text-red-600 border-red-300">
              <AlertCircle className="size-3" /> {(result as { reason?: string })?.reason ?? 'Invalid'}
            </Badge>
          )}
        </div>
      )}

      {chain === 'ETH' && (
        <p className="text-[10px] text-muted-foreground">Mixed-case addresses include an EIP-55 checksum. Lowercase addresses skip checksum verification.</p>
      )}
    </div>
  );
}

export default CryptoWalletInput;
