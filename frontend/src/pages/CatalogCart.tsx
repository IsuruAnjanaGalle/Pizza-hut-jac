import React from 'react';
import { Pizza, ShoppingBag, Plus, Tag, Layers, Server } from 'lucide-react';

export const CatalogCart: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Developer Banner */}
      <div className="mb-8 p-4 rounded-xl border border-dashed border-red-500/40 bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-600/20 text-[#E31837]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Developer 1 Branch: Catalog & Cart Feature</h2>
            <p className="text-xs text-zinc-400">
              Contract Node: <code className="text-red-300 font-mono">Pizza</code>, <code className="text-red-300 font-mono">CartItem</code> | Walker: <code className="text-red-300 font-mono">backend/walkers_catalog.jac</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Endpoint: /walker/get_catalog</span>
        </div>
      </div>

      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Pizza className="w-8 h-8 text-[#E31837]" />
            Pizza Hut Menu & Cart
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse our signature pan pizzas, crust options, and chef specials.
          </p>
        </div>

        {/* Categories Placeholder */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {['All Pizzas', 'Signature Pan', 'Thin Crust', 'Loaded Veggie', 'Cheesy Stuffed'].map((category, idx) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                idx === 0
                  ? 'bg-[#E31837] text-white shadow-lg shadow-red-600/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Catalog (Left) + Cart Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Catalog Placeholder Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            {
              name: 'Super Supreme',
              category: 'Signature Pan',
              desc: 'Loaded with beef, pepperoni, sausage, mushrooms, bell peppers, onions and olives.',
              price: '$14.99',
              image: '🍕',
            },
            {
              name: 'Pepperoni Lover’s',
              category: 'Signature Pan',
              desc: 'Double portion of classic pepperoni baked with 100% real mozzarella cheese.',
              price: '$13.49',
              image: '🍕',
            },
            {
              name: 'Spicy Chicken Pan',
              category: 'Thin Crust',
              desc: 'Tender chicken slices, fiery jalapeños, red paprika, and tangy tomato drizzle.',
              price: '$12.99',
              image: '🍕',
            },
            {
              name: 'Veggie Fiesta',
              category: 'Loaded Veggie',
              desc: 'Fresh mushrooms, sweet corn, black olives, crisp onions, and herb seasoning.',
              price: '$11.99',
              image: '🍕',
            },
          ].map((pizza, idx) => (
            <div
              key={idx}
              className="group bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 hover:border-red-600/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-40 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-5xl mb-4 border border-zinc-800/50 group-hover:scale-[1.02] transition-transform">
                  {pizza.image}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/40">
                    {pizza.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                  {pizza.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {pizza.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400">Starting from</span>
                  <div className="text-lg font-extrabold text-white">{pizza.price}</div>
                </div>
                <button
                  disabled
                  className="cursor-not-allowed opacity-80 px-3.5 py-2 rounded-xl bg-[#E31837] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Drawer Placeholder */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#E31837]" />
                <h2 className="text-base font-bold text-white">Your Order</h2>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                0 items
              </span>
            </div>

            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center text-zinc-400">
                <ShoppingBag className="w-8 h-8 opacity-40" />
              </div>
              <h4 className="text-sm font-semibold text-white">Your cart is empty</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Cart functionality will be implemented by Developer 1 using the Jac CartItem model.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Subtotal</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Delivery Fee</span>
                <span>$2.99</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-800">
                <span>Total</span>
                <span className="text-red-400">$2.99</span>
              </div>

              <button
                disabled
                className="w-full mt-4 py-3 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4" />
                <span>Checkout (Placeholder)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogCart;
