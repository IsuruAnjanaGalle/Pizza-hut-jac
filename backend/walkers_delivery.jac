import from models { Order }
import from datetime { datetime }

walker:pub get_order_status {
    has order_id: str = "";

    can get_status with Root entry {
        orders = [root -->][?:Order];
        target_order: Order | None = None;

        if len(orders) == 0 {
            # Fallback mock order if no orders exist on the graph
            target_order = (root ++> Order(
                order_id = "PH-8942-X",
                items = [
                    {
                        "pizza_id": "p1",
                        "name": "Super Supreme Pan Pizza",
                        "size": "Large (14\")",
                        "qty": 1,
                        "unit_price": 18.99
                    },
                    {
                        "pizza_id": "s1",
                        "name": "Garlic Bread Stix",
                        "size": "Standard (4 pcs)",
                        "qty": 1,
                        "unit_price": 5.99
                    },
                    {
                        "pizza_id": "d1",
                        "name": "Pepsi Zero Sugar",
                        "size": "2L Bottle",
                        "qty": 1,
                        "unit_price": 3.49
                    }
                ],
                total_price = 28.47,
                status = "Order Placed",
                eta_minutes = 35,
                updated_at = datetime.now().strftime("%I:%M %p")
            ))[0] as Order;
        } elif self.order_id != "" {
            for o in orders {
                if o.order_id == self.order_id {
                    target_order = o;
                    break;
                }
            }
            if target_order is None {
                # Create new order with this custom ID if requested but missing
                target_order = (root ++> Order(
                    order_id = self.order_id,
                    items = [
                        {
                            "pizza_id": "p1",
                            "name": "Super Supreme Pan Pizza",
                            "size": "Large (14\")",
                            "qty": 1,
                            "unit_price": 18.99
                        },
                        {
                            "pizza_id": "s1",
                            "name": "Garlic Bread Stix",
                            "size": "Standard (4 pcs)",
                            "qty": 1,
                            "unit_price": 5.99
                        }
                    ],
                    total_price = 24.98,
                    status = "Order Placed",
                    eta_minutes = 35,
                    updated_at = datetime.now().strftime("%I:%M %p")
                ))[0] as Order;
            }
        } else {
            target_order = orders[-1];
        }

        if target_order is not None {
            report {
                "order_id": target_order.order_id,
                "items": target_order.items,
                "total_price": target_order.total_price,
                "status": target_order.status,
                "eta_minutes": target_order.eta_minutes,
                "updated_at": target_order.updated_at
            };
        }
    }
}

walker:pub advance_order_stage {
    has order_id: str = "";

    can advance with Root entry {
        orders = [root -->][?:Order];
        target_order: Order | None = None;

        if len(orders) == 0 {
            # Fallback mock order if no order exists yet
            fallback_id = self.order_id if self.order_id != "" else "PH-8942-X";
            target_order = (root ++> Order(
                order_id = fallback_id,
                items = [
                    {
                        "pizza_id": "p1",
                        "name": "Super Supreme Pan Pizza",
                        "size": "Large (14\")",
                        "qty": 1,
                        "unit_price": 18.99
                    },
                    {
                        "pizza_id": "s1",
                        "name": "Garlic Bread Stix",
                        "size": "Standard (4 pcs)",
                        "qty": 1,
                        "unit_price": 5.99
                    },
                    {
                        "pizza_id": "d1",
                        "name": "Pepsi Zero Sugar",
                        "size": "2L Bottle",
                        "qty": 1,
                        "unit_price": 3.49
                    }
                ],
                total_price = 28.47,
                status = "Order Placed",
                eta_minutes = 35,
                updated_at = datetime.now().strftime("%I:%M %p")
            ))[0] as Order;
        } elif self.order_id != "" {
            for o in orders {
                if o.order_id == self.order_id {
                    target_order = o;
                    break;
                }
            }
            if target_order is None {
                target_order = (root ++> Order(
                    order_id = self.order_id,
                    items = [
                        {
                            "pizza_id": "p1",
                            "name": "Super Supreme Pan Pizza",
                            "size": "Large (14\")",
                            "qty": 1,
                            "unit_price": 18.99
                        },
                        {
                            "pizza_id": "s1",
                            "name": "Garlic Bread Stix",
                            "size": "Standard (4 pcs)",
                            "qty": 1,
                            "unit_price": 5.99
                        }
                    ],
                    total_price = 24.98,
                    status = "Order Placed",
                    eta_minutes = 35,
                    updated_at = datetime.now().strftime("%I:%M %p")
                ))[0] as Order;
            }
        } else {
            target_order = orders[-1];
        }

        if target_order is not None {
            # Advance sequentially:
            # "Order Placed" -> "Baking in 450°F Oven" -> "Boxed & Quality Checked" -> "Out for Delivery" -> "Delivered"
            # 35 -> 25 -> 18 -> 8 -> 0
            if target_order.status == "Order Placed" {
                target_order.status = "Baking in 450°F Oven";
                target_order.eta_minutes = 25;
            } elif target_order.status == "Baking in 450°F Oven" {
                target_order.status = "Boxed & Quality Checked";
                target_order.eta_minutes = 18;
            } elif target_order.status == "Boxed & Quality Checked" {
                target_order.status = "Out for Delivery";
                target_order.eta_minutes = 8;
            } elif target_order.status == "Out for Delivery" {
                target_order.status = "Delivered";
                target_order.eta_minutes = 0;
            } elif target_order.status == "Delivered" {
                # Allow looping back for hackathon demo convenience
                target_order.status = "Order Placed";
                target_order.eta_minutes = 35;
            } else {
                target_order.status = "Baking in 450°F Oven";
                target_order.eta_minutes = 25;
            }

            target_order.updated_at = datetime.now().strftime("%I:%M %p");

            report {
                "order_id": target_order.order_id,
                "items": target_order.items,
                "total_price": target_order.total_price,
                "status": target_order.status,
                "eta_minutes": target_order.eta_minutes,
                "updated_at": target_order.updated_at
            };
        }
    }
}

walker:pub track_order {
    has order_id: str = "";

    can track with Root entry {
        orders = [root -->][?:Order];
        target_order: Order | None = None;

        if len(orders) == 0 {
            target_order = (root ++> Order(
                order_id = "PH-8942-X",
                items = [
                    {
                        "pizza_id": "p1",
                        "name": "Super Supreme Pan Pizza",
                        "size": "Large (14\")",
                        "qty": 1,
                        "unit_price": 18.99
                    },
                    {
                        "pizza_id": "s1",
                        "name": "Garlic Bread Stix",
                        "size": "Standard (4 pcs)",
                        "qty": 1,
                        "unit_price": 5.99
                    }
                ],
                total_price = 24.98,
                status = "Order Placed",
                eta_minutes = 35,
                updated_at = datetime.now().strftime("%I:%M %p")
            ))[0] as Order;
        } elif self.order_id != "" {
            for o in orders {
                if o.order_id == self.order_id {
                    target_order = o;
                    break;
                }
            }
            if target_order is None {
                target_order = orders[-1];
            }
        } else {
            target_order = orders[-1];
        }

        if target_order is not None {
            report {
                "order_id": target_order.order_id,
                "items": target_order.items,
                "total_price": target_order.total_price,
                "status": target_order.status,
                "eta_minutes": target_order.eta_minutes,
                "updated_at": target_order.updated_at
            };
        }
    }
}
