import { useEffect, useMemo, useState } from 'react';
import { getCustomers, type CustomerRecord, type EventRecord, type StationStatus } from '../DataControl';
import { useAuth } from '../context/AuthContext';

const archivo = { fontFamily: 'Archivo, sans-serif' };

function findStation(event: EventRecord, id: string): StationStatus | undefined {
  return event.stationStatuses.find(station => station.id === id);
}

function sortEventsByRecency(left: EventRecord, right: EventRecord): number {
  const leftTime = Date.parse(left.createdAt || left.eventDate || '1970-01-01');
  const rightTime = Date.parse(right.createdAt || right.eventDate || '1970-01-01');

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return 0;
  }
  if (Number.isNaN(leftTime)) {
    return 1;
  }
  if (Number.isNaN(rightTime)) {
    return -1;
  }

  return rightTime - leftTime;
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

interface CustomerEvent {
  customer: CustomerRecord;
  event: EventRecord;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'this' | 'all'>('this');
  const [selectedEventName, setSelectedEventName] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    async function loadData() {
      const data = await getCustomers();
      setCustomers(data);
      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const allCustomerEvents = useMemo<CustomerEvent[]>(() => {
    return customers.flatMap(customer => (customer.Events ?? []).map(event => ({ customer, event })));
  }, [customers]);

  const eventOptions = useMemo(() => {
    const byName = new Map<string, EventRecord>();

    for (const { event } of allCustomerEvents) {
      const existing = byName.get(event.eventName);
      if (!existing || sortEventsByRecency(event, existing) < 0) {
        byName.set(event.eventName, event);
      }
    }

    return Array.from(byName.values()).sort(sortEventsByRecency);
  }, [allCustomerEvents]);

  useEffect(() => {
    if (!selectedEventName && eventOptions.length > 0) {
      setSelectedEventName(eventOptions[0].eventName);
    }
  }, [eventOptions, selectedEventName]);

  const relevantEvents = useMemo(() => {
    const events: EventRecord[] = [];

    for (const customer of customers) {
      const candidates = viewMode === 'all'
        ? (customer.Events ?? [])
        : (customer.Events ?? []).filter(event => event.eventName === selectedEventName);

      const latest = [...candidates].sort(sortEventsByRecency)[0];
      if (latest) {
        events.push(latest);
      }
    }

    return events;
  }, [customers, viewMode, selectedEventName]);

  const stats = useMemo(() => {
    const registered = relevantEvents.length;
    const checkedIn = relevantEvents.filter(event => findStation(event, 'check-in')?.status === 'complete').length;
    const screened = relevantEvents.filter(event => findStation(event, 'vision-screening')?.status === 'complete').length;
    const passed = relevantEvents.filter(event => findStation(event, 'vision-screening')?.decision === 'PASS').length;
    const failed = relevantEvents.filter(event => findStation(event, 'vision-screening')?.decision === 'FAIL').length;

    const examRouted = failed;
    const examCompleted = relevantEvents.filter(event => findStation(event, 'eye-exam')?.status === 'complete').length;
    const examInQueue = relevantEvents.filter(event => findStation(event, 'eye-exam')?.status === 'current').length;
    const referralOut = relevantEvents.filter(event => findStation(event, 'eye-exam')?.decision === 'REFERRAL').length;
    const rxFrameSelected = relevantEvents.filter(event =>
      findStation(event, 'eye-exam')?.decision === 'FRAME' && findStation(event, 'frame-selection')?.status === 'complete'
    ).length;

    return { registered, checkedIn, screened, passed, failed, examRouted, examCompleted, examInQueue, referralOut, rxFrameSelected };
  }, [relevantEvents]);

  const updatedLabel = `${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}`;

  if (!user) {
    return <div className="max-w-6xl mx-auto px-6 py-12">Please sign in to view this page.</div>;
  }

  if (role !== 'admin' && role !== 'doctor') {
    return <div className="max-w-6xl mx-auto px-6 py-12">You do not have permission to view the dashboard.</div>;
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-12">Loading dashboard...</div>;
  }

  const examBarTotal = Math.max(stats.examRouted, stats.rxFrameSelected + stats.referralOut, 1);

  return (
    <div className="bg-[#eceeeb] px-6 py-10 md:px-10" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
      <div className="mx-auto max-w-[1180px] rounded-2xl bg-[#10181f] p-6 text-[#f2f5f3] shadow-[0_2px_14px_rgba(16,24,31,.35)] md:p-9">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="text-2xl font-extrabold tracking-tight md:text-[26px]" style={archivo}>
                Prime Focus · Event Dashboard
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#d95a4a]/15 px-3 py-1 text-[13px] font-bold tracking-[.1em] text-[#e88a7a]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#e06a58]" />
                LIVE
              </span>
            </div>
            <div className="text-[15px] text-[#7d919c]">Updated {updatedLabel}</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-[10px] bg-[#18232c] p-[3px]">
              <button
                onClick={() => setViewMode('this')}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold ${viewMode === 'this' ? 'bg-[#2b3a46] text-white' : 'text-[#7d919c] font-semibold'}`}
              >
                This event
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold ${viewMode === 'all' ? 'bg-[#2b3a46] text-white' : 'text-[#7d919c] font-semibold'}`}
              >
                All events
              </button>
            </div>
            <select
              value={selectedEventName}
              onChange={(changeEvent) => setSelectedEventName(changeEvent.target.value)}
              disabled={viewMode === 'all' || eventOptions.length === 0}
              className="rounded-[10px] border border-[#2b3a46] bg-[#18232c] px-3.5 py-2 text-sm font-semibold text-[#d5dce0] disabled:opacity-50"
            >
              {eventOptions.length === 0 ? (
                <option value="">No events yet</option>
              ) : (
                eventOptions.map(event => (
                  <option key={event.eventName} value={event.eventName}>
                    {event.eventName} — {event.eventDate}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-[#18232c] p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-[#7d919c]">Registered</div>
            <div className="text-5xl font-extrabold leading-none tracking-tight md:text-[60px]" style={archivo}>{stats.registered}</div>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-[#18232c] p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-[#7d919c]">Checked in</div>
            <div className="text-5xl font-extrabold leading-none tracking-tight md:text-[60px]" style={archivo}>{stats.checkedIn}</div>
            <div className="text-sm font-semibold text-[#6fb3c0]">{pct(stats.checkedIn, stats.registered)}% of registered</div>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-[#18232c] p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-[#7d919c]">Screened</div>
            <div className="text-5xl font-extrabold leading-none tracking-tight md:text-[60px]" style={archivo}>{stats.screened}</div>
            <div className="text-sm text-[#7d919c]">
              <span className="font-semibold text-[#6fb3c0]">{pct(stats.screened, stats.checkedIn)}% of checked in</span>
              {stats.checkedIn - stats.screened > 0 ? <span className="text-[#e0b26d]"> · {stats.checkedIn - stats.screened} waiting</span> : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-[#18232c] p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-[#7d919c]">Rx + frame selected</div>
            <div className="text-5xl font-extrabold leading-none tracking-tight text-[#6fb3c0] md:text-[60px]" style={archivo}>{stats.rxFrameSelected}</div>
            <div className="text-sm text-[#7d919c]">Glasses ordered</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1.2fr_1fr]">
          <div className="flex flex-col gap-4 rounded-[14px] bg-[#18232c] p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-[#7d919c]">Station 2 · Pre-screen outcomes</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-[84px] font-bold text-[#74c08e]">Passed</div>
                <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#22303b]">
                  <div className="h-full rounded-full bg-[#4f9d6b]" style={{ width: `${pct(stats.passed, stats.screened)}%` }} />
                </div>
                <div className="w-[92px] text-right font-bold">
                  {stats.passed} <span className="text-[13px] font-semibold text-[#7d919c]">{pct(stats.passed, stats.screened)}%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-[84px] font-bold text-[#e0b26d]">Failed</div>
                <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#22303b]">
                  <div className="h-full rounded-full bg-[#c9862e]" style={{ width: `${pct(stats.failed, stats.screened)}%` }} />
                </div>
                <div className="w-[92px] text-right font-bold">
                  {stats.failed} <span className="text-[13px] font-semibold text-[#7d919c]">{pct(stats.failed, stats.screened)}%</span>
                </div>
              </div>
            </div>
            <div className="text-[13.5px] text-[#7d919c]">Passed → results in hand, sent home. Failed → routed to doctor exam.</div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[14px] bg-[#18232c] p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-[#7d919c]">Station 3 · Doctor exams</div>
            <div className="flex items-baseline gap-2.5">
              <div className="text-[42px] font-extrabold leading-none tracking-tight" style={archivo}>
                {stats.examCompleted}<span className="text-2xl text-[#7d919c]">/{stats.examRouted}</span>
              </div>
              {stats.examInQueue > 0 ? <div className="text-sm font-semibold text-[#e0b26d]">{stats.examInQueue} in queue</div> : null}
            </div>
            <div className="flex gap-1.5">
              <div className="h-3.5 rounded-l-full bg-[#3d8b99]" style={{ flex: Math.max(stats.rxFrameSelected, 0.001) }} />
              <div className="h-3.5 bg-[#7a6ba8]" style={{ flex: Math.max(stats.referralOut, 0.001) }} />
              <div className="h-3.5 rounded-r-full bg-[#3a4753]" style={{ flex: Math.max(examBarTotal - stats.rxFrameSelected - stats.referralOut, 0.001) }} />
            </div>
            <div className="flex flex-wrap gap-4 text-[13.5px] font-semibold text-[#d5dce0]">
              <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-[#3d8b99]" />Rx issued {stats.rxFrameSelected}</span>
              <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-[#7a6ba8]" />Referral out {stats.referralOut}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[14px] bg-[#18232c] p-5">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-[#7d919c]">Referrals for further care</div>
            <div className="flex items-baseline gap-2.5">
              <div className="text-[42px] font-extrabold leading-none tracking-tight text-[#a493d6]" style={archivo}>{stats.referralOut}</div>
              <div className="text-sm text-[#7d919c]">participants</div>
            </div>
            <div className="text-[13.5px] text-[#7d919c]">Handed referral packet + community resources at Vision Success station.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
