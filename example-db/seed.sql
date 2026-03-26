-- ============================================================
--  Litabase Example Database — E-Commerce Store
--  Tables: customers, products, categories, orders, order_items
-- ============================================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category_id INT REFERENCES categories(id),
  price NUMERIC(10,2) NOT NULL,
  stock INT DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  country VARCHAR(100),
  city VARCHAR(100),
  joined_at DATE NOT NULL
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  status VARCHAR(50) DEFAULT 'completed', -- completed, refunded, pending
  total NUMERIC(10,2),
  created_at DATE NOT NULL
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id),
  product_id INT REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- ============================================================
--  Seed Data
-- ============================================================

INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Clothing'),
  ('Books'),
  ('Home & Garden'),
  ('Sports');

INSERT INTO products (name, category_id, price, stock) VALUES
  ('Wireless Headphones',     1, 79.99,  120),
  ('Mechanical Keyboard',     1, 129.99,  85),
  ('USB-C Hub',               1, 39.99,  200),
  ('Smartwatch',              1, 199.99,  60),
  ('Bluetooth Speaker',       1, 59.99,  150),
  ('Running Shoes',           2, 89.99,  300),
  ('Yoga Pants',              2, 44.99,  250),
  ('Winter Jacket',           2, 149.99,  90),
  ('Cotton T-Shirt',          2, 19.99,  500),
  ('Denim Jeans',             2, 59.99,  180),
  ('Clean Code',              3, 34.99,  400),
  ('The Pragmatic Programmer',3, 39.99,  350),
  ('Designing Data Systems',  3, 44.99,  300),
  ('JavaScript: The Good Parts',3,24.99, 420),
  ('System Design Interview', 3, 29.99,  380),
  ('Standing Desk',           4, 349.99,  40),
  ('Plant Pot Set',           4, 24.99,  220),
  ('Coffee Maker',            4, 79.99,  110),
  ('Air Purifier',            4, 129.99,  75),
  ('Yoga Mat',                5, 29.99,  300),
  ('Dumbbell Set',            5, 89.99,   80),
  ('Resistance Bands',        5, 19.99,  350),
  ('Jump Rope',               5,  9.99,  400),
  ('Water Bottle',            5, 24.99,  500);

INSERT INTO customers (name, email, country, city, joined_at) VALUES
  ('Alice Johnson',   'alice@example.com',   'USA',     'New York',     '2022-01-15'),
  ('Bob Smith',       'bob@example.com',     'USA',     'San Francisco','2022-02-20'),
  ('Carol White',     'carol@example.com',   'UK',      'London',       '2022-03-10'),
  ('David Brown',     'david@example.com',   'Canada',  'Toronto',      '2022-04-05'),
  ('Emma Davis',      'emma@example.com',    'Germany', 'Berlin',       '2022-05-18'),
  ('Frank Miller',    'frank@example.com',   'USA',     'Chicago',      '2022-06-22'),
  ('Grace Wilson',    'grace@example.com',   'Australia','Sydney',      '2022-07-30'),
  ('Henry Moore',     'henry@example.com',   'France',  'Paris',        '2022-08-14'),
  ('Iris Taylor',     'iris@example.com',    'USA',     'Austin',       '2022-09-01'),
  ('Jack Anderson',   'jack@example.com',    'Japan',   'Tokyo',        '2022-10-12'),
  ('Kate Thomas',     'kate@example.com',    'USA',     'Seattle',      '2022-11-25'),
  ('Liam Jackson',    'liam@example.com',    'UK',      'Manchester',   '2023-01-08'),
  ('Mia Harris',      'mia@example.com',     'Canada',  'Vancouver',    '2023-02-14'),
  ('Noah Martin',     'noah@example.com',    'USA',     'Boston',       '2023-03-20'),
  ('Olivia Garcia',   'olivia@example.com',  'Spain',   'Madrid',       '2023-04-05'),
  ('Paul Martinez',   'paul@example.com',    'Mexico',  'Mexico City',  '2023-05-11'),
  ('Quinn Robinson',  'quinn@example.com',   'USA',     'Denver',       '2023-06-18'),
  ('Rachel Clark',    'rachel@example.com',  'Brazil',  'São Paulo',    '2023-07-22'),
  ('Sam Rodriguez',   'sam@example.com',     'USA',     'Miami',        '2023-08-30'),
  ('Tara Lewis',      'tara@example.com',    'India',   'Mumbai',       '2023-09-15');

-- Generate orders across 2023-2024
INSERT INTO orders (customer_id, status, total, created_at) VALUES
  ( 1,'completed', 209.97, '2023-01-05'),
  ( 2,'completed', 129.99, '2023-01-12'),
  ( 3,'completed',  79.99, '2023-01-20'),
  ( 4,'completed', 174.98, '2023-02-03'),
  ( 5,'completed', 349.99, '2023-02-14'),
  ( 6,'refunded',   44.99, '2023-02-28'),
  ( 7,'completed', 199.99, '2023-03-07'),
  ( 8,'completed',  89.99, '2023-03-15'),
  ( 9,'completed', 129.98, '2023-03-22'),
  (10,'completed',  59.99, '2023-04-01'),
  (11,'completed', 269.98, '2023-04-10'),
  (12,'completed',  34.99, '2023-04-18'),
  (13,'completed', 149.99, '2023-05-02'),
  (14,'completed', 109.98, '2023-05-20'),
  (15,'refunded',   79.99, '2023-05-28'),
  (16,'completed', 199.99, '2023-06-05'),
  (17,'completed',  64.98, '2023-06-14'),
  (18,'completed', 129.99, '2023-06-25'),
  (19,'completed', 279.98, '2023-07-04'),
  (20,'completed',  89.99, '2023-07-12'),
  ( 1,'completed', 159.98, '2023-07-20'),
  ( 2,'completed',  44.99, '2023-08-01'),
  ( 3,'completed', 199.99, '2023-08-09'),
  ( 4,'completed',  74.98, '2023-08-18'),
  ( 5,'completed', 389.98, '2023-09-01'),
  ( 6,'completed',  39.99, '2023-09-10'),
  ( 7,'completed', 109.98, '2023-09-22'),
  ( 8,'refunded',  149.99, '2023-09-28'),
  ( 9,'completed', 249.98, '2023-10-05'),
  (10,'completed',  59.98, '2023-10-14'),
  (11,'completed', 179.99, '2023-10-22'),
  (12,'completed',  89.98, '2023-11-01'),
  (13,'completed', 329.99, '2023-11-10'),
  (14,'completed',  49.99, '2023-11-20'),
  (15,'completed', 139.98, '2023-11-28'),
  (16,'completed', 259.98, '2023-12-05'),
  (17,'completed', 199.99, '2023-12-12'),
  (18,'completed',  79.99, '2023-12-20'),
  (19,'completed', 349.98, '2023-12-26'),
  (20,'completed', 129.99, '2023-12-30'),
  ( 1,'completed', 299.98, '2024-01-08'),
  ( 2,'completed',  59.99, '2024-01-15'),
  ( 3,'completed', 149.99, '2024-02-02'),
  ( 4,'completed', 219.98, '2024-02-18'),
  ( 5,'completed',  89.99, '2024-03-01'),
  ( 6,'completed', 179.98, '2024-03-15'),
  ( 7,'completed', 399.99, '2024-04-02'),
  ( 8,'completed',  69.99, '2024-04-18'),
  ( 9,'completed', 259.97, '2024-05-05'),
  (10,'completed', 109.98, '2024-05-20');

-- Order items (link orders to products)
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1,  1, 1, 79.99),(1,  2, 1,129.99),
  (2,  2, 1,129.99),
  (3,  1, 1, 79.99),
  (4,  6, 1, 89.99),(4,  7, 1, 44.99),(4, 22, 2, 19.99),
  (5, 16, 1,349.99),
  (6,  7, 1, 44.99),
  (7,  4, 1,199.99),
  (8,  6, 1, 89.99),
  (9,  3, 2, 39.99),(9, 14, 1, 24.99),(9, 22, 1, 19.99),
  (10, 5, 1, 59.99),
  (11, 4, 1,199.99),(11, 3, 1, 39.99),(11,23, 1, 19.99),(11,20, 1, 29.99),
  (12,11, 1, 34.99),
  (13, 8, 1,149.99),
  (14,11, 1, 34.99),(14,12, 1, 39.99),(14,14, 1, 24.99),(14,15, 1, 29.99),
  (15, 1, 1, 79.99),
  (16, 4, 1,199.99),
  (17,20, 1, 29.99),(17,22, 1, 19.99),(17,24, 1, 24.99),
  (18, 2, 1,129.99),
  (19,16, 1,349.99),(19,17, 2, 24.99),(19,20, 1, 29.99),(19,23, 2, 19.99),
  (20, 6, 1, 89.99),
  (21, 8, 1,149.99),(21, 3, 1, 39.99),
  (22, 7, 1, 44.99),
  (23, 4, 1,199.99),
  (24,20, 1, 29.99),(24,22, 1, 19.99),(24,24, 1, 24.99),
  (25,16, 1,349.99),(25, 2, 1,129.99),(25, 1, 1, 79.99),(25,23, 1, 19.99),(25,20, 1, 29.99),
  (26, 3, 1, 39.99),
  (27,13, 1, 44.99),(27,15, 1, 29.99),(27,14, 1, 24.99),(27,23, 1, 19.99),
  (28, 8, 1,149.99),
  (29, 4, 1,199.99),(29, 2, 1, 39.99),(29,14, 1, 24.99),
  (30, 5, 1, 59.99),(30,24, 1, 24.99),
  (31, 6, 1, 89.99),(31, 1, 1, 79.99),(31,20, 1, 29.99),
  (32,21, 1, 89.99),
  (33, 4, 1,199.99),(33,16, 1,349.99),
  (34,15, 1, 29.99),(34,13, 1, 44.99),
  (35, 8, 1,149.99),
  (36, 4, 1,199.99),(36, 1, 1, 79.99),
  (37, 4, 1,199.99),
  (38, 1, 1, 79.99),
  (39,16, 1,349.99),(39, 1, 1, 79.99),
  (40, 2, 1,129.99),
  (41, 4, 1,199.99),(41, 6, 1, 89.99),(41,20, 1, 29.99),
  (42, 5, 1, 59.99),
  (43, 8, 1,149.99),
  (44, 4, 1,199.99),(44, 1, 1, 79.99),
  (45, 6, 1, 89.99),
  (46, 8, 1,149.99),(46, 2, 1, 29.99),
  (47,16, 1,349.99),(47,20, 1, 29.99),(47,24, 1, 24.99),
  (48, 1, 1, 79.99),
  (49, 4, 1,199.99),(49, 1, 1, 79.99),(49,20, 1, 29.99),
  (50,13, 1, 44.99),(50,11, 1, 34.99),(50,14, 1, 24.99);
