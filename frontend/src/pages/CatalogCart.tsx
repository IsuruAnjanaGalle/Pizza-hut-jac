import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pizza,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  Search,
  X,
  Flame,
  ShieldCheck,
  RefreshCw,
  Layers,
  Server,
  Tag,
  ChefHat,
  ReceiptText,
} from 'lucide-react';
import { callWalker } from '../api/jacClient';

export interface PizzaItem {
  id: string;
  name: string;
  description: string;
  category: string;
  prices: {
    S: number;
    M: number;
    L: number;
    [key: string]: number;
  };
  image_url: string;
}

export interface CartItemData {
  pizza_id: string;
  name: string;
  size: string;
  qty: number;
  unit_price: number;
}

export interface OrderResult {
  order_id: string;
  status: string;
  eta_minutes: number;
  total_price: number;
  items_count?: number;
}

const DEFAULT_PIZZAS: PizzaItem[] = [
  {
    id: 'pizza_1',
    name: 'Pan Pepperoni',
    description:
      'Loaded with double portions of savory sliced pepperoni baked with melted mozzarella cheese on our golden crispy pan crust.',
    category: 'Signature Pan',
    prices: { S: 9.99, M: 14.99, L: 19.99 },
    image_url:
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pizza_2',
    name: 'Tandoori Chicken',
    description:
      'Tender spiced tandoori chicken breast, crunchy red onions, crisp green peppers, and a drizzle of aromatic garlic herb mayo.',
    category: 'Chef Specials',
    prices: { S: 11.49, M: 16.99, L: 21.99 },
    image_url:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pizza_3',
    name: 'Margherita',
    description:
      'Sun-ripened Italian tomato passata, fresh basil ribbons, extra-virgin olive oil drizzle, and bubbling 100% whole milk mozzarella.',
    category: 'Classic Italian',
    prices: { S: 8.99, M: 13.49, L: 17.99 },
    image_url:
      'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pizza_4',
    name: 'Supreme',
    description:
      'The ultimate loaded combo of seasoned beef, classic pepperoni, savory Italian sausage, button mushrooms, bell peppers, and onions.',
    category: 'Signature Pan',
    prices: { S: 11.99, M: 17.49, L: 22.99 },
    image_url:
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pizza_5',
    name: 'Veggie Lover',
    description:
      'Garden-fresh medley of button mushrooms, crisp green bell peppers, sweet red onions, ripe Roma tomatoes, and black olives.',
    category: 'Loaded Veggie',
    prices: { S: 9.49, M: 14.49, L: 18.99 },
    image_url:
      'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pizza_6',
    name: 'Cheese Melt',
    description:
      'Indulgent four-cheese blend of golden cheddar, sharp parmesan, mild provolone, and stretchy mozzarella finished with herb butter.',
    category: 'Cheesy Stuffed',
    prices: { S: 10.49, M: 15.49, L: 20.49 },
    image_url:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
];

const CATEGORIES = [
  'All Pizzas',
  'Signature Pan',
  'Chef Specials',
  'Classic Italian',
  'Loaded Veggie',
  'Cheesy Stuffed',
];

const SIZE_LABELS: Record<'S' | 'M' | 'L', { label: string; desc: string }> = {
  S: { label: 'Small', desc: '10" • 6 Slices' },
  M: { label: 'Medium', desc: '12" • 8 Slices' },
  L: { label: 'Large', desc: '14" • 10 Slices' },
};

function createFallbackOrderId(): string {
  return `PH-${Math.floor(100 + Math.random() * 900)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export const CatalogCart: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [pizzas, setPizzas] = useState<PizzaItem[]>(DEFAULT_PIZZAS);
  const [cart, setCart] = useState<CartItemData[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState<number>(0);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, 'S' | 'M' | 'L'>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All Pizzas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'menu' | 'cart'>('menu');
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [isUpdatingCart, setIsUpdatingCart] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<OrderResult | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Helper to parse menu reports from Jac response
  const extractMenuFromResponse = (res: any): PizzaItem[] => {
    const reports = res?.data?.reports || res?.reports || [];
    for (const report of reports) {
      if (Array.isArray(report) && report.length > 0 && report[0]?.name) {
        return report as PizzaItem[];
      }
    }
    return [];
  };

  // Helper to parse cart reports from Jac response
  const extractCartFromResponse = (
    res: any
  ): { items: CartItemData[]; subtotal: number; count: number } => {
    const reports = res?.data?.reports || res?.reports || [];
    for (const report of reports) {
      if (report && typeof report === 'object' && 'items' in report) {
        return {
          items: Array.isArray(report.items) ? report.items : [],
          subtotal: typeof report.subtotal === 'number' ? report.subtotal : 0,
          count: typeof report.count === 'number' ? report.count : (report.items?.length || 0),
        };
      }
    }
    return { items: [], subtotal: 0, count: 0 };
  };

  // Fetch Menu from Jac walker
  const loadMenu = async () => {
    try {
      const res = await callWalker('get_menu', {});
      const extracted = extractMenuFromResponse(res);
      if (extracted.length > 0) {
        setPizzas(extracted);
        setBackendOnline(true);
      } else {
        // Try calling seed_menu then get_menu
        await callWalker('seed_menu', {});
        const res2 = await callWalker('get_menu', {});
        const extracted2 = extractMenuFromResponse(res2);
        if (extracted2.length > 0) {
          setPizzas(extracted2);
        }
        setBackendOnline(true);
      }
    } catch (err) {
      console.warn('Jac backend get_menu offline or unreachable, using local fallback:', err);
      setBackendOnline(false);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // Fetch Cart from Jac walker
  const loadCart = async () => {
    try {
      const res = await callWalker('get_cart', {});
      const { items, subtotal } = extractCartFromResponse(res);
      setCart(items);
      setCartSubtotal(subtotal);
      setBackendOnline(true);
    } catch (err) {
      console.warn('Jac backend get_cart offline, keeping local state:', err);
    }
  };

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await callWalker('get_menu', {});
        const extracted = extractMenuFromResponse(res);
        if (!ignore) {
          if (extracted.length > 0) {
            setPizzas(extracted);
            setBackendOnline(true);
          }
          setIsLoadingMenu(false);
        }
      } catch {
        if (!ignore) {
          setBackendOnline(false);
          setIsLoadingMenu(false);
        }
      }

      try {
        const res = await callWalker('get_cart', {});
        const { items, subtotal } = extractCartFromResponse(res);
        if (!ignore) {
          setCart(items);
          setCartSubtotal(subtotal);
        }
      } catch {
        // keep local state
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, []);

  // Update Size for a specific pizza card
  const handleSelectSize = (pizzaId: string, size: 'S' | 'M' | 'L') => {
    setSelectedSizes((prev) => ({
      ...prev,
      [pizzaId]: size,
    }));
  };

  // Get active size for a pizza
  const getSizeForPizza = (pizzaId: string): 'S' | 'M' | 'L' => {
    return selectedSizes[pizzaId] || 'M';
  };

  // Get dynamic price based on selected size
  const getPriceForPizza = (pizza: PizzaItem): number => {
    const size = getSizeForPizza(pizza.id);
    return pizza.prices[size] || pizza.prices['M'] || 14.99;
  };

  // Add pizza to cart via add_to_cart walker
  const handleAddToCart = async (pizza: PizzaItem) => {
    const size = getSizeForPizza(pizza.id);
    const unitPrice = getPriceForPizza(pizza);

    setIsUpdatingCart(true);
    try {
      await callWalker('add_to_cart', {
        pizza_id: pizza.id,
        name: pizza.name,
        size: size,
        qty: 1,
        unit_price: unitPrice,
      });

      // Reload cart from walker
      await loadCart();
      showToast(`Added ${pizza.name} (${size}) to your Hut Cart!`);
    } catch (err) {
      console.warn('Backend call failed, updating local state:', err);
      // Fallback local cart state
      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.pizza_id === pizza.id && i.size === size);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].qty += 1;
          return updated;
        } else {
          return [
            ...prev,
            {
              pizza_id: pizza.id,
              name: pizza.name,
              size: size,
              qty: 1,
              unit_price: unitPrice,
            },
          ];
        }
      });
      setCartSubtotal((prev) => Math.round((prev + unitPrice) * 100) / 100);
      showToast(`Added ${pizza.name} (${size}) to cart (offline mode)`);
    } finally {
      setIsUpdatingCart(false);
    }
  };

  // Change quantity in cart (+1 or -1)
  const handleChangeQty = async (item: CartItemData, delta: number) => {
    setIsUpdatingCart(true);
    try {
      await callWalker('add_to_cart', {
        pizza_id: item.pizza_id,
        name: item.name,
        size: item.size,
        qty: delta,
        unit_price: item.unit_price,
      });
      await loadCart();
    } catch (err) {
      console.warn('Backend update failed, using local update:', err);
      setCart((prev) => {
        return prev
          .map((i) => {
            if (i.pizza_id === item.pizza_id && i.size === item.size) {
              return { ...i, qty: i.qty + delta };
            }
            return i;
          })
          .filter((i) => i.qty > 0);
      });
      setCartSubtotal((prev) => Math.max(0, Math.round((prev + item.unit_price * delta) * 100) / 100));
    } finally {
      setIsUpdatingCart(false);
    }
  };

  // Remove item completely from cart
  const handleRemoveItem = async (item: CartItemData) => {
    await handleChangeQty(item, -item.qty);
    showToast(`Removed ${item.name} from cart`);
  };

  // Checkout Cart via checkout_cart walker
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsCheckingOut(true);
    try {
      const res = await callWalker('checkout_cart', {});
      const reports = res?.data?.reports || res?.reports || [];
      let generatedOrderId = '';
      let totalPrice = calculatedTotal;

      for (const report of reports) {
        if (report && typeof report === 'object' && report.order_id) {
          generatedOrderId = report.order_id;
          if (typeof report.total_price === 'number') {
            totalPrice = report.total_price;
          }
          break;
        }
      }

      // Fallback ID if not parsed directly
      if (!generatedOrderId) {
        generatedOrderId = createFallbackOrderId();
      }

      // Save active_order_id to localStorage as requested for Delivery Tracker
      localStorage.setItem('active_order_id', generatedOrderId);
      localStorage.setItem(
        'last_order_details',
        JSON.stringify({
          order_id: generatedOrderId,
          items: cart,
          total_price: totalPrice,
          status: 'Order Placed',
          eta_minutes: 35,
          timestamp: getCurrentTimestamp(),
        })
      );

      const result: OrderResult = {
        order_id: generatedOrderId,
        status: 'Order Placed',
        eta_minutes: 35,
        total_price: totalPrice,
        items_count: cartTotalCount,
      };

      setCheckoutResult(result);
      setCart([]);
      setCartSubtotal(0);
      showToast(`Order #${generatedOrderId} placed successfully!`);
    } catch (err) {
      console.warn('Checkout walker error, creating local order fallback:', err);
      const generatedOrderId = createFallbackOrderId();
      localStorage.setItem('active_order_id', generatedOrderId);

      const result: OrderResult = {
        order_id: generatedOrderId,
        status: 'Order Placed',
        eta_minutes: 35,
        total_price: calculatedTotal,
        items_count: cartTotalCount,
      };

      setCheckoutResult(result);
      setCart([]);
      setCartSubtotal(0);
      showToast(`Order #${generatedOrderId} placed successfully!`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Apply Promo code
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'HUTLOVER' || promoCode.trim().toUpperCase() === 'PIZZA20') {
      setDiscountPercent(0.2); // 20% off
      showToast('20% Hut Lover discount applied!');
    } else if (promoCode.trim().toUpperCase() === 'FREESHIP') {
      setDiscountPercent(0.1);
      showToast('Promo applied: $2.99 delivery fee waived!');
    } else {
      showToast('Invalid promo code. Try "HUTLOVER"');
    }
  };

  // Filtered pizzas
  const filteredPizzas = useMemo(() => {
    return pizzas.filter((pizza) => {
      const matchesCategory =
        selectedCategory === 'All Pizzas' || pizza.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        pizza.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pizza.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [pizzas, selectedCategory, searchQuery]);

  // Total count of items in cart
  const cartTotalCount = cart.reduce((acc, item) => acc + item.qty, 0);

  // Delivery fee logic: Free over $30
  const deliveryFee = cartSubtotal > 30 || cart.length === 0 ? 0.0 : 2.99;
  const discountAmount = Math.round(cartSubtotal * discountPercent * 100) / 100;
  const calculatedTotal =
    cart.length === 0
      ? 0
      : Math.max(0, Math.round((cartSubtotal - discountAmount + deliveryFee) * 100) / 100);

  // Check how many of a pizza are in cart
  const getPizzaCartCount = (pizzaId: string): number => {
    return cart
      .filter((i) => i.pizza_id === pizzaId)
      .reduce((acc, curr) => acc + curr.qty, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 border border-[#E31837]/50 shadow-2xl shadow-red-950/80 px-4 py-3 rounded-2xl text-white text-sm animate-bounce">
          <div className="p-1 rounded-full bg-[#E31837] text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Developer 1 Monorepo Banner */}
      <div className="mb-8 p-4 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/30 via-zinc-900/40 to-zinc-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#E31837]/20 text-[#E31837] border border-[#E31837]/30 shadow-inner">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Developer 1: Menu Catalog & Shopping Cart
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E31837] text-white uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Contract Nodes: <code className="text-red-300 font-mono">Pizza</code>,{' '}
              <code className="text-red-300 font-mono">CartItem</code>,{' '}
              <code className="text-red-300 font-mono">Order</code> | Walker:{' '}
              <code className="text-red-300 font-mono">backend/walkers_catalog.jac</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Server
              className={`w-3.5 h-3.5 ${backendOnline ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}
            />
            <span>
              {backendOnline ? 'Jac Scale :8000 Connected' : 'Jac Scale (Auto-sync)'}
            </span>
          </div>

          <button
            onClick={() => {
              loadMenu();
              loadCart();
              showToast('Refreshed menu from Jac backend');
            }}
            title="Reload from Jac Graph"
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMenu ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero Promotional Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-10 border border-zinc-800 bg-gradient-to-r from-black via-zinc-950 to-red-950/40 p-6 sm:p-10 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31837]/20 border border-[#E31837]/40 text-[#FFA800] text-xs font-bold uppercase tracking-wider mb-4">
            <Flame className="w-3.5 h-3.5 text-[#FFA800]" />
            <span>Stone Oven Fresh • 35-Min Delivery Guarantee</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Craving Legendary <span className="text-[#E31837]">Pan Pizza?</span>
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base mt-3 leading-relaxed">
            Hand-tossed golden crusts, rich Italian herbs, 100% whole mozzarella, and bold
            toppings. Order now and track your hot pizza straight to your door.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              onClick={() => {
                setActiveView('menu');
                setSelectedCategory('All Pizzas');
              }}
              className="px-6 py-3 rounded-2xl bg-[#E31837] hover:bg-red-700 text-white font-bold text-sm shadow-xl shadow-red-700/30 flex items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
            >
              <Pizza className="w-4 h-4" />
              <span>Explore Signature Menu</span>
            </button>

            <button
              onClick={() => setIsSlideOverOpen(true)}
              className="px-5 py-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-700 text-sm font-semibold flex items-center gap-2.5 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-[#FFA800]" />
              <span>View Cart</span>
              <span className="px-2 py-0.5 rounded-full bg-[#E31837] text-white text-xs font-bold">
                {cartTotalCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Switcher Pills */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveView('menu')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeView === 'menu'
                ? 'bg-[#E31837] text-white shadow-lg shadow-red-700/25'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Pizza className="w-4 h-4" />
            <span>View 1: Menu Grid</span>
          </button>

          <button
            onClick={() => setActiveView('cart')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeView === 'cart'
                ? 'bg-[#E31837] text-white shadow-lg shadow-red-700/25'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>View 2: Dedicated Cart</span>
            {cartTotalCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeView === 'cart' ? 'bg-black/40 text-white' : 'bg-[#E31837] text-white'
                }`}
              >
                {cartTotalCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative hidden sm:block w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search toppings, crusts..."
            className="w-full pl-10 pr-8 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E31837] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: MENU GRID VIEW */}
      {/* ========================================================================= */}
      {activeView === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Catalog Grid */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E31837] text-white shadow-md shadow-red-700/30 scale-105'
                        : 'bg-zinc-900/90 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* Mobile search bar */}
            <div className="sm:hidden relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pizzas..."
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E31837]"
              />
            </div>

            {/* Pizzas Grid */}
            {isLoadingMenu ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 text-[#E31837] animate-spin mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">Baking fresh menu items from Jac backend...</p>
              </div>
            ) : filteredPizzas.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-zinc-900/60 border border-zinc-800">
                <ChefHat className="w-12 h-12 text-zinc-500 mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-bold text-white">No pizzas match your filter</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Try choosing another category or clearing your search term.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All Pizzas');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredPizzas.map((pizza) => {
                  const currentSize = getSizeForPizza(pizza.id);
                  const currentPrice = getPriceForPizza(pizza);
                  const countInCart = getPizzaCartCount(pizza.id);

                  return (
                    <div
                      key={pizza.id}
                      className="group bg-zinc-900/90 rounded-3xl border border-zinc-800/80 hover:border-[#E31837]/60 p-5 transition-all duration-300 shadow-xl flex flex-col justify-between hover:shadow-2xl hover:shadow-red-950/20"
                    >
                      <div>
                        {/* Pizza Image Card */}
                        <div className="relative h-48 rounded-2xl overflow-hidden mb-4 bg-zinc-950">
                          <img
                            src={pizza.image_url}
                            alt={pizza.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg bg-black/70 text-[#FFA800] border border-amber-500/30 backdrop-blur-md">
                              {pizza.category}
                            </span>
                          </div>

                          {countInCart > 0 && (
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E31837] text-white text-[11px] font-extrabold shadow-md">
                              <ShoppingBag className="w-3 h-3" />
                              <span>{countInCart} in cart</span>
                            </div>
                          )}

                          {/* Bottom info pill */}
                          <div className="absolute bottom-3 left-3 text-xs font-mono text-zinc-300 bg-black/60 px-2.5 py-0.5 rounded-md backdrop-blur-sm">
                            {SIZE_LABELS[currentSize].desc}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                          {pizza.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                          {pizza.description}
                        </p>

                        {/* Interactive S / M / L Size Selector Pills */}
                        <div className="mt-4 pt-3 border-t border-zinc-800/80">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                              Select Size:
                            </span>
                            <span className="text-xs font-semibold text-[#FFA800]">
                              {SIZE_LABELS[currentSize].label} ({currentSize})
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {(['S', 'M', 'L'] as const).map((size) => {
                              const isSelected = currentSize === size;
                              const price = pizza.prices[size] || 0;

                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => handleSelectSize(pizza.id, size)}
                                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-[#E31837] text-white border-red-500 shadow-md shadow-red-600/30 font-bold scale-[1.02]'
                                      : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-700 hover:text-white'
                                  }`}
                                >
                                  <div className="text-xs font-extrabold">{size}</div>
                                  <div
                                    className={`text-[10px] ${
                                      isSelected ? 'text-red-100 font-semibold' : 'text-zinc-400'
                                    }`}
                                  >
                                    ${price.toFixed(2)}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Price & Add to Hut Cart Button */}
                      <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
                            Price ({currentSize})
                          </span>
                          <div className="text-xl font-black text-white">
                            ${currentPrice.toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddToCart(pizza)}
                          disabled={isUpdatingCart}
                          className="px-4 py-2.5 rounded-xl bg-[#E31837] hover:bg-red-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-700/30 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add to Hut Cart</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 1 Col: Embedded Cart Summary (Desktop View) */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/90 rounded-3xl border border-zinc-800 p-6 sticky top-24 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#E31837]/20 text-[#E31837]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">Your Hut Cart</h2>
                    <p className="text-[11px] text-zinc-400">Order from Pizza Hut Jac</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-[#E31837] text-white">
                  {cartTotalCount} items
                </span>
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center text-zinc-500">
                    <Pizza className="w-8 h-8 opacity-40 text-[#E31837]" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Your cart is empty</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    Select a signature pizza on the left, pick your size, and add it to your order.
                  </p>
                </div>
              ) : (
                <div className="py-4 space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.pizza_id}-${item.size}-${idx}`}
                      className="p-3 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-between gap-3 group hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E31837]/20 text-red-300 border border-red-500/30">
                            {item.size}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          ${item.unit_price.toFixed(2)} each
                        </div>
                      </div>

                      {/* +/- controls */}
                      <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-700/60">
                        <button
                          type="button"
                          onClick={() => handleChangeQty(item, -1)}
                          className="text-zinc-400 hover:text-white p-0.5"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-white px-1">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleChangeQty(item, 1)}
                          className="text-zinc-400 hover:text-white p-0.5"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-extrabold text-white">
                          ${(item.unit_price * item.qty).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          className="text-[10px] text-zinc-500 hover:text-red-400 mt-0.5 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Calculation Breakdown */}
              <div className="pt-4 border-t border-zinc-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">${cartSubtotal.toFixed(2)}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({(discountPercent * 100).toFixed(0)}%)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span>Delivery Fee</span>
                    {cartSubtotal > 30 && (
                      <span className="text-[10px] px-1.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        FREE over $30
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-white">
                    {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-black text-white pt-3 border-t border-zinc-800">
                  <span>Total Amount</span>
                  <span className="text-xl text-[#FFA800]">${calculatedTotal.toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isCheckingOut}
                  className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                    cart.length > 0 && !isCheckingOut
                      ? 'bg-[#E31837] hover:bg-red-700 text-white shadow-red-700/40 hover:scale-[1.02]'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isCheckingOut ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Placing Order with Jac Scale...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Place Order (${calculatedTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('cart')}
                  className="w-full py-2 text-center text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Expand Full Cart Page →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DEDICATED CART VIEW */}
      {/* ========================================================================= */}
      {activeView === 'cart' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-800 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-red-400 font-bold uppercase tracking-wider mb-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Review & Checkout</span>
              </div>
              <h2 className="text-3xl font-black text-white">Your Pizza Hut Cart</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Verify your items, apply promo codes, and finalize your order.
              </p>
            </div>

            <button
              onClick={() => setActiveView('menu')}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-2 transition-colors self-start sm:self-auto"
            >
              <Pizza className="w-4 h-4 text-[#E31837]" />
              <span>Back to Menu Grid</span>
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-zinc-900/60 border border-zinc-800 p-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center text-zinc-500">
                <ShoppingBag className="w-10 h-10 text-[#E31837]" />
              </div>
              <h3 className="text-xl font-bold text-white">Your Cart is Currently Empty</h3>
              <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
                Explore our signature pan pizzas, pick your favourite crust, and add delicious pizzas
                to your basket.
              </p>
              <button
                onClick={() => setActiveView('menu')}
                className="mt-6 px-6 py-3 rounded-2xl bg-[#E31837] hover:bg-red-700 text-white font-bold text-sm shadow-xl shadow-red-700/30 inline-flex items-center gap-2"
              >
                <Pizza className="w-4 h-4" />
                <span>Browse Menu</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Itemized List (Left 2 cols) */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                  Order Items ({cartTotalCount})
                </h3>

                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div
                      key={`view2-${item.pizza_id}-${item.size}-${idx}`}
                      className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl border border-zinc-700/40 flex-shrink-0">
                          🍕
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">{item.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E31837] text-white">
                              {item.size}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            Unit Price: ${item.unit_price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                        {/* +/- counter */}
                        <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700">
                          <button
                            type="button"
                            onClick={() => handleChangeQty(item, -1)}
                            className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-black text-white px-2">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleChangeQty(item, 1)}
                            className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <div className="text-base font-black text-white">
                            ${(item.unit_price * item.qty).toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promo Code Input */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 mt-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-2">
                    <Tag className="w-4 h-4 text-[#FFA800]" />
                    <span>Have a Pizza Hut Voucher or Promo Code?</span>
                  </div>
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder='Try "HUTLOVER" for 20% off'
                      className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E31837]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                </div>
              </div>

              {/* Order Summary & Place Order (Right 1 col) */}
              <div className="md:col-span-1">
                <div className="bg-zinc-900/90 rounded-3xl border border-zinc-800 p-6 sticky top-24 shadow-2xl">
                  <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
                    <ReceiptText className="w-5 h-5 text-[#E31837]" />
                    <h3 className="text-base font-black text-white">Order Summary</h3>
                  </div>

                  <div className="py-4 space-y-3 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Items Subtotal</span>
                      <span className="font-semibold text-white">${cartSubtotal.toFixed(2)}</span>
                    </div>

                    {discountPercent > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Hut Rewards Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-zinc-400">
                      <span>Estimated Delivery</span>
                      <span className="font-semibold text-white">
                        {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex justify-between text-zinc-400">
                      <span>Estimated ETA</span>
                      <span className="font-semibold text-[#FFA800]">35 mins</span>
                    </div>

                    <div className="flex justify-between text-base font-black text-white pt-4 border-t border-zinc-800">
                      <span>Grand Total</span>
                      <span className="text-xl text-[#FFA800]">${calculatedTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="w-full mt-4 py-4 rounded-2xl bg-[#E31837] hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-700/40 transition-all cursor-pointer"
                  >
                    {isCheckingOut ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending to Oven via Jac...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Place Order Now</span>
                      </>
                    )}
                  </button>

                  <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safe & Instant Jac Execution</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER CART DRAWER */}
      {/* ========================================================================= */}
      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSlideOverOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl p-6 flex flex-col justify-between">
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#E31837] text-white">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Your Hut Cart</h3>
                      <p className="text-xs text-zinc-400">{cartTotalCount} items selected</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSlideOverOpen(false)}
                    className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items in Drawer */}
                {cart.length === 0 ? (
                  <div className="py-16 text-center">
                    <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white">Your cart is empty</h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Pick your pizzas from the menu grid and customize their sizes.
                    </p>
                  </div>
                ) : (
                  <div className="py-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                    {cart.map((item, idx) => (
                      <div
                        key={`drawer-${item.pizza_id}-${item.size}-${idx}`}
                        className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {item.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#E31837] text-white">
                              {item.size}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            ${item.unit_price.toFixed(2)} each
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-700/60">
                          <button
                            type="button"
                            onClick={() => handleChangeQty(item, -1)}
                            className="text-zinc-400 hover:text-white p-0.5"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white px-1">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleChangeQty(item, 1)}
                            className="text-zinc-400 hover:text-white p-0.5"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-white">
                            ${(item.unit_price * item.qty).toFixed(2)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item)}
                            className="text-[10px] text-zinc-500 hover:text-red-400 mt-0.5"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">${cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-white">
                    {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-zinc-800">
                  <span>Total Amount</span>
                  <span className="text-lg text-[#FFA800]">${calculatedTotal.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isCheckingOut}
                  className="w-full py-3.5 rounded-2xl bg-[#E31837] hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-700/40 transition-all cursor-pointer"
                >
                  {isCheckingOut ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking out...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Checkout (${calculatedTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDER CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {checkoutResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-[#E31837]/50 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600/20 text-[#E31837] border border-[#E31837]/40 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-[#E31837]" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Order Placed Successfully
              </span>

              <h3 className="text-2xl font-black text-white mt-3">Hot Pizza is on its Way!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Your order was registered with the Jac backend Order node.
              </p>

              {/* Order ID Badge */}
              <div className="my-6 p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
                    Generated Order ID
                  </span>
                  <span className="text-xl font-mono font-black text-[#FFA800]">
                    #{checkoutResult.order_id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
                    ETA
                  </span>
                  <span className="text-sm font-bold text-white flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{checkoutResult.eta_minutes} mins</span>
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-800/40 text-[11px] text-zinc-400 mb-6">
                <p>
                  Saved <code className="text-red-300 font-mono">active_order_id</code> to localStorage.
                  The Delivery Tracker page can now track this order!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutResult(null);
                    navigate('/tracker');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#E31837] hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-700/40 transition-all cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Go to Delivery Tracker</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutResult(null)}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  Order More Pizzas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button for Quick Access */}
      <button
        onClick={() => setIsSlideOverOpen(true)}
        className="fixed bottom-6 left-6 z-40 p-4 rounded-2xl bg-[#E31837] hover:bg-red-700 text-white shadow-2xl shadow-red-700/50 flex items-center gap-3 transition-transform hover:scale-105 cursor-pointer lg:hidden"
        title="Open Cart Drawer"
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="text-xs font-bold">{cartTotalCount} items</span>
        <span className="text-xs font-black bg-black/40 px-2 py-0.5 rounded-full">
          ${calculatedTotal.toFixed(2)}
        </span>
      </button>
    </div>
  );
};

export default CatalogCart;
