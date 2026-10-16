node Pizza {
    has id: str;
    has name: str;
    has description: str;
    has category: str;
    has prices: dict[str, any];
    has image_url: str;
}

node CartItem {
    has pizza_id: str;
    has name: str;
    has size: str;
    has qty: int;
    has unit_price: float;
}

node Order {
    has order_id: str;
    has items: list[any];
    has total_price: float;
    has status: str;
    has eta_minutes: int;
    has updated_at: str;
}

node ChatSession {
    has session_id: str;
    has history: list[any] = [];
}
