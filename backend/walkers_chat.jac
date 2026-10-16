import:jac from models, Pizza, CartItem, Order, ChatSession;

# Placeholder for AI Chat Walkers
# Developers can implement conversational AI ordering, intent parsing, and recommendations here.
walker:pub chat_session {
    has session_id: str = "";
    has message: str = "";

    can chat with Root entry {
        report {
            "response": "Hello from Pizza Hut AI Assistant!",
            "session_id": self.session_id
        };
    }
}
