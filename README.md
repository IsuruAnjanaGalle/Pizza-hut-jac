# Pizza Hut Jac - Baseline Monorepo Skeleton

A shared monorepo baseline for a team of 3 developers building a Pizza Hut ordering platform powered by **Jaseci / Jaclang** on the backend and **React 19 + TypeScript + Vite + Tailwind CSS** on the frontend.

---

## Monorepo Architecture

```
Pizza-hut-jac/
├── backend/
│   ├── models.jac              # Shared Data Contract (Pizza, CartItem, Order, ChatSession)
│   ├── walkers_catalog.jac     # Dev 1: Catalog listing & cart walkers
│   ├── walkers_delivery.jac    # Dev 2: Order status & delivery tracking walkers
│   ├── walkers_chat.jac        # Dev 3: AI conversational ordering walkers
│   ├── main.jac                # Backend entrypoint (includes models & all walkers)
│   └── jac.toml                # Jac project configuration
├── frontend/
│   ├── package.json            # Vite + React 19 + TS + Tailwind v4
│   ├── vite.config.ts          # Vite configuration with walker proxy
│   └── src/
│       ├── api/
│       │   └── jacClient.ts    # Reusable callWalker helper
│       ├── pages/
│       │   ├── CatalogCart.tsx # Dev 1 UI Placeholder (Route: /)
│       │   ├── Tracker.tsx     # Dev 2 UI Placeholder (Route: /tracker)
│       │   └── AiChat.tsx      # Dev 3 UI Placeholder (Route: /chat)
│       ├── App.tsx             # Crimson red navigation shell & router
│       ├── index.css           # Tailwind CSS styles
│       └── main.tsx            # React application entrypoint
├── start_backend.bat           # Run Jac backend on port 8000
└── start_frontend.bat          # Run Frontend dev server on port 3000
```

---

## 1. Backend Data Contract (`backend/models.jac`)

Shared nodes used across all walker modules:

- **`Pizza`**: `(id: str, name: str, description: str, category: str, prices: dict, image_url: str)`
- **`CartItem`**: `(pizza_id: str, name: str, size: str, qty: int, unit_price: float)`
- **`Order`**: `(order_id: str, items: list, total_price: float, status: str, eta_minutes: int, updated_at: str)`
- **`ChatSession`**: `(session_id: str, history: list = [])`

---

## 2. Team Branching Guide

| Role | Branch | Backend Walker File | Frontend View | Primary Nodes |
|---|---|---|---|---|
| **Developer 1** | `feature/catalog-cart` | `backend/walkers_catalog.jac` | `frontend/src/pages/CatalogCart.tsx` (`/`) | `Pizza`, `CartItem` |
| **Developer 2** | `feature/order-tracker` | `backend/walkers_delivery.jac` | `frontend/src/pages/Tracker.tsx` (`/tracker`) | `Order` |
| **Developer 3** | `feature/ai-chat` | `backend/walkers_chat.jac` | `frontend/src/pages/AiChat.tsx` (`/chat`) | `ChatSession` |

---

## 3. Frontend Jac API Client (`frontend/src/api/jacClient.ts`)

Call any Jac walker easily using the exported `callWalker` helper:

```typescript
import { callWalker } from '../api/jacClient';

// Example: Retrieve menu catalog
const response = await callWalker('get_catalog');

// Example: Track an order
const orderStatus = await callWalker('track_order', { order_id: 'PH-8942-X' });

// Example: AI chat query
const reply = await callWalker('chat_session', { session_id: 'sess_1', message: 'Recommend a pizza' });
```

---

## 4. Running Locally

### Backend
```bash
cd backend
jac run --serve --no-client --port 8000 main.jac
# Or simply double click start_backend.bat
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Or simply double click start_frontend.bat
```
Navigate to `http://localhost:3000` to preview the Pizza Hut navigation bar and placeholder views.
