import from models { Pizza, CartItem, Order, ChatSession }

# Placeholder for Delivery Walkers
# Developers can implement order placement, dispatch, and delivery tracking here.
walker:pub track_order {
    has order_id: str = "";

    can track with Root entry {
        report {};
    }
}
