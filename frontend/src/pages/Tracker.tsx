import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck,
  Flame,
  CheckCircle2,
  PackageCheck,
  ShieldCheck,
  Clock,
  MapPin,
  Search,
  RefreshCw,
  Zap,
  Copy,
  Check,
  ShoppingBag,
  Pizza,
  Phone,
  Navigation,
  Sparkles,
  Layers,
  Server,
  Receipt,
  Code2,
  Volume2,
  VolumeX,
  ArrowRight,
  Info
} from 'lucide-react';
import { callWalker } from '../api/jacClient';

interface OrderItem {
  pizza_id: string;
  name: string;
  size: string;
  qty: number;
  unit_price: number;
  crust?: string;
  notes?: string;
}

interface OrderData {
  order_id: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  eta_minutes: number;
  updated_at: string;
}

interface StageConfig {
  key: string;
  label: string;
  stepName: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  shortDesc: string;
  etaMinutes: number;
  temperature?: string;
}

const STAGES: StageConfig[] = [
  {
    key: 'Order Placed',
    label: 'Order Placed',
    stepName: 'Stage 1',
    icon: Receipt,
    description: 'Order confirmed and ingredients hand-prepped by Pizza Hut kitchen specialists.',
    shortDesc: 'Kitchen Received & Prepping',
    etaMinutes: 35,
  },
  {
    key: 'Baking in 450°F Oven',
    label: 'Baking in 450°F Oven',
    stepName: 'Stage 2',
    icon: Flame,
    description: 'Slow-baked inside our 450°F stone deck oven until the signature pan crust turns golden crisp.',
    shortDesc: 'In 450°F Stone Oven',
    etaMinutes: 25,
    temperature: '450°F Active',
  },
  {
    key: 'Boxed & Quality Checked',
    label: 'Boxed & Quality Checked',
    stepName: 'Stage 3',
    icon: PackageCheck,
    description: 'Precision cut into 8 signature slices, garlic-butter brushed, and steam-sealed for delivery.',
    shortDesc: 'Cut, Brushed & Steam-Sealed',
    etaMinutes: 18,
  },
  {
    key: 'Out for Delivery',
    label: 'Out for Delivery',
    stepName: 'Stage 4',
    icon: Truck,
    description: 'Secured inside a heated Thermal HotBag™ and en route to your doorstep via delivery vehicle.',
    shortDesc: 'Hut Specialist En Route',
    etaMinutes: 8,
  },
  {
    key: 'Delivered',
    label: 'Delivered',
    stepName: 'Stage 5',
    icon: MapPin,
    description: 'Arrived hot & fresh at your doorstep. Enjoy your signature Pizza Hut feast!',
    shortDesc: 'Arrived Piping Hot',
    etaMinutes: 0,
  },
];

// Fallback mock order matching models.jac Order schema
const DEFAULT_FALLBACK_ORDER: OrderData = {
  order_id: 'PH-8942-X',
  items: [
    {
      pizza_id: 'p1',
      name: 'Super Supreme Pan Pizza',
      size: 'Large (14")',
      qty: 1,
      unit_price: 18.99,
      crust: 'Original Pan Crust with Crispy Golden Edge',
      notes: 'Extra mozzarella cheese, savory Italian sausage & black olives',
    },
    {
      pizza_id: 's1',
      name: 'Garlic Bread Stix & Marinara Dip',
      size: 'Standard (4 pcs)',
      qty: 1,
      unit_price: 5.99,
      crust: 'Toasted Herb Crust',
      notes: 'Warm crushed tomato marinara dipping cup included',
    },
    {
      pizza_id: 'd1',
      name: 'Pepsi Zero Sugar Ice Cold Bottle',
      size: '2L Chilled Bottle',
      qty: 1,
      unit_price: 3.49,
      notes: 'Served chilled',
    },
  ],
  total_price: 28.47,
  status: 'Order Placed',
  eta_minutes: 35,
  updated_at: 'Just now',
};

// Web Audio API Synthesized Chime (no external audio files needed)
const playStageChime = (frequency = 587.33) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio permission or autoplay constraints
  }
};

export const Tracker: React.FC = () => {
  // Read active_order_id from localStorage with fallback
  const [activeOrderId, setActiveOrderId] = useState<string>(() => {
    return localStorage.getItem('active_order_id') || 'PH-8942-X';
  });

  const [inputOrderId, setInputOrderId] = useState<string>(activeOrderId);
  const [orderData, setOrderData] = useState<OrderData>(DEFAULT_FALLBACK_ORDER);
  const [loading, setLoading] = useState<boolean>(true);
  const [advancing, setAdvancing] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(35 * 60);
  const [copied, setCopied] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);
  const [rawPayload, setRawPayload] = useState<unknown>(null);
  const [tipAmount, setTipAmount] = useState<number>(3.5);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine stage index (0 to 4)
  const getStageIndex = (statusStr: string): number => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('deliver') && !s.includes('out')) return 4;
    if (s.includes('out') || s.includes('route')) return 3;
    if (s.includes('box') || s.includes('quality') || s.includes('check')) return 2;
    if (s.includes('bak') || s.includes('oven') || s.includes('450')) return 1;
    return 0; // Order Placed
  };

  const currentStageIndex = getStageIndex(orderData.status);

  // Live countdown timer ticker (ticks down 1 second every second)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (currentStageIndex < 4 && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStageIndex, remainingSeconds]);

  // Format seconds into MM:SS
  const formatTime = (totalSecs: number): { minutes: string; seconds: string } => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return {
      minutes: m.toString().padStart(2, '0'),
      seconds: s.toString().padStart(2, '0'),
    };
  };

  // Helper to extract order data from Jac response envelope
  const extractOrderFromResponse = (res: unknown): OrderData | null => {
    if (!res || typeof res !== 'object') return null;
    const r = res as Record<string, unknown>;

    // Case 1: Standard envelope res.data.reports[0]
    const dataObj = r.data as Record<string, unknown> | undefined;
    if (dataObj && Array.isArray(dataObj.reports) && dataObj.reports.length > 0) {
      return dataObj.reports[0] as OrderData;
    }

    // Case 2: Direct reports array res.reports[0]
    if (Array.isArray(r.reports) && r.reports.length > 0) {
      return r.reports[0] as OrderData;
    }

    // Case 3: res.data itself is the order
    if (dataObj && typeof dataObj.status === 'string') {
      return dataObj as unknown as OrderData;
    }

    // Case 4: Top level has order_id and status
    if (typeof r.order_id === 'string' && typeof r.status === 'string') {
      return r as unknown as OrderData;
    }

    return null;
  };

  // Fetch status from Jac backend
  const fetchOrderStatus = useCallback(async (targetId: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await callWalker<OrderData>('get_order_status', { order_id: targetId });
      setRawPayload(response);
      const parsed = extractOrderFromResponse(response);

      if (parsed) {
        setOrderData((prev) => ({
          ...prev,
          ...parsed,
          items: parsed.items && parsed.items.length > 0 ? parsed.items : prev.items,
        }));
        if (parsed.eta_minutes !== undefined) {
          setRemainingSeconds(Math.max(0, parsed.eta_minutes * 60));
        }
        setIsBackendConnected(true);
      } else {
        setOrderData((prev) => ({ ...prev, order_id: targetId }));
      }
      setLastFetchTime(new Date().toLocaleTimeString());
    } catch {
      setIsBackendConnected(false);
      setOrderData((prev) => ({
        ...prev,
        order_id: targetId,
      }));
      setLastFetchTime(new Date().toLocaleTimeString());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load & localStorage sync
  useEffect(() => {
    localStorage.setItem('active_order_id', activeOrderId);
    let mounted = true;
    (async () => {
      if (mounted) {
        await fetchOrderStatus(activeOrderId);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeOrderId, fetchOrderStatus]);

  // Handle Search / Change Order ID
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputOrderId.trim().toUpperCase() || 'PH-8942-X';
    setActiveOrderId(cleanId);
    localStorage.setItem('active_order_id', cleanId);
  };

  const handleSelectSampleOrder = (sampleId: string) => {
    setInputOrderId(sampleId);
    setActiveOrderId(sampleId);
    localStorage.setItem('active_order_id', sampleId);
  };

  // Advance stage sequential walker caller
  const handleAdvanceStage = async () => {
    setAdvancing(true);
    if (soundEnabled) playStageChime();

    try {
      const response = await callWalker<OrderData>('advance_order_stage', { order_id: activeOrderId });
      setRawPayload(response);
      const parsed = extractOrderFromResponse(response);

      if (parsed) {
        setOrderData((prev) => ({
          ...prev,
          ...parsed,
          items: parsed.items && parsed.items.length > 0 ? parsed.items : prev.items,
        }));
        if (parsed.eta_minutes !== undefined) {
          setRemainingSeconds(Math.max(0, parsed.eta_minutes * 60));
        }
        setIsBackendConnected(true);
      } else {
        advanceLocally();
      }
    } catch {
      // Backend offline: Advance locally using exact Jac walker state machine
      setIsBackendConnected(false);
      advanceLocally();
    } finally {
      setAdvancing(false);
      setLastFetchTime(new Date().toLocaleTimeString());
    }
  };

  // Local state machine matching walkers_delivery.jac logic
  const advanceLocally = () => {
    setOrderData((prev) => {
      const nextIdx = (getStageIndex(prev.status) + 1) % STAGES.length;
      const next = STAGES[nextIdx];
      setRemainingSeconds(next.etaMinutes * 60);
      return {
        ...prev,
        status: next.key,
        eta_minutes: next.etaMinutes,
        updated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });
  };

  // Copy order ID to clipboard
  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderData.order_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Progress Bar Percentage
  const progressPercentage = [10, 32, 58, 82, 100][currentStageIndex] || 10;

  // Next stage preview label
  const nextStage = STAGES[(currentStageIndex + 1) % STAGES.length];
  const nextStageLabel = currentStageIndex === 4 ? 'Reset to Placed (Demo Loop)' : nextStage.label;

  const { minutes, seconds } = formatTime(remainingSeconds);

  // Financial calculations
  const itemsSubtotal = orderData.items.reduce((sum, it) => sum + (it.unit_price * (it.qty || 1)), 0);
  const deliveryFee = 2.99;
  const tax = Number((itemsSubtotal * 0.0825).toFixed(2));
  const finalTotal = Number((itemsSubtotal + deliveryFee + tax + tipAmount).toFixed(2));

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. TOP STATUS & HACKATHON DEVELOPER HUD */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-lg shadow-red-700/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Developer 2: Hut Tracker Engine</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/50">
                  Real-Time OSP Delivery
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connected to <code className="text-red-400 font-mono">models.jac: Order</code> &amp; <code className="text-red-400 font-mono">walkers_delivery.jac</code>
              </p>
            </div>
          </div>

          {/* Quick HUD controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Backend connection pill */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
                isBackendConnected
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span>{isBackendConnected ? 'Jac Scale :8000 Active' : 'Standalone Simulated Mode'}</span>
            </div>

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-red-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Inspect Jac Walker JSON */}
            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 flex items-center gap-1.5 font-mono transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-red-400" />
              <span>Inspect Walker</span>
            </button>
          </div>
        </div>

        {/* 2. ORDER LOOKUP & JUDGE DEMO CONTROLS BAR */}
        <div className="rounded-2xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 shadow-xl">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

            {/* Left: Search input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputOrderId}
                  onChange={(e) => setInputOrderId(e.target.value)}
                  placeholder="Enter Order ID (e.g. PH-8942-X)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#E31837] text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-700/20 flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchOrderStatus(activeOrderId)}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all flex items-center justify-center"
                  title="Refresh status"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
                </button>
              </div>
            </form>

            {/* Right: Hackathon Judge "Simulate Next Stage" Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 block flex items-center sm:justify-end gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Judge Demo Trigger
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  Next: <strong className="text-white">{nextStageLabel}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleAdvanceStage}
                disabled={advancing}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 bg-[length:200%_auto] hover:bg-right text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/10 hover:shadow-red-500/25 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 border border-amber-400/30"
              >
                <Zap className={`w-4 h-4 text-amber-300 ${advancing ? 'animate-spin' : 'animate-bounce'}`} />
                <span>{advancing ? 'Advancing Walker...' : 'Simulate Next Stage'}</span>
              </button>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="mt-3.5 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500 text-[11px] font-medium">Quick Demo Orders:</span>
            {['PH-8942-X', 'PH-1024-V', 'PH-7711-K'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleSelectSampleOrder(sample)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                  activeOrderId === sample
                    ? 'bg-red-950 border border-red-700/60 text-red-200'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {sample}
              </button>
            ))}
            {lastFetchTime && (
              <span className="text-zinc-600 text-[10px] ml-auto font-mono">
                Synced: {lastFetchTime}
              </span>
            )}
          </div>
        </div>

        {/* 3. RAW JAC WALKER INSPECTOR (SLIDE-OVER / EXPANDABLE) */}
        {showJsonInspector && (
          <div className="rounded-2xl border border-red-900/40 bg-zinc-950 p-5 font-mono text-xs shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">Live Jac Walker Response Inspector</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-red-300 border border-zinc-800">
                  /walker/get_order_status
                </span>
              </div>
              <button
                onClick={() => setShowJsonInspector(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>
            <pre className="mt-3 p-3 rounded-xl bg-zinc-900/80 text-emerald-400 text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-zinc-800">
              {rawPayload ? JSON.stringify(rawPayload, null, 2) : JSON.stringify(orderData, null, 2)}
            </pre>
          </div>
        )}

        {/* 4. MAIN HERO CARD: THE 5-STAGE HUT TRACKER */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background red glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute bottom-0 left-10 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

          {/* Header with Order ID & Countdown Clock */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
                  Pizza Hut Order
                </span>
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <span className="font-mono text-xs font-bold text-white">{orderData.order_id}</span>
                  <button
                    onClick={handleCopyOrderId}
                    className="text-zinc-400 hover:text-white p-0.5"
                    title="Copy Order ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/60 text-red-400 border border-red-800/40">
                  {orderData.status}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 flex items-center gap-3">
                <span>{STAGES[currentStageIndex].label}</span>
                {currentStageIndex === 1 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-semibold animate-pulse">
                    450°F Oven
                  </span>
                )}
                {currentStageIndex === 4 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-semibold">
                    Completed
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                {STAGES[currentStageIndex].description}
              </p>
            </div>

            {/* LIVE COUNTDOWN TIMER BLOCK */}
            <div className="flex items-center gap-4 bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-[#E31837]">
                <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: '12s' }} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                  {currentStageIndex === 4 ? 'Status' : 'Live ETA Countdown'}
                </span>
                {currentStageIndex === 4 ? (
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    Delivered 🍕
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-2xl sm:text-3xl font-black text-white">{minutes}</span>
                    <span className="text-xs text-red-400 font-bold">m</span>
                    <span className="text-2xl sm:text-3xl font-black text-white ml-1">{seconds}</span>
                    <span className="text-xs text-red-400 font-bold">s</span>
                  </div>
                )}
                <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">
                  {currentStageIndex === 4
                    ? 'Enjoy your piping hot meal'
                    : `Est. Arrival ~${orderData.eta_minutes} mins`}
                </span>
              </div>
            </div>
          </div>

          {/* 5-STAGE ANIMATED PROGRESS BAR STEPPER */}
          <div className="relative z-10 py-10 px-2 sm:px-4">
            <div className="relative">
              {/* Background inactive track */}
              <div className="absolute top-6 left-8 right-8 h-1.5 bg-zinc-800 rounded-full" />

              {/* Active filled glowing line */}
              <div
                className="absolute top-6 left-8 h-1.5 bg-gradient-to-r from-[#E31837] via-amber-500 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-lg shadow-red-600/40"
                style={{ width: `calc(${progressPercentage}% - 2rem)` }}
              />

              {/* 5 Step Nodes */}
              <div className="grid grid-cols-5 gap-1 sm:gap-2 relative z-10">
                {STAGES.map((stage, idx) => {
                  const Icon = stage.icon;
                  const isDone = idx < currentStageIndex;
                  const isActive = idx === currentStageIndex;

                  return (
                    <div key={stage.key} className="flex flex-col items-center text-center group">
                      {/* Node circle */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isActive
                            ? 'bg-gradient-to-br from-[#E31837] to-red-700 text-white ring-4 ring-red-500/30 scale-110 shadow-xl shadow-red-600/40'
                            : isDone
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                            : 'bg-zinc-800/90 text-zinc-500 border border-zinc-700/60'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                        )}
                      </div>

                      {/* Stage indicator badge */}
                      <span
                        className={`text-[10px] font-mono uppercase mt-3 tracking-wider font-semibold ${
                          isActive ? 'text-amber-400 font-bold' : isDone ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        {stage.stepName}
                      </span>

                      {/* Stage name */}
                      <h4
                        className={`text-xs sm:text-sm font-bold mt-0.5 line-clamp-1 transition-colors ${
                          isActive ? 'text-white' : isDone ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {stage.shortDesc}
                      </h4>

                      {/* Subtitle / ETA badge */}
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5 hidden sm:block">
                        {idx === 0 && '35m ETA'}
                        {idx === 1 && '450°F Bake'}
                        {idx === 2 && 'Quality Seal'}
                        {idx === 3 && '8m Travel'}
                        {idx === 4 && 'Doorstep'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Stage Context Banner */}
          <div className="relative z-10 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Current Stage Progress: {STAGES[currentStageIndex].label}
                </span>
                <span className="text-[11px] text-zinc-400">
                  Last updated at {orderData.updated_at || 'Just now'} via Jac Graph Node
                </span>
              </div>
            </div>

            <button
              onClick={handleAdvanceStage}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold group ml-auto sm:ml-0"
            >
              <span>Simulate Next Stage</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 5. SPLIT SECTION: SIMULATED DELIVERY ROUTE CARD (LEFT) + ORDER RECEIPT (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: SIMULATED GPS DELIVERY ROUTE CARD */}
          <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-600/10 text-[#E31837]">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Live Route &amp; Driver Status</h3>
                    <p className="text-xs text-zinc-400">Simulated GPS telemetry from store to doorstep</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold border ${
                    currentStageIndex === 3
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                      : currentStageIndex === 4
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {currentStageIndex === 3 ? 'Active Route' : currentStageIndex === 4 ? 'Completed' : 'Standby at Store'}
                </span>
              </div>

              {/* SIMULATED MAP CANVAS */}
              <div className="mt-5 rounded-2xl bg-[#090b10] border border-zinc-800/80 p-5 relative overflow-hidden">
                {/* Map Grid Pattern Background */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #383b47 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Simulated Road Route Line */}
                <div className="relative z-10 py-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Pizza className="w-3.5 h-3.5 text-red-500" />
                      Pizza Hut Store #4218
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Your Home (742 Evergreen)
                    </span>
                  </div>

                  {/* Route progress track */}
                  <div className="relative h-20 bg-zinc-900/90 rounded-xl border border-zinc-800 p-3 flex items-center">
                    {/* Road line */}
                    <div className="w-full h-2 bg-zinc-800 rounded-full relative overflow-hidden">
                      {/* Active path */}
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 rounded-full transition-all duration-700"
                        style={{
                          width:
                            currentStageIndex === 0
                              ? '5%'
                              : currentStageIndex === 1
                              ? '15%'
                              : currentStageIndex === 2
                              ? '30%'
                              : currentStageIndex === 3
                              ? '75%'
                              : '100%',
                        }}
                      />
                    </div>

                    {/* Driver marker pinned along the road */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 transition-all duration-700"
                      style={{
                        left:
                          currentStageIndex === 0
                            ? '10%'
                            : currentStageIndex === 1
                            ? '20%'
                            : currentStageIndex === 2
                            ? '35%'
                            : currentStageIndex === 3
                            ? '75%'
                            : '92%',
                      }}
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="p-2 rounded-xl bg-[#E31837] text-white shadow-xl shadow-red-600/50 border-2 border-white/20 animate-pulse">
                          {currentStageIndex === 4 ? (
                            <MapPin className="w-4 h-4" />
                          ) : (
                            <Truck className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap bg-black/80 px-1.5 py-0.5 rounded mt-1 border border-amber-500/30">
                          {currentStageIndex < 3
                            ? 'At Store'
                            : currentStageIndex === 3
                            ? 'En Route (0.6 mi)'
                            : 'Arrived'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live telemetry bar */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center pt-3 border-t border-zinc-800/80 text-xs">
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Distance</span>
                    <span className="font-bold text-white font-mono">
                      {currentStageIndex === 4 ? '0.0 miles' : currentStageIndex === 3 ? '0.6 miles' : '1.8 miles'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">HotBag Temp</span>
                    <span className="font-bold text-amber-400 font-mono">168°F (Hot)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Speed</span>
                    <span className="font-bold text-white font-mono">
                      {currentStageIndex === 3 ? '24 mph' : '0 mph'}
                    </span>
                  </div>
                </div>
              </div>

              {/* DRIVER SPECIALIST PROFILE */}
              <div className="mt-5 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white text-lg font-black shadow-md shadow-red-700/20">
                    MD
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Marco D.</h4>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
                        4.95 ★ (1,420 orders)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Delivery Specialist • Red Civic (Lic #HUT-448)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert('Simulating call to Delivery Specialist Marco D. (555-019-PIZZA)')}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-red-500 text-zinc-300 hover:text-white transition-colors"
                    title="Call Driver"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                  </button>
                  <button
                    onClick={() => alert('Delivery instruction recorded: Contactless drop-off at front porch table.')}
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Info className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden sm:inline">Gate Notes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery address footer */}
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                742 Evergreen Terrace, Springfield
              </span>
              <span className="text-emerald-400 font-semibold">Contactless Drop-off</span>
            </div>
          </div>

          {/* RIGHT: ITEMIZED ORDER RECEIPT SUMMARY */}
          <div className="lg:col-span-5 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-600/10 text-[#E31837]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Order Receipt</h3>
                    <p className="text-xs text-zinc-400 font-mono">Invoice #{orderData.order_id}</p>
                  </div>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {orderData.items.length} items
                </span>
              </div>

              {/* Itemized list */}
              <div className="divide-y divide-zinc-800/80 my-4 max-h-72 overflow-y-auto pr-1">
                {orderData.items.map((item, index) => (
                  <div key={`${item.pizza_id || index}`} className="py-3.5 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-red-950/80 text-red-300 border border-red-800/60 text-[10px] font-bold font-mono flex items-center justify-center">
                            {item.qty || 1}x
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white">{item.name}</h4>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 ml-7">
                          {item.size} {item.crust ? `• ${item.crust}` : ''}
                        </p>
                        {item.notes && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 ml-7 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-bold text-white font-mono">
                          ${((item.unit_price || 0) * (item.qty || 1)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Tip Selector */}
              <div className="pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span className="font-semibold text-zinc-300">Courier Tip (Marco D.):</span>
                  <span className="text-red-400 font-mono font-bold">${tipAmount.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[2.0, 3.5, 5.0, 6.0].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTipAmount(amount)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                        tipAmount === amount
                          ? 'bg-[#E31837] text-white shadow-md shadow-red-700/20'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      ${amount.toFixed(amount % 1 === 0 ? 0 : 2)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="pt-4 mt-4 border-t border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Items Subtotal</span>
                <span className="font-mono text-zinc-200">${itemsSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Contactless Delivery Fee</span>
                <span className="font-mono text-zinc-200">${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>State &amp; Local Tax</span>
                <span className="font-mono text-zinc-200">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Courier Tip</span>
                <span className="font-mono text-zinc-200">${tipAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-baseline text-sm font-bold text-white pt-2.5 border-t border-zinc-800">
                <span className="text-sm">Total Amount</span>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-red-400 font-mono">
                    ${finalTotal.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal block font-sans">
                    Paid via Visa •••• 4242
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Hut Guarantee Protected
                </span>
                <button
                  onClick={() => alert(`Receipt for ${orderData.order_id} sent to your registered email.`)}
                  className="text-red-400 hover:underline"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Tracker;
