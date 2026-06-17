'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleLedgerPaid, toggleKeeperFeePaid } from '../../lib/payouts';

export default function PayoutToggle({
  ledgerId,
  initialPaid,
  label,
}: {
  ledgerId: number;
  initialPaid: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [isPaid, setIsPaid] = useState(initialPaid);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    const next = !isPaid;
    setIsPaid(next);
    setError(null);
    startTransition(async () => {
      try {
        await toggleLedgerPaid(ledgerId, next);
        router.refresh();
      } catch (e: any) {
        setIsPaid(!next);
        setError(e.message ?? 'Toggle failed');
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs uppercase transition-all disabled:opacity-50"
      style={{ letterSpacing: '0.14em' }}
      title={error ?? (isPaid ? 'Paid - click to mark unpaid' : 'Click to mark paid')}
    >
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-sm transition-all"
        style={{
          background: isPaid ? 'var(--green-forest)' : 'white',
          border: `1.5px solid ${isPaid ? 'var(--green-forest)' : 'rgba(42,70,54,0.3)'}`,
        }}
      >
        {isPaid && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6 L5 9 L10 3" />
          </svg>
        )}
      </span>
      {label && (
        <span className={isPaid ? 'text-[color:var(--green-deep)]' : 'text-[color:var(--green-moss)]'}>
          {label}
        </span>
      )}
    </button>
  );
}

export function MultiPayoutToggle({
  ledgerIds,
  initialAllPaid,
}: {
  ledgerIds: number[];
  initialAllPaid: boolean;
}) {
  const router = useRouter();
  const [allPaid, setAllPaid] = useState(initialAllPaid);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    const next = !allPaid;
    setAllPaid(next);
    setError(null);
    startTransition(async () => {
      try {
        await Promise.all(ledgerIds.map((id) => toggleLedgerPaid(id, next)));
        router.refresh();
      } catch (e: any) {
        setAllPaid(!next);
        setError(e.message ?? 'Toggle failed');
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="inline-flex items-center transition-all disabled:opacity-50"
      title={error ?? (allPaid ? 'Paid - click to unmark' : 'Click to mark paid')}
    >
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-sm transition-all"
        style={{
          background: allPaid ? 'var(--green-forest)' : 'white',
          border: `1.5px solid ${allPaid ? 'var(--green-forest)' : 'rgba(42,70,54,0.3)'}`,
        }}
      >
        {allPaid && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6 L5 9 L10 3" />
          </svg>
        )}
      </span>
    </button>
  );
}

// Specifically for keeper_fee_payments table
export function KeeperFeeToggle({
  paymentId,
  initialPaid,
}: {
  paymentId: number;
  initialPaid: boolean;
}) {
  const router = useRouter();
  const [isPaid, setIsPaid] = useState(initialPaid);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    const next = !isPaid;
    setIsPaid(next);
    setError(null);
    startTransition(async () => {
      try {
        await toggleKeeperFeePaid(paymentId, next);
        router.refresh();
      } catch (e: any) {
        setIsPaid(!next);
        setError(e.message ?? 'Toggle failed');
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="inline-flex items-center gap-2 text-[10px] uppercase transition-all disabled:opacity-50"
      style={{ letterSpacing: '0.14em' }}
      title={error ?? (isPaid ? 'Paid - click to mark unpaid' : 'Click to mark paid')}
    >
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-sm transition-all"
        style={{
          background: isPaid ? 'var(--green-forest)' : 'white',
          border: `1.5px solid ${isPaid ? 'var(--green-forest)' : 'rgba(42,70,54,0.3)'}`,
        }}
      >
        {isPaid && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6 L5 9 L10 3" />
          </svg>
        )}
      </span>
      <span className={isPaid ? 'text-[color:var(--green-deep)]' : 'text-[color:var(--green-moss)]'}>
        {isPaid ? 'Paid' : 'Unpaid'}
      </span>
    </button>
  );
}
