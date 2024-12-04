const express = require("express");
const bodyParser = require("body-parser");
const cron = require("node-cron");

const app = express();
app.use(bodyParser.json());

// Menu and orders storage
const menuList = [];
const orderList = [];
let orderCounter = 1;

// Allowed menu categories
const ALLOWED_CATEGORIES = ["South Indian", "Beverages", "Sweats"];

// Helper function to validate menu items
function validateMenuItem(item) {
  if (!item.name || typeof item.name !== "string") return "Item name must be a valid string.";
  if (!item.price || typeof item.price !== "number" || item.price <= 0) return "Item price must be a positive number.";
  if (!ALLOWED_CATEGORIES.includes(item.category)) {
    return `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(", ")}`;
  }
  return null;
}

// Add or update a menu item
app.post("/menu", (req, res) => {
  const { name, price, category } = req.body;

  const error = validateMenuItem({ name, price, category });
  if (error) {
    return res.status(400).json({ error });
  }

  const existingItem = menuList.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existingItem) {
    existingItem.price = price;
    existingItem.category = category;
    return res.status(200).json({ message: "Menu item updated successfully.", item: existingItem });
  }

  const newMenuItem = { id: menuList.length + 1, name, price, category };
  menuList.push(newMenuItem);
  res.status(201).json({ message: "New menu item added.", item: newMenuItem });
});

// Fetch the menu
app.get("/menu", (req, res) => {
  res.status(200).json(menuList);
});

// Place an order
app.post("/orders", (req, res) => {
  const { items, customerName } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order items must be provided as a non-empty array." });
  }

  const invalidItemId = items.find((id) => !menuList.find((menuItem) => menuItem.id === id));
  if (invalidItemId) {
    return res.status(400).json({ error: `Invalid item ID: ${invalidItemId}` });
  }

  const newOrder = {
    orderId: orderCounter++,
    items,
    customerName,
    status: "Preparing",
    createdAt: new Date(),
  };
  orderList.push(newOrder);
  res.status(201).json({ message: "Order placed successfully.", orderId: newOrder.orderId, status: newOrder.status });
});

// Get details of a specific order
app.get("/orders/:id", (req, res) => {
  const order = orderList.find((o) => o.orderId === parseInt(req.params.id, 10));
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  const detailedOrder = {
    ...order,
    items: order.items.map((id) => menuList.find((m) => m.id === id)),
  };
  res.status(200).json(detailedOrder);
});

// Cron job to update order statuses
cron.schedule("*/1 * * * *", () => {
  orderList.forEach((order) => {
    if (order.status === "Preparing") {
      order.status = "Out for Delivery";
    } else if (order.status === "Out for Delivery") {
      order.status = "Delivered";
    }
  });
  console.log("Order statuses have been updated.");
});

// Start the server
const PORT = 3300;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
