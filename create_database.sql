CREATE database ecommerce_recommender;
use ecommerce_recommender;

create table users(
	id int auto_increment primary key,
    username varchar(50) not null unique,
    email varchar(100) not null unique,
    password_hash varchar(255) not null, 
    created_at timestamp default current_timestamp
);

create table products(
	id int auto_increment primary key,
    name varchar(255) not null,
    description text,
    price decimal(10, 2) not null,
    category varchar(100),
    image_url varchar(255), 
    stock_quantity int default 0,
    created_at timestamp default current_timestamp
);

create table user_interactions(
	id int auto_increment primary key,
    user_id int not null, 
    product_id int not null,
    interaction_type varchar(50) not null,
    interaction_value int, 
    interaction_time timestamp default current_timestamp,
    foreign key (user_id) references users(id),
    foreign key (product_id) references products(id)
);

INSERT INTO users (username, email, password_hash) VALUES
('user1', 'user1@gmail.com', 'password1'),
('user2', 'user2@example.com', 'password2');

select * from users;

INSERT INTO products (name, description, price, category, image_url, stock_quantity) VALUES
('Laptop Pro', 'Powerful laptop for professionals.', 1200.00, 'Electronics', 'url_to_laptop_image.jpg', 50),
('Mechanical Keyboard', 'High-quality mechanical keyboard with RGB.', 99.99, 'Accessories', 'url_to_keyboard_image.jpg', 100),
('Wireless Mouse', 'Ergonomic wireless mouse.', 25.00, 'Accessories', 'url_to_mouse_image.jpg', 200),
('4K Monitor', 'Ultra HD monitor for stunning visuals.', 350.00, 'Electronics', 'url_to_monitor_image.jpg', 30);

select * from products;

select * from user_interactions;

USE ecommerce_recommender;
SET SQL_SAFE_UPDATES = 0;

-- Update existing products with sample image URLs
UPDATE products
SET image_url = 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzF8fGxhcHRvcHxlbnwwfHwwfHx8MA%3D%3D'
WHERE name = 'Laptop Pro';

UPDATE products
SET image_url = 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8a2V5Ym9hcmR8ZW58MHx8MHx8fDA%3D'
WHERE name = 'Keyboard';

UPDATE products
SET image_url = 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bW91c2V8ZW58MHx8MHx8fDA%3D'
WHERE name = 'Wireless Mouse';

UPDATE products
SET image_url = 'https://plus.unsplash.com/premium_photo-1669380425564-6e1a281a4d30?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8NGslMjBtb25pdG9yfGVufDB8fDB8fHww'
WHERE name = '4K Monitor';

-- Optional: If you want to add more products with images
-- INSERT INTO products (name, description, price, category, image_url, stock_quantity) VALUES
-- ('Gaming Headset', 'Immersive sound for gaming.', 75.00, 'Audio', 'https://picsum.photos/id/5/300/200', 60),
-- ('Webcam 1080p', 'Full HD video calls.', 45.00, 'Accessories', 'https://picsum.photos/id/6/300/200', 80);

SELECT id, name, image_url FROM products; -- Verify the update


ALTER TABLE users
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Set one of your existing users as admin (e.g., user with id=1)
UPDATE users
SET is_admin = TRUE
WHERE id = 3; -- Replace 1 with the ID of the user you want to make admin


ALTER TABLE user_interactions
DROP FOREIGN KEY user_interactions_ibfk_2;


-- Second, re-add the foreign key with the ON DELETE CASCADE option.
ALTER TABLE user_interactions
ADD CONSTRAINT user_interactions_ibfk_2
FOREIGN KEY (product_id)
REFERENCES products (id)
ON DELETE CASCADE;