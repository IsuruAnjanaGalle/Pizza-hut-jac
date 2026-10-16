import React from 'react';
import { Truck, Search, Clock, CheckCircle2, Flame, MapPin, Layers, Server } from 'lucide-react';

export const Tracker: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Developer Banner */}
      <div className="mb-8 p-4 rounded-xl border border-dashed border-red-500/40 bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-600/20 text-[#E31837]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Developer 2 Branch: Live Order Tracker</h2>
            <p className="text-xs text-zinc-400">
              Contract Node: <code className="text-red-300 font-mono">Order</code> | Walker: <code className="text-red-300 font-mono">backend/walkers_delivery.jac</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Endpoint: /walker/track_order</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-3">
          <Truck className="w-8 h-8 text-[#E31837]" />
          Live Delivery Tracker
        </h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
          Follow your hot & fresh Pizza Hut order straight from the stone oven to your doorstep.
        </p>
      </div>

      {/* Order Lookup Bar */}
      <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-4 mb-8">
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              defaultValue="PH-8942-X"
              placeholder="Enter Order ID (e.g. PH-8942-X)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-[#E31837] text-white text-xs font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Order</span>
          </button>
        </form>
      </div>

      {/* Mock Tracker Card */}
      <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 sm:p-8">
        {/* Order Meta Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wide">
                Order #PH-8942-X
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                In the Oven
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Super Supreme + Garlic Bread</h3>
          </div>

          <div className="flex items-center gap-2 bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/50">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                Estimated Delivery
              </span>
              <span className="text-sm font-bold text-white">22 mins</span>
            </div>
          </div>
        </div>

        {/* Status Stepper */}
        <div className="py-8">
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-zinc-800 -z-0" />
            <div className="absolute top-5 left-6 w-1/2 h-0.5 bg-[#E31837] -z-0" />

            <div className="grid grid-cols-4 gap-2 relative z-10 text-center">
              {[
                { label: 'Order Received', icon: CheckCircle2, status: 'done', time: '18:42' },
                { label: 'Baking in Oven', icon: Flame, status: 'active', time: '18:50' },
                { label: 'Out for Delivery', icon: Truck, status: 'pending', time: 'Est. 19:05' },
                { label: 'Delivered', icon: MapPin, status: 'pending', time: 'Est. 19:15' },
              ].map((step, idx) => {
                const Icon = step.icon;
                const isActive = step.status === 'active';
                const isDone = step.status === 'done';

                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-[#E31837] text-white ring-4 ring-red-500/20 shadow-lg shadow-red-600/30'
                          : isDone
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs mt-3 font-semibold ${
                        isActive ? 'text-white' : isDone ? 'text-zinc-300' : 'text-zinc-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{step.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notice for Developer */}
        <div className="mt-4 p-4 rounded-xl bg-zinc-800/40 border border-zinc-800 text-xs text-zinc-400">
          <p className="font-semibold text-zinc-300 mb-1">Developer Implementation Checklist:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Connect to walker: <code className="text-red-400 font-mono">track_order(order_id)</code> via <code className="text-zinc-300 font-mono">jacClient.callWalker</code></li>
            <li>Hydrate the <code className="text-red-400 font-mono">Order</code> node schema (status, items, total_price, eta_minutes)</li>
            <li>Add live polling or polling interval for status updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Tracker;
