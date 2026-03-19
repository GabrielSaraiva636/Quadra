CREATE DATABASE IF NOT EXISTS society_db;
USE society_db;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(800) NOT NULL,
  role VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS game_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  description VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO game_status (id, description) VALUES
(1, 'EM ANDAMENTO'),
(2, 'ENCERRADO'),
(3, 'CANCELADO'),
(4, 'NAO INICIADO');

UPDATE game_status SET description = 'EM ANDAMENTO' WHERE id = 1;
UPDATE game_status SET description = 'ENCERRADO' WHERE id = 2;
UPDATE game_status SET description = 'CANCELADO' WHERE id = 3;
UPDATE game_status SET description = 'NAO INICIADO' WHERE id = 4;

CREATE TABLE IF NOT EXISTS games (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  responsible_name VARCHAR(200) NOT NULL,
  price_per_hour DECIMAL(10,2) NOT NULL,
  total_game_value DECIMAL(10,2) NOT NULL,
  paying_players_count INT NOT NULL DEFAULT 1,
  game_status_id INT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_games_status FOREIGN KEY (game_status_id) REFERENCES game_status(id),
  CONSTRAINT fk_games_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS paying_players_count INT NOT NULL DEFAULT 1 AFTER total_game_value;

CREATE TABLE IF NOT EXISTS game_customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  game_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  is_paying_player TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_game_customer (game_id, name)
) ENGINE=InnoDB;

ALTER TABLE game_customers
  ADD COLUMN IF NOT EXISTS is_paying_player TINYINT(1) NOT NULL DEFAULT 0 AFTER name;

CREATE TABLE IF NOT EXISTS account_type (
  id INT PRIMARY KEY AUTO_INCREMENT,
  description VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO account_type (id, description) VALUES
(1, 'JOGO'),
(2, 'INDIVIDUAL');

UPDATE account_type SET description = 'JOGO' WHERE id = 1;
UPDATE account_type SET description = 'INDIVIDUAL' WHERE id = 2;

CREATE TABLE IF NOT EXISTS payment_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  description VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO payment_status (id, description) VALUES
(1, 'PAGO'),
(2, 'PENDENTE');

UPDATE payment_status SET description = 'PAGO' WHERE id = 1;
UPDATE payment_status SET description = 'PENDENTE' WHERE id = 2;

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  description VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO payment_methods (id, description) VALUES
(1, 'DINHEIRO'),
(2, 'PIX'),
(3, 'DEBITO'),
(4, 'CREDITO');

UPDATE payment_methods SET description = 'DINHEIRO' WHERE id = 1;
UPDATE payment_methods SET description = 'PIX' WHERE id = 2;
UPDATE payment_methods SET description = 'DEBITO' WHERE id = 3;
UPDATE payment_methods SET description = 'CREDITO' WHERE id = 4;

CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO categories (id, name) VALUES
(1, 'BEBIDAS'),
(2, 'LANCHES'),
(3, 'OUTROS');

CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  category INT NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  min_quantity INT NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  active INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category FOREIGN KEY (category) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements_type (
  id INT PRIMARY KEY AUTO_INCREMENT,
  description VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO stock_movements_type (id, description) VALUES
(1, 'ENTRADA'),
(2, 'SAIDA'),
(3, 'AJUSTE');

UPDATE stock_movements_type SET description = 'ENTRADA' WHERE id = 1;
UPDATE stock_movements_type SET description = 'SAIDA' WHERE id = 2;
UPDATE stock_movements_type SET description = 'AJUSTE' WHERE id = 3;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  stock_movements_type_id INT NOT NULL,
  quantity INT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_stock_type FOREIGN KEY (stock_movements_type_id) REFERENCES stock_movements_type(id),
  CONSTRAINT fk_stock_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  game_id INT NOT NULL,
  customer_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  payment_status_id INT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_customer FOREIGN KEY (customer_id) REFERENCES game_customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_item_payment_status FOREIGN KEY (payment_status_id) REFERENCES payment_status(id),
  CONSTRAINT fk_item_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  game_id INT NOT NULL,
  customer_id INT NULL,
  account_type_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method_id INT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_game FOREIGN KEY (game_id) REFERENCES games(id),
  CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES game_customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_payment_account_type FOREIGN KEY (account_type_id) REFERENCES account_type(id),
  CONSTRAINT fk_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
  CONSTRAINT fk_payment_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cash_register (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL UNIQUE,
  opening_amount DECIMAL(10,2) NOT NULL,
  current_cash_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
