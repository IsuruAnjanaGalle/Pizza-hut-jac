import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Layers,
  Server,
  Flame,
  Clock,
  Truck,
  ShoppingBag,
  RotateCcw,
  Check,
  ChevronRight,
  Pizza,
} from 'lucide-react';
import { callWalker } from '../api/jacClient';

interface PizzaRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  prices: Record<string, number>;
  image_url: string;
}

interface OrderInfo {
  order_id: string;
  status: string;
  eta_minutes: number;
  total_price: number;
  items: Array<{
    name: string;
    size: string;
    qty: number;
    unit_price: number;
  }>;
  updated_at?: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  recommendations?: PizzaRecommendation[];
  orderInfo?: OrderInfo;
  source?: string;
}

export const AiChat: React.FC = () => {
  const [sessionId] = useState<string>(() => `sess_${Math.random().toString(36).substring(2, 9)}`);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, string>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'ai',
      text: "👋 **Welcome to Pizza Hut! I'm HutBot, your AI Pizza Concierge & Support specialist.**\n\nI have direct access to our live stone-oven kitchen graph! Here is what I can help you with:\n• 🍕 **Personalized Recommendations:** Budget, party size, crust combos, and spice preferences.\n• 💰 **Exact Pricing & Sizes:** Instant answers for Personal (Small), Medium, and Large.\n• 📦 **Live Order Tracking:** Ask *'Where is my pizza?'* to check real-time oven & delivery ETA.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'jac_graph',
    },
  ]);

  const quickPrompts = [
    { label: '🌶️ Recommend a spicy pizza under 2500', query: 'Recommend a spicy pizza under 2500' },
    { label: '💰 What sizes & prices do you have?', query: 'What sizes & prices do you have?' },
    { label: '📦 Where is my current order?', query: 'Where is my current order?' },
    { label: '👨‍👩‍👧‍👦 Feeding a group of 4', query: 'What do you recommend for a group of 4 people?' },
    { label: '🌱 Any vegetarian options?', query: 'Show me vegetarian pizza options and prices' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsgId = `user_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call Jac walker chat_assistant
      const data = await callWalker('chat_assistant', {
        message: trimmed,
        session_id: sessionId,
      });

      // Jac reports format: response is in reports[0] or direct data
      const payload = data.reports?.[0] || data.data || data;

      const aiReplyText =
        payload.response ||
        payload.message ||
        "I'm here to help! Could you specify your pizza preferences or order details?";

      const recommendations: PizzaRecommendation[] = payload.recommendations || [];
      const orderInfo: OrderInfo | undefined =
        payload.order_info && Object.keys(payload.order_info).length > 0
          ? payload.order_info
          : undefined;

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendations,
        orderInfo,
        source: payload.source || 'jac_byllm',
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.warn('Backend call failed, triggering frontend fallback for demo resilience:', err);

      // Client-side fallback if backend server is not running
      const fallbackPayload = generateLocalFallback(trimmed);
      const fallbackAiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: fallbackPayload.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendations: fallbackPayload.recommendations,
        orderInfo: fallbackPayload.orderInfo,
        source: 'client_fallback',
      };

      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Local fallback if Jac scale server isn't actively running
  const generateLocalFallback = (query: string) => {
    const q = query.toLowerCase();

    if (q.includes('where') || q.includes('order') || q.includes('track') || q.includes('status')) {
      return {
        text: "🍕 **Great news! Here is your live order update from our graph:**\n\n• **Order ID:** `PH-8942-X`\n• **Current Status:** 🔥 **Baking in Oven**\n• **Estimated Arrival:** ⏱️ **18 minutes**\n• **Items:** Spicy Chicken Pan (Medium), Garlic Bread Supreme (Regular)\n• **Total:** Rs. 2,800.00\n\nOur delivery rider is assigned and will be on the road shortly!",
        recommendations: [],
        orderInfo: {
          order_id: 'PH-8942-X',
          status: 'Baking in Oven',
          eta_minutes: 18,
          total_price: 2800,
          items: [
            { name: 'Spicy Chicken Pan', size: 'Medium', qty: 1, unit_price: 2150 },
            { name: 'Garlic Bread Supreme', size: 'Regular', qty: 1, unit_price: 650 },
          ],
        },
      };
    }

    if (q.includes('price') || q.includes('size') || q.includes('how much') || q.includes('cost')) {
      return {
        text: "🍕 **Pizza Hut Sizes & Pricing Guide:**\n\n• **Personal / Small (6\")**: 4 slices (1 Person) — starting from **Rs. 850**\n• **Medium (9\")**: 6 slices (2–3 People) — starting from **Rs. 1,650**\n• **Large (12\")**: 8 slices (4–5 People) — starting from **Rs. 2,450**\n\nExplore our chef specials below with exact sizes and prices:",
        recommendations: [
          {
            id: 'p_spicy_chicken',
            name: 'Spicy Chicken Pan',
            category: 'Spicy Non-Veg',
            description: 'Fiery seasoned chicken slices, fiery green chillies, spicy tomato drizzle, and melted mozzarella.',
            prices: { personal: 1150, medium: 2150, large: 3200 },
            image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
          },
          {
            id: 'p_pepperoni',
            name: "Pepperoni Lover's",
            category: 'Classic Meat',
            description: 'Double portions of savory pepperoni baked with 100% real golden mozzarella.',
            prices: { personal: 1100, medium: 2100, large: 3100 },
            image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
          },
        ],
        orderInfo: undefined,
      };
    }

    return {
      text: "🌶️ **Craving something spicy under Rs. 2,500?**\n\nHere are sizzling hot favorites that fit your budget directly from our stone-oven menu:",
      recommendations: [
        {
          id: 'p_spicy_chicken',
          name: 'Spicy Chicken Pan',
          category: 'Spicy Non-Veg',
          description: 'Fiery seasoned chicken slices, fiery green chillies, spicy tomato drizzle, and melted mozzarella.',
          prices: { personal: 1150, medium: 2150, large: 3200 },
          image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
        },
        {
          id: 'p_veggie',
          name: 'Fiery Veggie Delight',
          category: 'Vegetarian',
          description: 'Crisp bell peppers, button mushrooms, spicy red paprika, black olives, and golden corn.',
          prices: { personal: 950, medium: 1850, large: 2750 },
          image_url: 'https://images.unsplash.com/photo-1576458088443-04a19bb13da6?auto=format&fit=crop&w=600&q=80',
        },
      ],
      orderInfo: undefined,
    };
  };

  const handleAddToCart = (pizza: PizzaRecommendation, size: string) => {
    const key = `${pizza.id}_${size}`;
    setAddedItems((prev) => ({ ...prev, [key]: 'added' }));
    setTimeout(() => {
      setAddedItems((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }, 2500);
  };

  // Helper to format basic markdown formatting (bold, bullet points, headers, inline code)
  const renderFormattedMarkdown = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-1.5 leading-relaxed">
        {lines.map((line, index) => {
          if (!line.trim()) {
            return <div key={index} className="h-1.5" />;
          }

          // Bullet points
          if (line.startsWith('• ') || line.startsWith('- ')) {
            const bulletText = line.substring(2);
            return (
              <div key={index} className="flex items-start gap-2 pl-1 my-0.5">
                <span className="text-[#E31837] font-bold select-none">•</span>
                <span>{parseInlineFormatting(bulletText)}</span>
              </div>
            );
          }

          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={index} className="text-sm font-bold text-white mt-2 mb-1">
                {parseInlineFormatting(line.substring(4))}
              </h4>
            );
          }

          return <p key={index}>{parseInlineFormatting(line)}</p>;
        })}
      </div>
    );
  };

  // Format bold and inline code inside lines
  const parseInlineFormatting = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800 text-red-300 font-mono text-[11px] border border-zinc-700/60"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'ai',
        text: "👋 Chat reset! I'm HutBot, your Pizza Hut AI Concierge. What pizza can I find or customize for you today?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'jac_graph',
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-5.5rem)]">
      {/* Developer Contract Banner */}
      <div className="mb-4 p-3.5 rounded-xl border border-dashed border-red-500/30 bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-red-600/20 text-[#E31837]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white">Developer 3: AI Concierge & Chatbot Module</h2>
            <p className="text-[11px] text-zinc-400">
              Contract Node: <code className="text-red-300 font-mono">ChatSession</code> | Walker: <code className="text-red-300 font-mono">backend/walkers_chat.jac</code> (<code className="text-red-300 font-mono">chat_assistant</code>)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Server className="w-3 h-3 text-emerald-400" />
          <span>Endpoint: /walker/chat_assistant</span>
        </div>
      </div>

      {/* Chat Container Card */}
      <div className="flex-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-2xl relative">
        {/* Chat Header */}
        <div className="p-4 sm:px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E31837] to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-900 ring-2 ring-emerald-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">HutBot Concierge</h3>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Jaseci byLLM
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Live Kitchen Graph • Session: <span className="font-mono text-zinc-300">{sessionId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title="Reset conversation"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-[#E31837] text-white shadow-md shadow-red-600/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble + Extra Content */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] flex flex-col gap-2.5 ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Bubble Text */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#E31837] text-white rounded-tr-none shadow-md shadow-red-950/40'
                      : 'bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 rounded-tl-none shadow-lg'
                  }`}
                >
                  {renderFormattedMarkdown(msg.text)}

                  <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-white/10 text-[10px]">
                    <span className={msg.sender === 'user' ? 'text-red-200' : 'text-zinc-500'}>
                      {msg.time}
                    </span>
                    {msg.source && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 opacity-80">
                        {msg.source}
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Order Info Card (if returned) */}
                {msg.orderInfo && (
                  <div className="w-full bg-gradient-to-br from-zinc-900 to-zinc-950 border border-red-500/40 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-red-600/20 text-[#E31837]">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                            Live Order Tracking
                          </span>
                          <span className="text-xs font-bold text-white font-mono">
                            #{msg.orderInfo.order_id}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1.5">
                        <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                        {msg.orderInfo.status}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Estimated Arrival:</span>
                      </div>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        ⏱️ {msg.orderInfo.eta_minutes} mins
                      </span>
                    </div>

                    {/* Stepper Progress Visual */}
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-3">
                      <div className="bg-gradient-to-r from-red-600 to-amber-500 h-1.5 w-2/3 animate-pulse" />
                    </div>

                    {/* Order Items Preview */}
                    <div className="bg-zinc-800/50 rounded-xl p-2.5 text-[11px] space-y-1">
                      {msg.orderInfo.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-zinc-300">
                          <span>
                            {it.qty}x {it.name} <span className="text-zinc-500">({it.size})</span>
                          </span>
                          <span className="font-mono text-zinc-400">
                            Rs. {(it.qty * it.unit_price).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-white pt-1.5 border-t border-zinc-700/60">
                        <span>Total</span>
                        <span className="text-red-400 font-mono">
                          Rs. {msg.orderInfo.total_price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Pizza Recommendation Cards (if returned) */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {msg.recommendations.map((pizza) => {
                      const activeSize = selectedSizes[pizza.id] || 'medium';
                      const currentPrice =
                        pizza.prices[activeSize] ||
                        pizza.prices['personal'] ||
                        pizza.prices['small'] ||
                        Object.values(pizza.prices)[0] ||
                        0;
                      const cartKey = `${pizza.id}_${activeSize}`;
                      const isAdded = addedItems[cartKey] === 'added';

                      return (
                        <div
                          key={pizza.id}
                          className="bg-zinc-900 border border-zinc-800 hover:border-red-600/40 rounded-2xl p-3.5 transition-all duration-200 flex flex-col justify-between shadow-md group"
                        >
                          <div>
                            {/* Card Top: Image + Tag */}
                            <div className="relative h-28 w-full rounded-xl overflow-hidden mb-2.5 bg-zinc-800">
                              <img
                                src={pizza.image_url}
                                alt={pizza.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  // Fallback placeholder if image load fails
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
                                }}
                              />
                              <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 text-red-300 backdrop-blur-md border border-white/10">
                                {pizza.category}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                              {pizza.name}
                            </h4>
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {pizza.description}
                            </p>
                          </div>

                          {/* Size Selector Pills */}
                          <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                            <div className="flex items-center gap-1.5 mb-2.5">
                              {['personal', 'medium', 'large'].map((sz) => {
                                if (!pizza.prices[sz] && !pizza.prices[sz === 'personal' ? 'small' : sz]) return null;
                                const isSelected = activeSize === sz;
                                return (
                                  <button
                                    key={sz}
                                    onClick={() => setSelectedSizes((prev) => ({ ...prev, [pizza.id]: sz }))}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold capitalize transition-colors ${
                                      isSelected
                                        ? 'bg-[#E31837] text-white shadow-sm'
                                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    {sz === 'personal' ? 'Small' : sz}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Price & Add Button */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-500 block -mb-0.5">Price</span>
                                <span className="text-xs font-extrabold text-white font-mono">
                                  Rs. {currentPrice.toLocaleString()}
                                </span>
                              </div>

                              <button
                                onClick={() => handleAddToCart(pizza, activeSize)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#E31837] hover:bg-red-700 text-white shadow-sm shadow-red-600/30'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Added!</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3 h-3" />
                                    <span>Add to Cart</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#E31837] text-white flex items-center justify-center text-xs shrink-0 shadow-md shadow-red-600/30">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-zinc-800/90 text-zinc-300 border border-zinc-700/60 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-zinc-400 text-[11px] ml-1">
                  HutBot is consulting the live kitchen graph...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Suggestion Chips */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[11px] font-semibold text-zinc-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#E31837]" />
            Suggestions:
          </span>
          {quickPrompts.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.query)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-750 transition-all shrink-0 border border-zinc-700/60 hover:border-red-500/50 flex items-center gap-1 group active:scale-95"
            >
              <span>{chip.label}</span>
              <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-red-400 transition-colors" />
            </button>
          ))}
        </div>

        {/* Input Bar Form */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-900/95 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2.5"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask HutBot anything (e.g. 'Recommend a spicy pizza under 2500', 'Where is my pizza?')..."
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-800/90 border border-zinc-700/70 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <Pizza className="w-4 h-4 opacity-40" />
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-[#E31837] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-red-600/30 active:scale-95 shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
