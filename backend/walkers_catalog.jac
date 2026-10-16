import from models { Pizza, CartItem, Order, ChatSession }
import from random { randint }
import from datetime { datetime }

# =====================================================================
# Developer 1: Menu Catalog & Shopping Cart Walkers
# =====================================================================

walker:pub seed_menu {
    can populate with Root entry {
        existing = [root -->][?:Pizza];
        if len(existing) > 0 {
            report {"status": "already_seeded", "count": len(existing)};
            disengage;
        }

        root ++> Pizza(
            id="pizza_1",
            name="Pan Pepperoni",
            description="Loaded with double portions of savory sliced pepperoni baked with melted mozzarella cheese on our golden crispy pan crust.",
            category="Signature Pan",
            prices={"S": 9.99, "M": 14.99, "L": 19.99},
            image_url="https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80"
        );
        root ++> Pizza(
            id="pizza_2",
            name="Tandoori Chicken",
            description="Tender spiced tandoori chicken breast, crunchy red onions, crisp green peppers, and a drizzle of aromatic garlic herb mayo.",
            category="Chef Specials",
            prices={"S": 11.49, "M": 16.99, "L": 21.99},
            image_url="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80"
        );
        root ++> Pizza(
            id="pizza_3",
            name="Margherita",
            description="Sun-ripened Italian tomato passata, fresh basil ribbons, extra-virgin olive oil drizzle, and bubbling 100% whole milk mozzarella.",
            category="Classic Italian",
            prices={"S": 8.99, "M": 13.49, "L": 17.99},
            image_url="https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80"
        );
        root ++> Pizza(
            id="pizza_4",
            name="Supreme",
            description="The ultimate loaded combo of seasoned beef, classic pepperoni, savory Italian sausage, button mushrooms, bell peppers, and onions.",
            category="Signature Pan",
            prices={"S": 11.99, "M": 17.49, "L": 22.99},
            image_url="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80"
        );
        root ++> Pizza(
            id="pizza_5",
            name="Veggie Lover",
            description="Garden-fresh medley of button mushrooms, crisp green bell peppers, sweet red onions, ripe Roma tomatoes, and black olives.",
            category="Loaded Veggie",
            prices={"S": 9.49, "M": 14.49, "L": 18.99},
            image_url="https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80"
        );
        root ++> Pizza(
            id="pizza_6",
            name="Cheese Melt",
            description="Indulgent four-cheese blend of golden cheddar, sharp parmesan, mild provolone, and stretchy mozzarella finished with herb butter.",
            category="Cheesy Stuffed",
            prices={"S": 10.49, "M": 15.49, "L": 20.49},
            image_url="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80"
        );

        report {"status": "seeded", "count": 6};
    }
}

walker:pub get_menu {
    can retrieve with Root entry {
        pizzas = [root -->][?:Pizza];
        if len(pizzas) == 0 {
            root spawn seed_menu();
            pizzas = [root -->][?:Pizza];
        }
        report pizzas;
    }
}

walker:pub get_catalog {
    can retrieve with Root entry {
        pizzas = [root -->][?:Pizza];
        if len(pizzas) == 0 {
            root spawn seed_menu();
            pizzas = [root -->][?:Pizza];
        }
        report pizzas;
    }
}

walker:pub add_to_cart {
    has pizza_id: str;
    has name: str = "";
    has size: str = "M";
    has qty: int = 1;
    has unit_price: float = 0.0;

    can add with Root entry {
        existing_items = [root -->][?:CartItem];
        for item in existing_items {
            if item.pizza_id == self.pizza_id and item.size == self.size {
                item.qty = item.qty + self.qty;
                if self.unit_price > 0.0 {
                    item.unit_price = self.unit_price;
                }
                if item.qty <= 0 {
                    del item;
                    report {"status": "removed", "pizza_id": self.pizza_id, "size": self.size};
                    disengage;
                } else {
                    report {"status": "updated", "item": item};
                    disengage;
                }
            }
        }

        if self.qty > 0 {
            new_item = (root ++> CartItem(
                pizza_id=self.pizza_id,
                name=self.name,
                size=self.size,
                qty=self.qty,
                unit_price=self.unit_price
            ))[0];
            report {"status": "added", "item": new_item};
        }
    }
}

walker:pub get_cart {
    can retrieve with Root entry {
        items = [root -->][?:CartItem];
        subtotal: float = 0.0;
        for item in items {
            subtotal = subtotal + (item.unit_price * float(item.qty));
        }
        subtotal_clean = float(int(subtotal * 100.0 + 0.5)) / 100.0;
        report {
            "items": items,
            "subtotal": subtotal_clean,
            "count": len(items)
        };
    }
}

walker:pub checkout_cart {
    can checkout with Root entry {
        items = [root -->][?:CartItem];
        if len(items) == 0 {
            report {"error": "Cart is empty", "order_id": ""};
            disengage;
        }

        subtotal: float = 0.0;
        order_items = [];
        for item in items {
            subtotal = subtotal + (item.unit_price * float(item.qty));
            order_items.append({
                "pizza_id": item.pizza_id,
                "name": item.name,
                "size": item.size,
                "qty": item.qty,
                "unit_price": item.unit_price
            });
        }

        total_price: float = float(int(subtotal * 100.0 + 0.5)) / 100.0;
        order_num = randint(100, 999);
        new_order_id = f"PH-{order_num}";
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M");

        root ++> Order(
            order_id=new_order_id,
            items=order_items,
            total_price=total_price,
            status="Order Placed",
            eta_minutes=35,
            updated_at=now_str
        );

        # Clear cart items after checkout
        for item in items {
            del item;
        }

        report {
            "order_id": new_order_id,
            "status": "Order Placed",
            "eta_minutes": 35,
            "total_price": total_price,
            "items_count": len(order_items)
        };
    }
}

walker:pub clear_cart {
    can clear with Root entry {
        items = [root -->][?:CartItem];
        for item in items {
            del item;
        }
        report {"status": "cleared"};
    }
}
