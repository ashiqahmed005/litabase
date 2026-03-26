-- ============================================================
--  Litabase Example Queries
--  Connection: host=example-db  port=5432  db=shop  user=demo  pass=demo
-- ============================================================


-- ── TABLE EXAMPLES ──────────────────────────────────────────

-- All products with category name
SELECT p.id, p.name, c.name AS category, p.price, p.stock
FROM products p
JOIN categories c ON c.id = p.category_id
ORDER BY p.price DESC;


-- All customers with order count and total spent
SELECT
  c.name,
  c.country,
  COUNT(o.id)        AS total_orders,
  SUM(o.total)       AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.country
ORDER BY total_spent DESC;


-- Recent orders with customer name and status
SELECT
  o.id,
  c.name        AS customer,
  o.status,
  o.total,
  o.created_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
ORDER BY o.created_at DESC
LIMIT 20;


-- ── BAR CHART EXAMPLES ──────────────────────────────────────

-- Revenue by category  →  X: category  Y: revenue
SELECT
  c.name              AS category,
  ROUND(SUM(oi.quantity * oi.unit_price)::numeric, 2) AS revenue
FROM order_items oi
JOIN products p  ON p.id  = oi.product_id
JOIN categories c ON c.id = p.category_id
GROUP BY c.name
ORDER BY revenue DESC;


-- Top 10 best-selling products  →  X: product  Y: units_sold
SELECT
  p.name          AS product,
  SUM(oi.quantity) AS units_sold
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.name
ORDER BY units_sold DESC
LIMIT 10;


-- Orders by country  →  X: country  Y: orders
SELECT
  c.country,
  COUNT(o.id) AS orders
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.country
ORDER BY orders DESC;


-- ── LINE CHART EXAMPLES ─────────────────────────────────────

-- Monthly revenue 2023  →  X: month  Y: revenue
SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS month,
  ROUND(SUM(total)::numeric, 2)  AS revenue
FROM orders
WHERE status = 'completed'
  AND created_at BETWEEN '2023-01-01' AND '2023-12-31'
GROUP BY month
ORDER BY month;


-- Monthly revenue 2023 vs 2024  →  X: month  Y: revenue
SELECT
  TO_CHAR(created_at, 'MM') AS month,
  ROUND(SUM(CASE WHEN EXTRACT(YEAR FROM created_at) = 2023 THEN total ELSE 0 END)::numeric,2) AS revenue_2023,
  ROUND(SUM(CASE WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN total ELSE 0 END)::numeric,2) AS revenue_2024
FROM orders
WHERE status = 'completed'
GROUP BY month
ORDER BY month;


-- New customers per month  →  X: month  Y: new_customers
SELECT
  TO_CHAR(joined_at, 'YYYY-MM') AS month,
  COUNT(*)                       AS new_customers
FROM customers
GROUP BY month
ORDER BY month;


-- ── PIE CHART EXAMPLES ──────────────────────────────────────

-- Revenue share by category  →  X: category  Y: revenue
SELECT
  c.name AS category,
  ROUND(SUM(oi.quantity * oi.unit_price)::numeric, 2) AS revenue
FROM order_items oi
JOIN products p   ON p.id  = oi.product_id
JOIN categories c ON c.id  = p.category_id
GROUP BY c.name;


-- Order status breakdown  →  X: status  Y: count
SELECT status, COUNT(*) AS count
FROM orders
GROUP BY status;


-- Customers by country  →  X: country  Y: customers
SELECT country, COUNT(*) AS customers
FROM customers
GROUP BY country
ORDER BY customers DESC;


-- ── SCATTER PLOT EXAMPLES ────────────────────────────────────

-- Price vs stock level  →  X: price  Y: stock
SELECT name, price, stock
FROM products
ORDER BY price;


-- Customer total spent vs number of orders  →  X: total_orders  Y: total_spent
SELECT
  c.name,
  COUNT(o.id)                        AS total_orders,
  ROUND(SUM(o.total)::numeric, 2)    AS total_spent
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY total_orders;
