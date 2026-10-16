import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Layers,
  Server,
  Loader2,
  ShoppingBag,
  Truck,
  Check,
  Flame,
  Leaf,
  ArrowRight,
} from 'lucide-react';
import { callWalker } from '../api/jacClient';

export interface PizzaCatalogItem {
  id: string;
  name: string;
  category: 'Classic' | 'Supreme' | 'Veggie';
  spicy: 'None' | 'Low' | 'Medium' | 'High';
  description: string;
  prices: { S: number; M: number; L: number };
}

export const PIZZA_CATALOG: PizzaCatalogItem[] = [
  {
    id: 'pizza_1',
    name: 'Pan Pepperoni',
    category: 'Classic',
    spicy: 'Low',
    description: 'Double portions of savory sliced pepperoni baked with extra mozzarella cheese on our golden pan crust.',
    prices: { S: 1200, M: 2200, L: 3200 },
  },
  {
    id: 'pizza_2',
    name: 'Tandoori Chicken',
    category: 'Supreme',
    spicy: 'High',
    description: 'Spicy tandoori chicken breast, crunchy red onions, green chilies, and garlic herb drizzle.',
    prices: { S: 1350, M: 2400, L: 3400 },
  },
  {
    id: 'pizza_3',
    name: 'Margherita',
    category: 'Classic',
    spicy: 'None',
    description: 'Sun-ripened Italian tomato passata, fresh basil ribbons, and 100% whole milk mozzarella.',
    prices: { S: 1000, M: 1800, L: 2600 },
  },
  {
    id: 'pizza_4',
    name: 'Supreme',
    category: 'Supreme',
    spicy: 'Medium',
    description: 'Loaded seasoned beef, classic pepperoni, button mushrooms, bell peppers, and crisp onions.',
    prices: { S: 1500, M: 2600, L: 3600 },
  },
  {
    id: 'pizza_5',
    name: 'Veggie Lover',
    category: 'Veggie',
    spicy: 'None',
    description: 'Mushrooms, black olives, onions, sweet corn, and ripe Roma tomatoes.',
    prices: { S: 1100, M: 2000, L: 2900 },
  },
  {
    id: 'pizza_6',
    name: 'Cheese Melt',
    category: 'Classic',
    spicy: 'None',
    description: '4-cheese blend of golden cheddar, parmesan, provolone, and stretchy mozzarella on stuffed crust.',
    prices: { S: 1250, M: 2300, L: 3300 },
  },
];

export interface ChatActionPayload {
  type?: 'pizza_card' | 'add_to_cart' | 'budget_list' | 'order_tracker' | 'group_combo' | 'preference' | 'full_menu';
  pizza?: PizzaCatalogItem | any;
  pizza_id?: string;
  name?: string;
  size?: 'S' | 'M' | 'L';
  price?: number;
  budget?: number;
  items?: Array<{ id: string; name: string; size: 'S' | 'M' | 'L'; price: number; spicy: string }>;
  order_id?: string;
  status?: string;
  eta_minutes?: number;
  people_count?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  suggestions?: string[];
  action?: ChatActionPayload;
}

// Markdown Formatter helper for text bubbles
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-zinc-200">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }

        // Parse bold segments (**bold**)
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const inner = part.slice(2, -2);
            return (
              <strong key={pIdx} className="font-bold text-white tracking-wide">
                {inner}
              </strong>
            );
          }
          return part;
        });

        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 text-[12px]">
              <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
              <span className="text-zinc-300">{renderedLine}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-[12px]">
            {renderedLine}
          </p>
        );
      })}
    </div>
  );
};

export const AiChat: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: "👋 **Welcome to Pizza Hut AI Concierge!**\nI can recommend pizzas based on toppings or spice, calculate group party combos, filter within your budget, or track your live delivery.\n\nTry asking me anything or pick a quick suggestion below!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        '🍕 Show full menu & prices',
        '🌶️ Spicy pizzas under 2500',
        '👨‍👩‍👧 Pizza combo for 4 people',
        '📦 Where is my order?',
      ],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Add item to cart with backend walker + localStorage sync
  const handleAddToCart = async (pizza: PizzaCatalogItem | any, size: 'S' | 'M' | 'L' = 'M', priceOverride?: number) => {
    const finalPrice = priceOverride || pizza.prices?.[size] || 2200;
    const pizzaName = pizza.name || 'Pizza';
    const pizzaId = pizza.id || 'pizza_custom';

    try {
      await callWalker('add_to_cart', {
        pizza_id: pizzaId,
        name: pizzaName,
        size,
        qty: 1,
        unit_price: finalPrice,
      });
    } catch (err) {
      console.warn('[AiChat] Backend add_to_cart error (updating local state):', err);
    }

    // Save to localStorage cart
    try {
      const existingRaw = localStorage.getItem('cart_items');
      const cartItems = existingRaw ? JSON.parse(existingRaw) : [];
      cartItems.push({
        pizza_id: pizzaId,
        name: pizzaName,
        size,
        qty: 1,
        unit_price: finalPrice,
      });
      localStorage.setItem('cart_items', JSON.stringify(cartItems));
      window.dispatchEvent(new Event('cart-updated'));
    } catch (e) {
      console.error('[AiChat] Cart storage error:', e);
    }

    showToast(`🛒 Added 1x ${pizzaName} (${size}) to your cart!`);
  };

  // Comprehensive local fallback matching engine
  const getLocalFallbackReply = (userText: string): { reply: string; suggestions?: string[]; action?: ChatActionPayload } => {
    const lower = userText.toLowerCase().trim();

    // 1. Direct Add to Cart / Order Intent
    if (lower.startsWith('add') || lower.startsWith('buy') || lower.includes('order a') || lower.includes('add to cart')) {
      let sizeChoice: 'S' | 'M' | 'L' = 'M';
      if (lower.includes('large') || lower.includes(' l ') || lower.endsWith(' l') || lower.includes('family')) {
        sizeChoice = 'L';
      } else if (lower.includes('small') || lower.includes(' s ') || lower.endsWith(' s') || lower.includes('personal')) {
        sizeChoice = 'S';
      }

      const matched = PIZZA_CATALOG.find(
        (p) => lower.includes(p.name.toLowerCase()) || lower.includes(p.name.split(' ')[0].toLowerCase())
      );

      if (matched) {
        const pr = matched.prices[sizeChoice];
        return {
          reply: `🛒 **Ready to Order**: ${matched.name} (${sizeChoice === 'S' ? 'Small' : sizeChoice === 'M' ? 'Medium' : 'Large'}) for **Rs. ${pr}**!\nClick below to confirm adding it directly to your cart:`,
          action: {
            type: 'add_to_cart',
            pizza_id: matched.id,
            name: matched.name,
            size: sizeChoice,
            price: pr,
          },
          suggestions: ['Check my cart', 'Show full menu', 'Where is my order?'],
        };
      }
    }

    // 2. Specific Pizza Query
    const matchedPizza = PIZZA_CATALOG.find((p) => {
      const key = p.name.toLowerCase();
      if (lower.includes('pepperoni') && key.includes('pepperoni')) return true;
      if (lower.includes('tandoori') && key.includes('tandoori')) return true;
      if (lower.includes('margherita') && key.includes('margherita')) return true;
      if (lower.includes('supreme') && key.includes('supreme')) return true;
      if ((lower.includes('veggie') || lower.includes('vegetable')) && key.includes('veggie')) return true;
      if ((lower.includes('cheese') || lower.includes('melt')) && key.includes('melt')) return true;
      return false;
    });

    if (matchedPizza && !lower.includes('menu') && !lower.includes('all') && !lower.includes('under') && !lower.includes('below')) {
      const p = matchedPizza;
      return {
        reply: `🍕 **${p.name}**\n• **Category**: ${p.category} | **Spice Level**: ${p.spicy}\n• **Description**: ${p.description}\n\n💰 **Exact Pricing**:\n• **Small (S)**: Rs. ${p.prices.S} (6 slices)\n• **Medium (M)**: Rs. ${p.prices.M} (8 slices)\n• **Large (L)**: Rs. ${p.prices.L} (10 slices)\n\nSelect a size below to add directly to your cart:`,
        action: {
          type: 'pizza_card',
          pizza: p,
        },
        suggestions: [`Add Small ${p.name}`, `Add Medium ${p.name}`, `Add Large ${p.name}`, 'Show full menu'],
      };
    }

    // 3. Budget & Price Filter
    const budgetMatch = lower.match(/(?:under|below|budget|within|less than|<)?\s*(\d{3,5})/);
    let budgetVal = 0;
    if (
      budgetMatch &&
      (lower.includes('under') ||
        lower.includes('below') ||
        lower.includes('budget') ||
        lower.includes('less') ||
        lower.includes('<') ||
        lower.includes('rs') ||
        lower.includes('for 2') ||
        lower.includes('for 1') ||
        lower.includes('for 3'))
    ) {
      const val = parseInt(budgetMatch[1], 10);
      if (val >= 500 && val <= 10000) {
        budgetVal = val;
      }
    }

    if (budgetVal > 0) {
      const matchingItems: Array<{ id: string; name: string; size: 'S' | 'M' | 'L'; price: number; spicy: string }> = [];
      PIZZA_CATALOG.forEach((p) => {
        (['S', 'M', 'L'] as const).forEach((sz) => {
          if (p.prices[sz] <= budgetVal) {
            matchingItems.push({
              id: p.id,
              name: p.name,
              size: sz,
              price: p.prices[sz],
              spicy: p.spicy,
            });
          }
        });
      });

      matchingItems.sort((a, b) => b.price - a.price);

      if (matchingItems.length > 0) {
        const topLines = matchingItems.slice(0, 6).map((item) => {
          const szLabel = item.size === 'S' ? 'Small' : item.size === 'M' ? 'Medium' : 'Large';
          return `• **${item.name} (${szLabel})**: Rs. ${item.price} (Spice: ${item.spicy})`;
        });

        return {
          reply: `💵 **Pizzas Within Your Budget of Rs. ${budgetVal}** (Best Value First):\n${topLines.join(
            '\n'
          )}\n\nClick any item below to add it straight to your cart:`,
          action: {
            type: 'budget_list',
            budget: budgetVal,
            items: matchingItems.slice(0, 4),
          },
          suggestions: [`Add ${matchingItems[0].name} (${matchingItems[0].size})`, 'Show full menu', 'Track my order'],
        };
      } else {
        return {
          reply: `💵 No pizzas found under Rs. ${budgetVal}. Our most affordable option is **Margherita (Small)** at **Rs. 1000**!`,
          suggestions: ['Margherita details', 'Pizzas under 2000', 'Show full menu'],
        };
      }
    }

    // 4. Group Size / Party Combo
    const peopleMatch = lower.match(/(\d+)\s*(?:people|person|pax|persons|friends)/);
    let peopleCount = 0;
    if (peopleMatch) {
      peopleCount = parseInt(peopleMatch[1], 10);
    } else if (lower.includes('couple') || lower.includes('two of us') || lower.includes('2 people')) {
      peopleCount = 2;
    } else if (lower.includes('family')) {
      peopleCount = 4;
    } else if (lower.includes('party') || lower.includes('gathering')) {
      peopleCount = 6;
    }

    if (peopleCount > 0) {
      if (peopleCount === 1) {
        return {
          reply:
            '👤 **Recommended for 1 Person**:\n• **1x Small Pizza** (6 slices)\n• Top pick: **Pan Pepperoni (Small)** for **Rs. 1200** or **Margherita (Small)** for **Rs. 1000**.\n\n💰 Total: **Rs. 1000 - 1200**.',
          suggestions: ['Add Small Pan Pepperoni', 'Add Small Margherita', 'Show full menu'],
        };
      }
      if (peopleCount === 2) {
        return {
          reply:
            '👥 **Recommended for 2 People (Couple Combo)**:\n• **1x Medium Pizza** (8 slices) or 2x Smalls\n• Top pick: **Tandoori Chicken (Medium)** for **Rs. 2400** or **Pan Pepperoni (Medium)** for **Rs. 2200**.\n\n💰 Total: **Rs. 2200 - 2400** (~Rs. 1100 per person).',
          suggestions: ['Add Medium Tandoori Chicken', 'Add Medium Pan Pepperoni', 'Show full menu'],
        };
      }
      if (peopleCount === 3) {
        return {
          reply:
            '👨‍👩‍👧 **Recommended for 3 People**:\n• **1x Large Pizza** (10 slices) or 1 Medium + 1 Small\n• Top pick: **Supreme (Large)** for **Rs. 3600** or **Pan Pepperoni (Large)** for **Rs. 3200**.\n\n💰 Total: **Rs. 3200 - 3600** (~Rs. 1100 per person).',
          suggestions: ['Add Large Pan Pepperoni', 'Add Large Supreme', 'Pizzas under 3500'],
        };
      }
      if (peopleCount === 4) {
        return {
          reply:
            '👨‍👩‍👧‍👦 **Recommended for 4 People (Family Feast)**:\n• **1x Large Pizza + 1x Medium Pizza** (18 slices total)\n• Combo: **1x Large Pan Pepperoni (Rs. 3200)** + **1x Medium Margherita (Rs. 1800)**.\n\n💰 Total: **Rs. 5000** (~Rs. 1250 per person).',
          action: {
            type: 'group_combo',
            people_count: 4,
          },
          suggestions: ['Add Large Pan Pepperoni', 'Add Medium Margherita', 'Show full menu'],
        };
      }
      const largeNeeded = Math.ceil((peopleCount * 2.5) / 10);
      const approxTotal = largeNeeded * 3300;
      return {
        reply: `🎉 **Recommended for Party of ${peopleCount} People**:\n• **${largeNeeded}x Large Pizzas** (~${largeNeeded * 10} slices)\n• Recommended Mix: 1x Supreme Large (Rs. 3600) + 1x Tandoori Chicken Large (Rs. 3400) + 1x Pan Pepperoni Large (Rs. 3200).\n\n💰 Total Approx: **Rs. ${approxTotal}** (~Rs. ${Math.round(
          approxTotal / peopleCount
        )} per person).`,
        suggestions: ['Show full menu', 'Track my order', 'Add Large Supreme'],
      };
    }

    // 5. Dietary Filters
    if (lower.includes('spicy') || lower.includes('hot')) {
      return {
        reply:
          '🌶️ **Spicy Pizza Recommendations**:\n1. **Tandoori Chicken** (Spice Level: **High**)\n   Spicy chicken breast, red onions, green chilies.\n   • S: **Rs. 1350** | M: **Rs. 2400** | L: **Rs. 3400**\n2. **Supreme** (Spice Level: **Medium**)\n   Seasoned beef, pepperoni, mushrooms, bell peppers.\n   • S: **Rs. 1500** | M: **Rs. 2600** | L: **Rs. 3600**',
        action: {
          type: 'pizza_card',
          pizza: PIZZA_CATALOG[1],
        },
        suggestions: ['Add Medium Tandoori Chicken', 'Add Medium Supreme', 'Pizzas under 2500'],
      };
    }

    if (lower.includes('chicken')) {
      return {
        reply:
          '🍗 **Chicken Favorite**:\n• **Tandoori Chicken** (Supreme Category | Spicy: High)\n  Spicy tandoori chicken, crunchy red onions, green chilies.\n  • Small (S): **Rs. 1350**\n  • Medium (M): **Rs. 2400**\n  • Large (L): **Rs. 3400**',
        action: {
          type: 'pizza_card',
          pizza: PIZZA_CATALOG[1],
        },
        suggestions: ['Add Medium Tandoori Chicken', 'Add Large Tandoori Chicken', 'Show full menu'],
      };
    }

    if (lower.includes('veg') || lower.includes('vegetarian')) {
      return {
        reply:
          '🥦 **Vegetarian Favorites (100% Meat-Free)**:\n1. **Veggie Lover** (Category: Veggie | Spice: None)\n   Mushrooms, black olives, onions, sweet corn, tomatoes.\n   • S: **Rs. 1100** | M: **Rs. 2000** | L: **Rs. 2900**\n2. **Margherita** (Category: Classic | Spice: None)\n   Classic Italian tomato passata & 100% mozzarella cheese.\n   • S: **Rs. 1000** | M: **Rs. 1800** | L: **Rs. 2600**',
        action: {
          type: 'pizza_card',
          pizza: PIZZA_CATALOG[4],
        },
        suggestions: ['Add Medium Veggie Lover', 'Add Medium Margherita', 'Show full menu'],
      };
    }

    if (lower.includes('meat') || lower.includes('beef')) {
      return {
        reply:
          '🥩 **Meat Lovers Favorites**:\n1. **Supreme** (Seasoned beef, pepperoni, mushrooms, peppers)\n   • S: **Rs. 1500** | M: **Rs. 2600** | L: **Rs. 3600**\n2. **Pan Pepperoni** (Loaded double pepperoni & extra cheese)\n   • S: **Rs. 1200** | M: **Rs. 2200** | L: **Rs. 3200**',
        action: {
          type: 'pizza_card',
          pizza: PIZZA_CATALOG[3],
        },
        suggestions: ['Add Medium Supreme', 'Add Medium Pan Pepperoni', 'Show full menu'],
      };
    }

    if (lower.includes('kids') || lower.includes('mild')) {
      return {
        reply:
          '👶 **Mild & Kid-Friendly Pizzas (Zero Spice)**:\n1. **Margherita**: Simple, cheesy, sweet tomato passata.\n   • S: **Rs. 1000** | M: **Rs. 1800** | L: **Rs. 2600**\n2. **Cheese Melt**: Melty 4-cheese blend on stuffed crust.\n   • S: **Rs. 1250** | M: **Rs. 2300** | L: **Rs. 3300**',
        action: {
          type: 'pizza_card',
          pizza: PIZZA_CATALOG[2],
        },
        suggestions: ['Add Medium Margherita', 'Add Medium Cheese Melt', 'Show full menu'],
      };
    }

    // 6. Live Order Tracking
    if (
      lower.includes('where') ||
      lower.includes('track') ||
      lower.includes('order') ||
      lower.includes('status') ||
      lower.includes('eta') ||
      lower.includes('delivery') ||
      lower.includes('cooking')
    ) {
      const activeOrderId = localStorage.getItem('active_order_id') || 'PH-8942-X';
      const orderDetailsRaw = localStorage.getItem('last_order_details');
      let status = 'Out for Delivery';
      let eta = 25;

      if (orderDetailsRaw) {
        try {
          const parsed = JSON.parse(orderDetailsRaw);
          status = parsed.status || status;
          eta = parsed.eta_minutes || eta;
        } catch {
          // ignore
        }
      }

      return {
        reply: `📦 **Live Order Tracking: #${activeOrderId}**\n• **Current Stage**: ${status} (Hot from Stone Oven)\n• **Estimated Arrival**: ~${eta} minutes\n\nClick below to open the Live Delivery Tracker with GPS progress:`,
        action: {
          type: 'order_tracker',
          order_id: activeOrderId,
          status,
          eta_minutes: eta,
        },
        suggestions: ['Track order in map', 'Show full menu', 'Recommend spicy pizza'],
      };
    }

    // 7. Full Menu / Prices
    if (
      lower.includes('menu') ||
      lower.includes('price') ||
      lower.includes('size') ||
      lower.includes('list') ||
      lower.includes('all') ||
      lower.includes('what do you have') ||
      lower.includes('cost')
    ) {
      const lines = [
        '🍕 **Pizza Hut Complete Menu & S/M/L Prices**:',
        '',
        '1. **Pan Pepperoni** (Classic | Low Spice)',
        '   • S: **Rs. 1200** | M: **Rs. 2200** | L: **Rs. 3200**',
        '2. **Tandoori Chicken** (Supreme | High Spice)',
        '   • S: **Rs. 1350** | M: **Rs. 2400** | L: **Rs. 3400**',
        '3. **Margherita** (Classic | No Spice)',
        '   • S: **Rs. 1000** | M: **Rs. 1800** | L: **Rs. 2600**',
        '4. **Supreme** (Supreme | Medium Spice)',
        '   • S: **Rs. 1500** | M: **Rs. 2600** | L: **Rs. 3600**',
        '5. **Veggie Lover** (Veggie | No Spice)',
        '   • S: **Rs. 1100** | M: **Rs. 2000** | L: **Rs. 2900**',
        '6. **Cheese Melt** (Classic | No Spice)',
        '   • S: **Rs. 1250** | M: **Rs. 2300** | L: **Rs. 3300**',
      ];

      return {
        reply: lines.join('\n'),
        action: {
          type: 'full_menu',
        },
        suggestions: ['Pizzas under 2500', 'Spicy pizzas', 'Pizza for 4 people'],
      };
    }

    // 8. Greetings & Fallback
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return {
        reply:
          "👋 **Welcome to Pizza Hut AI Concierge!**\nHow can I help you today?\n• 🍕 **Explore Menu & Exact Prices**: Pan Pepperoni, Tandoori Chicken, Margherita...\n• 💵 **Budget Search**: Try asking *'Pizzas under 2500'*\n• 👨‍👩‍👧 **Group Combos**: Try asking *'Pizza for 4 people'*\n• 📦 **Live Delivery**: Try asking *'Where is my order?'*",
        suggestions: ['Pizzas under 2500', 'Recommend a spicy pizza', 'Pizza for 4 people'],
      };
    }

    return {
      reply:
        "🍕 I'm your Pizza Hut AI assistant! I can recommend pizzas by spice or topping, find options within your budget (e.g. *under 2500*), calculate group combos (e.g. *for 4 people*), or track your active order.",
      suggestions: ['Pizzas under 2500', 'Show full menu & prices', 'Where is my order?'],
    };
  };

  const handleSend = async (customText?: string) => {
    const rawText = typeof customText === 'string' ? customText : input;
    const textToSend = rawText.trim();
    if (!textToSend || isLoading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: currentTime,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let botReply = '';
      let botSuggestions: string[] | undefined = undefined;
      let botAction: ChatActionPayload | undefined = undefined;

      try {
        const res = await callWalker<any>('chat_assistant', {
          message: textToSend,
          session_id: 'default',
        });

        const reports = res?.data?.reports || res?.reports || [];
        const firstReport = reports[0];

        botReply =
          firstReport?.reply ||
          firstReport?.response ||
          res?.reply ||
          res?.data?.result?.reply ||
          res?.result?.reply ||
          '';

        if (firstReport?.suggestions && Array.isArray(firstReport.suggestions)) {
          botSuggestions = firstReport.suggestions;
        }

        if (firstReport?.action && typeof firstReport.action === 'object') {
          botAction = firstReport.action;
        }
      } catch (walkerErr) {
        console.warn('[AiChat] Backend walker request error, activating local engine:', walkerErr);
      }

      // If backend was empty or failed, use local matching engine
      if (!botReply) {
        const fallback = getLocalFallbackReply(textToSend);
        botReply = fallback.reply;
        botSuggestions = fallback.suggestions;
        botAction = fallback.action;
      }

      // If action is missing but can be inferred from local engine, populate it
      if (!botAction) {
        const inferred = getLocalFallbackReply(textToSend);
        if (inferred.action) {
          botAction = inferred.action;
        }
      }

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: botSuggestions,
        action: botAction,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('[AiChat] Error:', err);
      const fallback = getLocalFallbackReply(textToSend);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: fallback.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: fallback.suggestions,
          action: fallback.action,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    '🍕 Show full menu & prices',
    '🌶️ Spicy pizzas under 2500',
    '👨‍👩‍👧 Pizza for 4 people',
    '📦 Where is my order?',
    '🧀 Tell me about Cheese Melt',
    '🥦 Vegetarian pizzas',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-5rem)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-600/90 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-emerald-400/40 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Developer Banner */}
      <div className="mb-5 p-3.5 rounded-xl border border-dashed border-red-500/40 bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-600/20 text-[#E31837]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Developer 3 Branch: Conversational AI Ordering</h2>
            <p className="text-xs text-zinc-400">
              Contract Node: <code className="text-red-300 font-mono">ChatSession</code> | Walker:{' '}
              <code className="text-red-300 font-mono">backend/walkers_chat.jac</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Endpoint: /walker/chat_assistant</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-2xl min-h-0">
        {/* Chat Header */}
        <div className="p-3.5 sm:px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E31837] to-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Pizza Hut AI Assistant</h3>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Jaseci Jac Walker
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Live Ordering & Delivery Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-xs px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1.5 border border-zinc-700/60 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">View Menu</span>
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-[#E31837] text-white shadow-sm shadow-red-600/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#E31837] text-white rounded-tr-none'
                    : 'bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 rounded-tl-none shadow-lg'
                }`}
              >
                {/* Formatted Message Text */}
                <FormattedMessage text={msg.text} />

                {/* Interactive Action Components inside Chat Bubble */}
                {msg.sender === 'ai' && msg.action && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/60 space-y-2">
                    {/* 1. Specific Pizza Card */}
                    {msg.action.type === 'pizza_card' && msg.action.pizza && (
                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-red-500/30 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            🍕 {msg.action.pizza.name}
                          </span>
                          <div className="flex items-center gap-1">
                            {msg.action.pizza.spicy !== 'None' ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 text-[10px] flex items-center gap-1 border border-red-700/30">
                                <Flame className="w-2.5 h-2.5 text-red-400" />
                                {msg.action.pizza.spicy}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 text-[10px] flex items-center gap-1 border border-emerald-700/30">
                                <Leaf className="w-2.5 h-2.5 text-emerald-400" />
                                Mild
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-400 line-clamp-2">
                          {msg.action.pizza.description}
                        </div>

                        {/* One-Click Add to Cart Sizes */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(msg.action?.pizza, 'S')}
                            className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-white font-medium text-[10px] transition-colors flex flex-col items-center border border-zinc-700 hover:border-red-500 cursor-pointer"
                          >
                            <span>Small</span>
                            <span className="text-red-300 font-mono">Rs. {msg.action.pizza.prices?.S || 1200}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(msg.action?.pizza, 'M')}
                            className="px-2 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-medium text-[10px] transition-colors flex flex-col items-center border border-red-500 shadow-sm shadow-red-600/30 cursor-pointer"
                          >
                            <span>Medium</span>
                            <span className="text-white font-mono font-bold">Rs. {msg.action.pizza.prices?.M || 2200}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(msg.action?.pizza, 'L')}
                            className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-white font-medium text-[10px] transition-colors flex flex-col items-center border border-zinc-700 hover:border-red-500 cursor-pointer"
                          >
                            <span>Large</span>
                            <span className="text-red-300 font-mono">Rs. {msg.action.pizza.prices?.L || 3200}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 2. Direct Add-to-Cart Confirmation */}
                    {msg.action.type === 'add_to_cart' && (
                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-emerald-500/40 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white text-xs">
                            {msg.action.name} ({msg.action.size === 'S' ? 'Small' : msg.action.size === 'M' ? 'Medium' : 'Large'})
                          </div>
                          <div className="text-[11px] text-emerald-400 font-mono">Rs. {msg.action.price}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleAddToCart(
                              { id: msg.action?.pizza_id, name: msg.action?.name },
                              msg.action?.size || 'M',
                              msg.action?.price
                            )
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    )}

                    {/* 3. Budget List Quick-Add Cards */}
                    {msg.action.type === 'budget_list' && msg.action.items && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-red-400" />
                          <span>Quick Add to Cart (Under Rs. {msg.action.budget}):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {msg.action.items.map((item, itmIdx) => (
                            <button
                              key={itmIdx}
                              type="button"
                              onClick={() =>
                                handleAddToCart({ id: item.id, name: item.name }, item.size, item.price)
                              }
                              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-700/80 border border-zinc-700/70 hover:border-red-500/60 text-left transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div>
                                <div className="text-white font-medium text-[11px] group-hover:text-red-300">
                                  {item.name} ({item.size})
                                </div>
                                <div className="text-[10px] text-zinc-400">Spice: {item.spicy}</div>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/30">
                                Rs. {item.price}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Live Order Tracker Card */}
                    {msg.action.type === 'order_tracker' && (
                      <div className="p-3 rounded-xl bg-zinc-900 border border-red-500/40 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-red-500" />
                            Order #{msg.action.order_id || 'PH-8942-X'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                            {msg.action.status || 'Out for Delivery'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300">
                          Estimated Delivery Time: <strong className="text-white font-mono">{msg.action.eta_minutes || 25} minutes</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/tracker')}
                          className="w-full py-2 rounded-lg bg-[#E31837] hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30 transition-colors cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Open Live Delivery Tracker</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Follow-up Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-700/50 flex flex-wrap gap-1.5">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSend(sug)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-700/60 hover:bg-zinc-600 text-zinc-200 hover:text-white transition-colors border border-zinc-600/40 text-left cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}

                <span
                  className={`block text-[10px] mt-1.5 font-mono ${
                    msg.sender === 'user' ? 'text-red-200' : 'text-zinc-500'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {/* Typing State Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 bg-[#E31837] text-white shadow-sm shadow-red-600/30">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                <span>Checking menu catalog & active orders...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips Bar */}
        <div className="px-4 sm:px-6 py-2 border-t border-zinc-800/60 bg-zinc-950/40 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] text-zinc-500 shrink-0 font-medium">Quick ask:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt.replace(/^[^\s]+\s/, ''))}
              className="text-xs px-3 py-1 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 transition-colors shrink-0 border border-zinc-700/50 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-900/95 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about pizzas, budgets (e.g. under 2500), combos, or track order..."
              className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                handleSend();
              }}
              disabled={isLoading || !input.trim()}
              className={`px-5 py-2.5 sm:py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all ${
                isLoading || !input.trim()
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                  : 'bg-[#E31837] text-white hover:bg-red-700 shadow-red-600/20 cursor-pointer'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
