import os;
import json;
import from models { Pizza, CartItem, Order, ChatSession }
# import:jac from models, Pizza, CartItem, Order, ChatSession;

# ==============================================================================
# Jac byLLM Function Declaration
# ==============================================================================
def generate_ai_reply(user_query: str, menu_context: str, order_context: str) -> str by llm(
    system_prompt="You are HutBot, the Pizza Hut AI Concierge. Use the provided menu context and live order context to give energetic, helpful, accurate recommendations with exact prices and sizes. If asked about recommendations, suggest matching pizzas with their sizes and prices. If asked about an order, provide the live status and ETA."
);
sem generate_ai_reply = "Generate an intelligent Pizza Hut concierge response using graph menu and order context.";

# ==============================================================================
# Rule-Based Fallback Generator (Ensures demo never crashes without API keys)
# ==============================================================================
def rule_based_fallback(query: str, pizzas: list[any], orders: list[any]) -> dict[str, any] {
    q = query.lower();
    rec_list: list[dict[str, any]] = [];
    order_data: dict[str, any] = {};

    # Case 1: Order Tracking ("Where is my pizza?", "track", "order status", "eta")
    if ("where" in q and "pizza" in q) or "track" in q or "status" in q or "order" in q or "eta" in q {
        if len(orders) > 0 {
            ord = orders[0];
            order_data = {
                "order_id": ord.order_id,
                "status": ord.status,
                "eta_minutes": ord.eta_minutes,
                "total_price": ord.total_price,
                "items": ord.items,
                "updated_at": ord.updated_at
            };

            items_summary = ", ".join([f"{item['name']} ({item['size']})" for item in ord.items]);
            text = (
                f"🍕 **Great news! Here is your live order update:**\n\n"
                f"• **Order ID:** `{ord.order_id}`\n"
                f"• **Current Status:** 🔥 **{ord.status}**\n"
                f"• **Estimated Arrival:** ⏱️ **{ord.eta_minutes} minutes**\n"
                f"• **Items:** {items_summary}\n"
                f"• **Total:** Rs. {ord.total_price:,.2f}\n\n"
                f"Our rider will be heading to your doorstep as soon as it's golden and boxed!"
            );

            return {
                "text": text,
                "recommendations": [],
                "order_info": order_data
            };
        }
    }

    # Case 2: Pricing & Sizes ("What sizes & prices do you have?", "price", "cost", "sizes")
    if "price" in q or "cost" in q or "size" in q or "how much" in q {
        text_lines = [
            "🍕 **Pizza Hut Menu Sizes & Pricing Guide:**\n",
            "We serve 3 classic sizes crafted to perfection:\n",
            "• **Personal / Small (6\")**: 4 slices (Ideal for 1 person) — starting from **Rs. 850**",
            "• **Medium (9\")**: 6 slices (Great for 2–3 people) — starting from **Rs. 1,650**",
            "• **Large (12\")**: 8 slices (Feeds 4–5 people) — starting from **Rs. 2,450**\n",
            "**Here are our top customer favorites with exact pricing:**"
        ];

        for p in pizzas[:4] {
            rec_list.append({
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "category": p.category,
                "prices": p.prices,
                "image_url": p.image_url
            });
            text_lines.append(
                f"• **{p.name}** ({p.category}): Small: Rs. {p.prices.get('personal', p.prices.get('small', 0)):,.0f} | "
                f"Medium: Rs. {p.prices.get('medium', 0):,.0f} | "
                f"Large: Rs. {p.prices.get('large', 0):,.0f}"
            );
        }

        return {
            "text": "\n".join(text_lines),
            "recommendations": rec_list,
            "order_info": {}
        };
    }

    # Case 3: Spicy Preference ("spicy", "hot", "fiery", "chilli", "jalapeno")
    if "spicy" in q or "hot" in q or "chilli" in q or "jalapeno" in q or "fiery" in q {
        matched: list[any] = [];
        for p in pizzas {
            p_cat = p.category.lower();
            p_desc = p.description.lower();
            p_name = p.name.lower();
            if "spicy" in p_cat or "spicy" in p_name or "spicy" in p_desc or "fiery" in p_name or "chill" in p_desc or "jalapeño" in p_desc or "jalapeno" in p_desc {
                matched.append(p);
            }
        }

        if len(matched) == 0 {
            matched = pizzas[:2];
        }

        text_lines = [
            "🌶️ **Craving something with a kick? Here are our hottest picks!**\n"
        ];

        # Check for budget filter (e.g. 2500)
        budget = 999999.0;
        if "2500" in q {
            budget = 2500.0;
            text_lines.append("Here are sizzling spicy options that fit perfectly **under Rs. 2,500**:\n");
        }

        for p in matched {
            med_price = float(p.prices.get("medium", 0));
            personal_price = float(p.prices.get("personal", p.prices.get("small", 0)));

            if med_price <= budget or personal_price <= budget {
                rec_list.append({
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "category": p.category,
                    "prices": p.prices,
                    "image_url": p.image_url
                });

                text_lines.append(
                    f"🔥 **{p.name}**\n"
                    f"  {p.description}\n"
                    f"  • *Medium (Serves 2-3)*: **Rs. {med_price:,.0f}**\n"
                    f"  • *Personal (Serves 1)*: **Rs. {personal_price:,.0f}**\n"
                );
            }
        }

        text_lines.append("Would you like me to add one of these with our signature stuffed crust?");
        return {
            "text": "\n".join(text_lines),
            "recommendations": rec_list,
            "order_info": {}
        };
    }

    # Case 4: Group / Family / Party
    if "group" in q or "party" in q or "family" in q or "people" in q or "sharing" in q or "friends" in q {
        text_lines = [
            "🎉 **Planning a feast for a group? HutBot has you covered!**\n\n"
            "For groups of 3–5 people, we recommend grabbing **1 Large + 1 Medium** or our loaded Specialty Pans so everyone gets their favorite slice!\n",
            "**Recommended Crowd-Pleasers:**"
        ];

        for p in pizzas[:3] {
            rec_list.append({
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "category": p.category,
                "prices": p.prices,
                "image_url": p.image_url
            });
            text_lines.append(
                f"• **{p.name}** (Large feeds 4): **Rs. {p.prices.get('large', 0):,.0f}** — {p.description}"
            );
        }

        return {
            "text": "\n".join(text_lines),
            "recommendations": rec_list,
            "order_info": {}
        };
    }

    # Case 5: Default / General recommendation
    text_lines = [
        "🍕 **Welcome to Pizza Hut! I'm HutBot, your AI Pizza Concierge.**\n\n"
        "I have direct access to our live stone-oven kitchen graph! Here's what I can do for you:\n"
        "• 🎯 **Personalized Recommendations:** Tell me your budget, spice level, or vegetarian preference.\n"
        "• 💰 **Exact Pricing & Sizing:** Ask about Small, Medium, or Large pizzas.\n"
        "• 📦 **Live Delivery Tracking:** Ask *'Where is my pizza?'* to see live oven/delivery ETA.\n\n"
        "**Popular Today:**"
    ];

    for p in pizzas[:3] {
        rec_list.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "category": p.category,
            "prices": p.prices,
            "image_url": p.image_url
        });
        text_lines.append(
            f"• **{p.name}** ({p.category}) — Medium: **Rs. {p.prices.get('medium', 0):,.0f}**"
        );
    }

    return {
        "text": "\n".join(text_lines),
        "recommendations": rec_list,
        "order_info": {}
    };
}

# ==============================================================================
# Primary Walker: chat_assistant
# ==============================================================================
walker:pub chat_assistant {
    has message: str = "";
    has session_id: str = "default";

    can converse with Root entry {
        # 1. Traverse graph to read available Pizza nodes
        pizzas = [root --> [?:Pizza]];

        # If graph has no pizzas yet, seed standard Pizza Hut pizzas
        if not pizzas {
            p1 = Pizza(
                id="p_spicy_chicken",
                name="Spicy Chicken Pan",
                description="Fiery seasoned chicken slices, fiery green chillies, spicy tomato drizzle, and melted mozzarella.",
                category="Spicy Non-Veg",
                prices={"personal": 1150.0, "medium": 2150.0, "large": 3200.0, "small": 1150.0},
                image_url="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80"
            );
            p2 = Pizza(
                id="p_spicy_beef",
                name="Hot & Spicy Beef Supreme",
                description="Fiery spicy beef crumble, jalapeño rings, red paprika, and creamy garlic cheese drizzle.",
                category="Spicy Meat",
                prices={"personal": 1250.0, "medium": 2350.0, "large": 3450.0, "small": 1250.0},
                image_url="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80"
            );
            p3 = Pizza(
                id="p_pepperoni",
                name="Pepperoni Lover's",
                description="Loaded with double premium pepperoni slices and extra melted mozzarella cheese on signature crust.",
                category="Classic Meat",
                prices={"personal": 1100.0, "medium": 2100.0, "large": 3100.0, "small": 1100.0},
                image_url="https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80"
            );
            p4 = Pizza(
                id="p_supreme",
                name="Super Supreme",
                description="The ultimate combo of beef, pepperoni, savory sausage, button mushrooms, green peppers, onions, and black olives.",
                category="Supreme Specialty",
                prices={"personal": 1200.0, "medium": 2250.0, "large": 3350.0, "small": 1200.0},
                image_url="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80"
            );
            p5 = Pizza(
                id="p_veggie",
                name="Fiery Veggie Delight",
                description="Crisp bell peppers, button mushrooms, spicy red paprika, black olives, and sweet golden corn with mozzarella.",
                category="Vegetarian",
                prices={"personal": 950.0, "medium": 1850.0, "large": 2750.0, "small": 950.0},
                image_url="https://images.unsplash.com/photo-1576458088443-04a19bb13da6?auto=format&fit=crop&w=600&q=80"
            );
            p6 = Pizza(
                id="p_cheese",
                name="Double Cheese Margherita",
                description="Classic Italian style herb tomato sauce topped with double layers of melted golden mozzarella cheese.",
                category="Classic Veg",
                prices={"personal": 850.0, "medium": 1650.0, "large": 2450.0, "small": 850.0},
                image_url="https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80"
            );

            root ++> p1;
            root ++> p2;
            root ++> p3;
            root ++> p4;
            root ++> p5;
            root ++> p6;

            pizzas = [root --> [?:Pizza]];
        }

        # 2. Traverse graph to read active Order nodes
        orders = [root --> [?:Order]];
        if not orders {
            sample_order = Order(
                order_id="PH-8942-X",
                items=[
                    {"pizza_id": "p_spicy_chicken", "name": "Spicy Chicken Pan", "size": "Medium", "qty": 1, "unit_price": 2150.0},
                    {"pizza_id": "p_garlic_bread", "name": "Garlic Bread Supreme", "size": "Regular", "qty": 1, "unit_price": 650.0}
                ],
                total_price=2800.0,
                status="Baking in Oven",
                eta_minutes=18,
                updated_at="Just now"
            );
            root ++> sample_order;
            orders = [root --> [?:Order]];
        }

        # 3. Maintain ChatSession node on graph
        sessions = [root --> [?:ChatSession]];
        current_session: any = None;
        for s in sessions {
            if s.session_id == self.session_id {
                current_session = s;
                break;
            }
        }
        if current_session is None {
            new_session = ChatSession(session_id=self.session_id, history=[]);
            root ++> new_session;
            current_session = new_session;
        }

        # 4. Determine AI response engine
        has_api_key = bool(
            os.environ.get("OPENAI_API_KEY") or
            os.environ.get("ANTHROPIC_API_KEY") or
            os.environ.get("GOOGLE_API_KEY") or
            os.environ.get("GEMINI_API_KEY")
        );

        final_text = "";
        rec_pizzas: list[dict[str, any]] = [];
        order_info: dict[str, any] = {};
        source_mode = "rule_based";

        # Build menu summary for context
        menu_items = [];
        for p in pizzas {
            menu_items.append(
                f"- {p.name} ({p.category}): Small Rs.{p.prices.get('personal', p.prices.get('small', 0)):.0f}, "
                f"Medium Rs.{p.prices.get('medium', 0):.0f}, Large Rs.{p.prices.get('large', 0):.0f}. "
                f"Desc: {p.description}"
            );
        }
        menu_context_str = "\n".join(menu_items);

        order_context_str = "No active orders.";
        if len(orders) > 0 {
            o = orders[0];
            order_context_str = (
                f"Order ID: {o.order_id}, Status: {o.status}, ETA: {o.eta_minutes} mins, "
                f"Total: Rs.{o.total_price:.2f}, Items: {json.dumps(o.items)}"
            );
        }

        # Attempt LLM if API key is present; otherwise execute clean rule-based fallback
        if has_api_key {
            try {
                final_text = generate_ai_reply(
                    user_query=self.message,
                    menu_context=menu_context_str,
                    order_context=order_context_str
                );
                source_mode = "byllm";

                # Match recommended pizzas from LLM text
                for p in pizzas {
                    if p.name.lower() in final_text.lower() {
                        rec_pizzas.append({
                            "id": p.id,
                            "name": p.name,
                            "description": p.description,
                            "category": p.category,
                            "prices": p.prices,
                            "image_url": p.image_url
                        });
                    }
                }
            } except Exception {
                source_mode = "rule_based_fallback";
                fb = rule_based_fallback(query=self.message, pizzas=pizzas, orders=orders);
                final_text = fb["text"];
                rec_pizzas = fb["recommendations"];
                order_info = fb["order_info"];
            }
        } else {
            fb = rule_based_fallback(query=self.message, pizzas=pizzas, orders=orders);
            final_text = fb["text"];
            rec_pizzas = fb["recommendations"];
            order_info = fb["order_info"];
        }

        # Save turn into session history
        if current_session is not None {
            current_session.history.append({"role": "user", "message": self.message});
            current_session.history.append({"role": "assistant", "message": final_text});
        }

        # Return standardized contract response
        report {
            "response": final_text,
            "session_id": self.session_id,
            "recommendations": rec_pizzas,
            "order_info": order_info,
            "source": source_mode
        };
    }
}

# ==============================================================================
# Backward Compatibility Walker: chat_session
# ==============================================================================
walker:pub chat_session {
    has message: str = "";
    has session_id: str = "default";

    can run with Root entry {
        res = root spawn chat_assistant(message=self.message, session_id=self.session_id);
        if res.reports {
            report res.reports[0];
        } else {
            report {
                "response": "Hello from Pizza Hut AI Assistant!",
                "session_id": self.session_id,
                "recommendations": [],
                "order_info": {},
                "source": "fallback"
            };
        }
    }
}
