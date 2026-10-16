import from models { Pizza, CartItem, Order, ChatSession }
import from re { findall, search }

def get_pizzas() -> list[dict[str, any]] {
    return [
        {
            "id": "pizza_1",
            "name": "Pan Pepperoni",
            "category": "Classic",
            "spicy": "Low",
            "description": "Double pepperoni & extra mozzarella baked on our golden pan crust.",
            "prices": {"S": 1200, "M": 2200, "L": 3200}
        },
        {
            "id": "pizza_2",
            "name": "Tandoori Chicken",
            "category": "Supreme",
            "spicy": "High",
            "description": "Spicy tandoori chicken, crunchy red onions, green chilies, and garlic herb drizzle.",
            "prices": {"S": 1350, "M": 2400, "L": 3400}
        },
        {
            "id": "pizza_3",
            "name": "Margherita",
            "category": "Classic",
            "spicy": "None",
            "description": "Sun-ripened Italian tomato passata, fresh basil ribbons, and 100% whole milk mozzarella.",
            "prices": {"S": 1000, "M": 1800, "L": 2600}
        },
        {
            "id": "pizza_4",
            "name": "Supreme",
            "category": "Supreme",
            "spicy": "Medium",
            "description": "Seasoned beef, pepperoni, mushrooms, bell peppers, and crisp onions.",
            "prices": {"S": 1500, "M": 2600, "L": 3600}
        },
        {
            "id": "pizza_5",
            "name": "Veggie Lover",
            "category": "Veggie",
            "spicy": "None",
            "description": "Mushrooms, black olives, onions, sweet corn, and ripe Roma tomatoes.",
            "prices": {"S": 1100, "M": 2000, "L": 2900}
        },
        {
            "id": "pizza_6",
            "name": "Cheese Melt",
            "category": "Classic",
            "spicy": "None",
            "description": "4-cheese blend of golden cheddar, parmesan, provolone, and mozzarella on stuffed crust.",
            "prices": {"S": 1250, "M": 2300, "L": 3300}
        }
    ];
}

walker:pub chat_assistant {
    has message: str = "";
    has session_id: str = "default";

    can respond with Root entry {
        text = self.message.lower();
        pizzas = get_pizzas();
        orders = [root -->][?:Order];

        response_text = "";
        suggestions: list[str] = ["Track my order", "Spicy pizzas under 2500", "Show S/M/L prices"];
        action_payload: dict[str, any] = {};

        # -------------------------------------------------------------
        # 1. SPECIFIC ORDER / ADD TO CART INTENT (e.g. "order a large tandoori", "add medium pepperoni")
        # -------------------------------------------------------------
        if "add" in text or "buy" in text or "order a" in text or "get a" in text {
            size_choice = "M";
            if "large" in text or " l " in text or text.endswith(" l") or "family" in text {
                size_choice = "L";
            } elif "small" in text or " s " in text or text.endswith(" s") or "personal" in text {
                size_choice = "S";
            }

            matched_pizza = None;
            for p in pizzas {
                name_key = p["name"].lower();
                p_id_key = p["id"].lower();
                if name_key in text or p_id_key in text or (name_key.split()[0].lower() in text and len(name_key.split()[0]) > 3) {
                    matched_pizza = p;
                    break;
                }
            }

            if matched_pizza != None {
                price = matched_pizza["prices"][size_choice];
                response_text = f"🛒 **Ready to Order**: {matched_pizza['name']} ({size_choice}) for **Rs. {price}**!\nClick below to confirm adding it directly to your cart:";
                action_payload = {
                    "type": "add_to_cart",
                    "pizza_id": matched_pizza["id"],
                    "name": matched_pizza["name"],
                    "size": size_choice,
                    "price": price
                };
                suggestions = ["Check my cart", "Show full menu", "Where is my order?"];
                report {
                    "reply": response_text,
                    "suggestions": suggestions,
                    "action": action_payload
                };
                disengage;
            }
        }

        # -------------------------------------------------------------
        # 2. SPECIFIC PIZZA QUERY (Pepperoni, Tandoori, Margherita, Supreme, Veggie, Cheese)
        # -------------------------------------------------------------
        matched_target = None;
        if "pepperoni" in text {
            matched_target = pizzas[0];
        } elif "tandoori" in text {
            matched_target = pizzas[1];
        } elif "margherita" in text {
            matched_target = pizzas[2];
        } elif "supreme" in text {
            matched_target = pizzas[3];
        } elif "veggie" in text or "vegetarian" in text {
            matched_target = pizzas[4];
        } elif "cheese" in text or "melt" in text {
            matched_target = pizzas[5];
        }

        if matched_target != None and not ("menu" in text or "all" in text or "under" in text or "below" in text) {
            p = matched_target;
            p_s = p["prices"]["S"];
            p_m = p["prices"]["M"];
            p_l = p["prices"]["L"];
            response_text = f"🍕 **{p['name']}**\n• **Category**: {p['category']} | **Spice Level**: {p['spicy']}\n• **Description**: {p['description']}\n\n💰 **Exact Pricing**:\n• **Small (S)**: Rs. {p_s}\n• **Medium (M)**: Rs. {p_m}\n• **Large (L)**: Rs. {p_l}";
            action_payload = {
                "type": "pizza_card",
                "pizza": p
            };
            suggestions = [
                f"Add Small {p['name']}",
                f"Add Medium {p['name']}",
                f"Add Large {p['name']}"
            ];
            report {
                "reply": response_text,
                "suggestions": suggestions,
                "action": action_payload
            };
            disengage;
        }

        # -------------------------------------------------------------
        # 3. BUDGET / PRICE FILTER (e.g., "under 2500", "below 1500", "for 2000")
        # -------------------------------------------------------------
        budget_matches = findall(r"(?:under|below|budget|within|less than|<)?\s*(\d{3,5})", text);
        budget_val = 0;
        if len(budget_matches) > 0 and ("under" in text or "below" in text or "budget" in text or "less" in text or "<" in text or "rs" in text or "for 2" in text or "for 1" in text or "for 3" in text) {
            for m in budget_matches {
                parsed_num = int(m);
                if parsed_num >= 500 and parsed_num <= 10000 {
                    budget_val = parsed_num;
                    break;
                }
            }
        }

        if budget_val > 0 {
            matches = [];
            for p in pizzas {
                for (sz, pr) in p["prices"].items() {
                    if pr <= budget_val {
                        matches.append({
                            "id": p["id"],
                            "name": p["name"],
                            "size": sz,
                            "price": pr,
                            "spicy": p["spicy"]
                        });
                    }
                }
            }

            # Sort descending by price for best value
            matches.sort(key=lambda (item: any) -> int { return item["price"]; }, reverse=True);

            if len(matches) > 0 {
                lines = [f"💵 **Pizzas Within Your Budget of Rs. {budget_val}** (Best Value First):"];
                for item in matches[:6] {
                    sz_label = "Small" if item["size"] == "S" else ("Medium" if item["size"] == "M" else "Large");
                    lines.append(f"• **{item['name']} ({sz_label})**: Rs. {item['price']} (Spice: {item['spicy']})");
                }
                response_text = "\n".join(lines);
                action_payload = {
                    "type": "budget_list",
                    "budget": budget_val,
                    "items": matches[:4]
                };
                suggestions = [
                    f"Add {matches[0]['name']} ({matches[0]['size']})",
                    "Show full menu",
                    "Track my order"
                ];
            } else {
                response_text = f"💵 No pizzas found under Rs. {budget_val}. Our most affordable pizza is **Margherita (Small)** at **Rs. 1000**!";
                suggestions = ["Margherita details", "Pizzas under 2000", "Show S/M/L prices"];
            }

            report {
                "reply": response_text,
                "suggestions": suggestions,
                "action": action_payload
            };
            disengage;
        }

        # -------------------------------------------------------------
        # 4. GROUP SIZE / COMBO CALCULATION (e.g. "for 3 people", "party", "family")
        # -------------------------------------------------------------
        people_count = 0;
        pax_matches = findall(r"(\d+)\s*(?:people|person|pax|persons|friends)", text);
        if len(pax_matches) > 0 {
            people_count = int(pax_matches[0]);
        } elif "couple" in text or "two of us" in text or "2 of us" in text {
            people_count = 2;
        } elif "family" in text {
            people_count = 4;
        } elif "party" in text or "gathering" in text {
            people_count = 6;
        }

        if people_count > 0 {
            # Rule: 1 Small = 1 person, 1 Medium = 2 people, 1 Large = 3-4 people
            if people_count == 1 {
                response_text = "👤 **Recommended for 1 Person**:\n• **1x Small Pizza** (6 slices)\n• Top pick: **Pan Pepperoni (Small)** for **Rs. 1200** or **Margherita (Small)** for **Rs. 1000**.\n\n💰 Total: **Rs. 1000 - 1200**.";
                suggestions = ["Add Small Pan Pepperoni", "Add Small Margherita", "Show S/M/L prices"];
            } elif people_count == 2 {
                response_text = "👥 **Recommended for 2 People (Couple Combo)**:\n• **1x Medium Pizza** (8 slices) or 2x Smalls\n• Top pick: **Tandoori Chicken (Medium)** for **Rs. 2400** or **Pan Pepperoni (Medium)** for **Rs. 2200**.\n\n💰 Total: **Rs. 2200 - 2400** (~Rs. 1100 per person).";
                suggestions = ["Add Medium Tandoori Chicken", "Add Medium Pan Pepperoni", "Show S/M/L prices"];
            } elif people_count == 3 {
                response_text = "👨‍👩‍👧 **Recommended for 3 People**:\n• **1x Large Pizza** (10 slices) or 1 Medium + 1 Small\n• Top pick: **Supreme (Large)** for **Rs. 3600** or **Pan Pepperoni (Large)** for **Rs. 3200**.\n\n💰 Total: **Rs. 3200 - 3600** (~Rs. 1100 per person).";
                suggestions = ["Add Large Pan Pepperoni", "Add Large Supreme", "Pizzas under 3500"];
            } elif people_count == 4 {
                response_text = "👨‍👩‍👧‍👦 **Recommended for 4 People (Family Feast)**:\n• **1x Large Pizza + 1x Medium Pizza** (18 slices total)\n• Combo: **1x Large Pan Pepperoni (Rs. 3200)** + **1x Medium Margherita (Rs. 1800)**.\n\n💰 Total: **Rs. 5000** (~Rs. 1250 per person).";
                suggestions = ["Add Large Pan Pepperoni", "Add Medium Margherita", "Show full menu"];
            } else {
                large_needed = (people_count + 2) // 3;
                total_approx = large_needed * 3300;
                response_text = f"🎉 **Recommended for Party of {people_count} People**:\n• **{large_needed}x Large Pizzas** (~{large_needed * 10} slices)\n• Recommended Mix: 1x Supreme Large (Rs. 3600) + 1x Tandoori Chicken Large (Rs. 3400) + 1x Pan Pepperoni Large (Rs. 3200).\n\n💰 Total Approx: **Rs. {total_approx}** (~Rs. {total_approx // people_count} per person).";
                suggestions = ["Show S/M/L prices", "Track my order", "Add Large Supreme"];
            }

            action_payload = {
                "type": "group_combo",
                "people_count": people_count
            };
            report {
                "reply": response_text,
                "suggestions": suggestions,
                "action": action_payload
            };
            disengage;
        }

        # -------------------------------------------------------------
        # 5. DIETARY & PREFERENCE FILTER (Spicy, Chicken, Veg, Meat, Kids, Cheese)
        # -------------------------------------------------------------
        if "spicy" in text or "hot" in text {
            response_text = "🌶️ **Spicy Pizza Recommendations**:\n1. **Tandoori Chicken** (Spice Level: **High**)\n   Spicy chicken breast, red onions, green chilies.\n   • S: **Rs. 1350** | M: **Rs. 2400** | L: **Rs. 3400**\n2. **Supreme** (Spice Level: **Medium**)\n   Seasoned beef, pepperoni, mushrooms, bell peppers.\n   • S: **Rs. 1500** | M: **Rs. 2600** | L: **Rs. 3600**";
            suggestions = ["Add Medium Tandoori Chicken", "Add Medium Supreme", "Pizzas under 2500"];
            action_payload = {"type": "preference", "preference": "spicy"};
            report {"reply": response_text, "suggestions": suggestions, "action": action_payload};
            disengage;
        }

        if "chicken" in text {
            response_text = "🍗 **Chicken Favorite**:\n• **Tandoori Chicken** (Supreme Category | Spicy: High)\n  Spicy tandoori chicken, crunchy red onions, green chilies.\n  • Small (S): **Rs. 1350**\n  • Medium (M): **Rs. 2400**\n  • Large (L): **Rs. 3400**";
            suggestions = ["Add Medium Tandoori Chicken", "Add Large Tandoori Chicken", "Show full menu"];
            action_payload = {"type": "pizza_card", "pizza": pizzas[1]};
            report {"reply": response_text, "suggestions": suggestions, "action": action_payload};
            disengage;
        }

        if "veg" in text or "vegetarian" in text {
            response_text = "🥦 **Vegetarian Favorites (100% Meat-Free)**:\n1. **Veggie Lover** (Category: Veggie | Spice: None)\n   Mushrooms, black olives, onions, sweet corn, tomatoes.\n   • S: **Rs. 1100** | M: **Rs. 2000** | L: **Rs. 2900**\n2. **Margherita** (Category: Classic | Spice: None)\n   Classic Italian tomato passata & 100% mozzarella cheese.\n   • S: **Rs. 1000** | M: **Rs. 1800** | L: **Rs. 2600**";
            suggestions = ["Add Medium Veggie Lover", "Add Medium Margherita", "Show S/M/L prices"];
            action_payload = {"type": "preference", "preference": "veg"};
            report {"reply": response_text, "suggestions": suggestions, "action": action_payload};
            disengage;
        }

        if "meat" in text or "beef" in text {
            response_text = "🥩 **Meat Lovers Favorites**:\n1. **Supreme** (Seasoned beef, pepperoni, mushrooms, peppers)\n   • S: **Rs. 1500** | M: **Rs. 2600** | L: **Rs. 3600**\n2. **Pan Pepperoni** (Loaded double pepperoni & extra cheese)\n   • S: **Rs. 1200** | M: **Rs. 2200** | L: **Rs. 3200**";
            suggestions = ["Add Medium Supreme", "Add Medium Pan Pepperoni", "Show full menu"];
            action_payload = {"type": "preference", "preference": "meat"};
            report {"reply": response_text, "suggestions": suggestions, "action": action_payload};
            disengage;
        }

        if "kids" in text or "mild" in text {
            response_text = "👶 **Mild & Kid-Friendly Pizzas (Zero Spice)**:\n1. **Margherita**: Simple, cheesy, sweet tomato passata.\n   • S: **Rs. 1000** | M: **Rs. 1800** | L: **Rs. 2600**\n2. **Cheese Melt**: Melty 4-cheese blend on stuffed crust.\n   • S: **Rs. 1250** | M: **Rs. 2300** | L: **Rs. 3300**";
            suggestions = ["Add Medium Margherita", "Add Medium Cheese Melt", "Show S/M/L prices"];
            action_payload = {"type": "preference", "preference": "kids"};
            report {"reply": response_text, "suggestions": suggestions, "action": action_payload};
            disengage;
        }

        # -------------------------------------------------------------
        # 6. LIVE ORDER TRACKING
        # -------------------------------------------------------------
        if "where" in text or "track" in text or "order" in text or "status" in text or "eta" in text or "delivery" in text or "cooking" in text {
            if len(orders) > 0 {
                latest = orders[len(orders) - 1];
                response_text = f"📦 **Live Order Tracking**: #{latest.order_id}\n• **Status**: {latest.status}\n• **Estimated Time**: ~{latest.eta_minutes} mins\n• **Order Total**: Rs. {latest.total_price}\n\nClick below to open the Live Delivery Tracker:";
                action_payload = {
                    "type": "order_tracker",
                    "order_id": latest.order_id,
                    "status": latest.status,
                    "eta_minutes": latest.eta_minutes
                };
                suggestions = ["Check menu specials", "Show S/M/L prices", "Recommend spicy pizza"];
            } else {
                response_text = "📦 **Order Status**: No active orders found in your current session.\nIf you recently placed an order, it is being prepared in the kitchen (Standard ETA: ~25-35 mins).";
                action_payload = {
                    "type": "order_tracker",
                    "order_id": "PH-8942-X",
                    "status": "In Transit",
                    "eta_minutes": 25
                };
                suggestions = ["Show S/M/L prices", "Recommend spicy pizza", "Best seller pizza"];
            }
            report {
                "reply": response_text,
                "suggestions": suggestions,
                "action": action_payload
            };
            disengage;
        }

        # -------------------------------------------------------------
        # 7. FULL MENU / SIZES / PRICES
        # -------------------------------------------------------------
        if "menu" in text or "price" in text or "size" in text or "list" in text or "all" in text or "what do you have" in text or "cost" in text {
            lines = [
                "🍕 **Pizza Hut Complete Menu & S/M/L Prices**:",
                "",
                "1. **Pan Pepperoni** (Classic | Low Spice)",
                "   • S: **Rs. 1200** | M: **Rs. 2200** | L: **Rs. 3200**",
                "2. **Tandoori Chicken** (Supreme | High Spice)",
                "   • S: **Rs. 1350** | M: **Rs. 2400** | L: **Rs. 3400**",
                "3. **Margherita** (Classic | No Spice)",
                "   • S: **Rs. 1000** | M: **Rs. 1800** | L: **Rs. 2600**",
                "4. **Supreme** (Supreme | Medium Spice)",
                "   • S: **Rs. 1500** | M: **Rs. 2600** | L: **Rs. 3600**",
                "5. **Veggie Lover** (Veggie | No Spice)",
                "   • S: **Rs. 1100** | M: **Rs. 2000** | L: **Rs. 2900**",
                "6. **Cheese Melt** (Classic | No Spice)",
                "   • S: **Rs. 1250** | M: **Rs. 2300** | L: **Rs. 3300**"
            ];
            response_text = "\n".join(lines);
            action_payload = {"type": "full_menu"};
            suggestions = ["Pizzas under 2500", "Spicy pizzas", "Combo for 4 people"];
            report {
                "reply": response_text,
                "suggestions": suggestions,
                "action": action_payload
            };
            disengage;
        }

        # -------------------------------------------------------------
        # 8. GREETINGS & DEFAULT
        # -------------------------------------------------------------
        if "hello" in text or "hi" in text or "hey" in text {
            response_text = "👋 **Welcome to Pizza Hut AI Concierge!**\nHow can I help you today?\n• 🍕 **Explore Menu & Exact Prices**: Pan Pepperoni, Tandoori Chicken, Margherita...\n• 💵 **Budget Search**: Try asking *'Pizzas under 2500'*\n• 👨‍👩‍👧 **Group Combos**: Try asking *'Pizza for 4 people'*\n• 📦 **Live Delivery**: Try asking *'Where is my order?'*";
            suggestions = ["Pizzas under 2500", "Recommend a spicy pizza", "Pizza for 4 people"];
        } else {
            response_text = "🍕 I'm your Pizza Hut AI assistant! I can recommend pizzas by spice or topping, find options within your budget (e.g. *under 2500*), calculate group combos (e.g. *for 4 people*), or track your active order.";
            suggestions = ["Pizzas under 2500", "Show S/M/L prices", "Track my order"];
        }

        report {
            "reply": response_text,
            "suggestions": suggestions,
            "action": action_payload
        };
    }
}

walker:pub chat_session {
    has session_id: str = "default";
    has message: str = "";

    can chat with Root entry {
        root spawn chat_assistant(message=self.message, session_id=self.session_id);
    }
}
