# app.py
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import pymysql.cursors
from config import config # Corrected to import the class name
import hashlib
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from functools import wraps # For admin_required decorator

# --- NEW IMPORTS FOR SQLAlchemy ---
from sqlalchemy import create_engine
from sqlalchemy.sql import text # For executing raw SQL with SQLAlchemy
from urllib.parse import quote_plus # For URL-encoding password in DB URI
# --- END NEW IMPORTS ---

# --- NEW IMPORTS FOR JWT ---
import jwt # The PyJWT library
from datetime import datetime, timedelta # For managing token expiration
# --- END NEW IMPORTS ---

app = Flask(__name__)
CORS(app)
app.config.from_object(config)


# --- DATABASE CONNECTION FUNCTIONS ---

# Function to return SQLAlchemy engine for Pandas operations
def get_db_engine():
    try:
        # URL-encode the password to handle special characters like '@'
        encoded_password = quote_plus(app.config['MYSQL_PASSWORD'])

        # Construct the database URI for SQLAlchemy
        # format: 'mysql+pymysql://user:password@host/database'
        db_uri = (
            f"mysql+pymysql://{app.config['MYSQL_USER']}:"
            f"{encoded_password}@{app.config['MYSQL_HOST']}/"
            f"{app.config['MYSQL_DB']}"
        )
        engine = create_engine(db_uri)
        
        # Test connection by executing a simple query
        with engine.connect() as connection:
            connection.execute(text("SELECT 1")).fetchone()
        print("SQLAlchemy engine created and connected successfully.")
        return engine
    except Exception as e:
        print(f"Error creating SQLAlchemy engine or connecting to database: {e}")
        return None

# Function to return a raw PyMySQL connection for direct cursor operations
def get_pymysql_connection():
    try:
        connection = pymysql.connect(
            host=app.config['MYSQL_HOST'],
            user=app.config['MYSQL_USER'],
            password=app.config['MYSQL_PASSWORD'],
            database=app.config['MYSQL_DB'],
            cursorclass=pymysql.cursors.DictCursor # Returns rows as dictionaries
        )
        return connection
    except Exception as e:
        print(f"Error connecting to database (PyMySQL direct): {e}")
        return None

# --- JWT AUTHENTICATION DECORATORS ---

def jwt_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        # Check for Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Expected format: "Bearer <token>"
                token_prefix, token = auth_header.split(' ')
                if token_prefix.lower() != 'bearer':
                    raise ValueError("Authorization header must start with 'Bearer'")
            except ValueError:
                return jsonify({"message": "Token is missing or invalid in Authorization header!"}), 401
        
        if not token:
            return jsonify({"message": "Token is missing!"}), 401

        try:
            # Decode the token using your secret key and algorithm
            # Audience 'aud' should match what was set during token creation
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"], audience="ecommerce-app")
            
            # Store user info from token in Flask's request-local global object 'g'
            g.user_id = payload['user_id']
            g.username = payload['username']
            g.is_admin = payload['is_admin']
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidAudienceError:
            return jsonify({"message": "Invalid token audience!"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"message": f"Invalid token: {e}"}), 401
        except Exception as e:
            # Catch any other unexpected errors during token validation
            print(f"Unexpected error during token validation: {e}")
            return jsonify({"message": "An unexpected error occurred during token validation."}), 500

        return f(*args, **kwargs)
    return decorated_function

# Modified ADMIN AUTHENTICATION DECORATOR to use JWT
def admin_required(f):
    @wraps(f)
    @jwt_required # Ensure token is present and valid first
    def decorated_function(*args, **kwargs):
        # After jwt_required runs, g.is_admin should be set
        if not g.is_admin:
            return jsonify({"message": "Admin access required"}), 403 # Forbidden
        
        return f(*args, **kwargs)
    return decorated_function


# --- ML UTILITY FUNCTIONS (COMPLETE BLOCK) ---

def load_interaction_data():
    """Loads all user interactions and product data into Pandas DataFrames using SQLAlchemy."""
    engine = get_db_engine() # Get the SQLAlchemy engine
    if engine is None:
        print("DEBUG: load_interaction_data failed - No DB engine.")
        return pd.DataFrame(), pd.DataFrame() # Return empty DataFrames on failure

    interactions_df = pd.DataFrame()
    products_df = pd.DataFrame()

    try:
        # Load user interactions using the SQLAlchemy engine
        interactions_sql = "SELECT user_id, product_id, interaction_type, interaction_value FROM user_interactions WHERE interaction_type = 'view'"
        interactions_df = pd.read_sql(interactions_sql, engine)

        # Ensure interaction_value is numeric (integer)
        if not interactions_df.empty and 'interaction_value' in interactions_df.columns:
            interactions_df['interaction_value'] = pd.to_numeric(interactions_df['interaction_value'], errors='coerce').fillna(0).astype(int)
        else:
            print("DEBUG: Interactions DataFrame is empty or 'interaction_value' column missing after read_sql.")
            if interactions_df.empty: # Ensure structure if empty
                interactions_df = pd.DataFrame(columns=['user_id', 'product_id', 'interaction_type', 'interaction_value'])

        # Load product details using the SQLAlchemy engine
        products_sql = "SELECT id, name, description, price, category, image_url, stock_quantity FROM products" # Added stock_quantity back to query
        products_df = pd.read_sql(products_sql, engine) # Use engine here

        # Convert price to float immediately upon loading from DB for consistency
        if not products_df.empty and 'price' in products_df.columns:
            products_df['price'] = products_df['price'].apply(lambda x: float(x) if x is not None else 0.0)
        else:
            print("DEBUG: Products DataFrame is empty or 'price' column missing after read_sql.")
            if products_df.empty: # Ensure structure if empty
                products_df = pd.DataFrame(columns=['id', 'name', 'description', 'price', 'category', 'image_url', 'stock_quantity'])

    except Exception as e:
        print(f"Error loading data for recommendations (SQLAlchemy): {e}")
        return pd.DataFrame(), pd.DataFrame() # Return empty DataFrames on error
    finally:
        return interactions_df, products_df

def create_user_item_matrix(interactions_df):
    """ Creates a user-item matrix from the interactions DataFrame.
    Rows are users, columns are products. Values are 1 (viewed) or 0 (not viewed)."""
    if interactions_df is None or interactions_df.empty:
        return pd.DataFrame(), [] # Return empty DataFrame and product IDs
    
    # Ensure product_id column exists before pivoting, if interactions_df is very sparse
    if 'product_id' not in interactions_df.columns or 'user_id' not in interactions_df.columns or 'interaction_value' not in interactions_df.columns:
        print("DEBUG: Interactions DataFrame missing required columns for pivot_table.")
        return pd.DataFrame(), []

    user_item_matrix = interactions_df.pivot_table(
        index='user_id',
        columns='product_id',
        values='interaction_value',
        fill_value=0,
        aggfunc='max'
    )
    user_item_matrix = (user_item_matrix > 0).astype(int)

    all_product_ids = user_item_matrix.columns.tolist()
    return user_item_matrix, all_product_ids

# --- CONTENT-BASED RECOMMENDATION FUNCTIONS ---

def get_product_features(products_df):
    """
    Combines relevant product attributes into a single string for TF-IDF vectorization.
    """
    if products_df is None or products_df.empty:
        return pd.Series(dtype=str) # Return empty Series of string type

    products_df['description'] = products_df['description'].fillna('')
    products_df['category'] = products_df['category'].fillna('')

    products_df['combined_features'] = products_df['description'] + ' ' + products_df['category']
    return products_df['combined_features']

def calculate_content_based_similarity(products_df):
    """
    Calculates content-based similarity between products using TF-IDF and cosine similarity.
    Returns product-product similarity matrix.
    """
    if products_df is None or products_df.empty:
        return np.array([[]]), [] # Return empty similarity matrix and product IDs

    product_features = get_product_features(products_df)
    
    tfidf_vectorizer = TfidfVectorizer(stop_words='english', min_df=2) 

    try:
        tfidf_matrix = tfidf_vectorizer.fit_transform(product_features)
        content_similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
        product_ids_in_matrix = products_df['id'].tolist()
        return content_similarity_matrix, product_ids_in_matrix
    except ValueError as e:
        print(f"Error during TF-IDF vectorization or similarity calculation: {e}")
        return np.array([[]]), []

def get_content_based_recommendations(user_id, products_df, interactions_df, content_similarity_matrix, product_ids_in_matrix, top_n=5):
    """
    Generates content-based recommendations for a user.
    Recommends products similar to those the user has already viewed.
    """
    if products_df.empty or interactions_df.empty or user_id not in interactions_df['user_id'].unique():
        return []

    viewed_product_ids = interactions_df[
        (interactions_df['user_id'] == user_id) & (interactions_df['interaction_type'] == 'view')
    ]['product_id'].tolist()

    if not viewed_product_ids:
        return []

    viewed_product_indices = [product_ids_in_matrix.index(pid) for pid in viewed_product_ids if pid in product_ids_in_matrix]

    if not viewed_product_indices:
        return []

    product_scores = np.zeros(len(product_ids_in_matrix))

    for idx in viewed_product_indices:
        product_scores += content_similarity_matrix[idx]

    if len(viewed_product_indices) > 0:
        product_scores /= len(viewed_product_indices)

    product_scores_series = pd.Series(product_scores, index=product_ids_in_matrix)

    product_scores_series = product_scores_series.drop(index=viewed_product_ids, errors='ignore')

    recommended_product_scores = product_scores_series.sort_values(ascending=False)

    recommended_product_ids = recommended_product_scores.head(top_n).index.tolist()

    return recommended_product_ids

# --- END NEW CONTENT-BASED RECOMMENDATION FUNCTIONS ---

# --- API END POINTS ---

@app.route('/')
def home():
    return "E-commerce Recommender Backend is running!"

# User registration
@app.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        return jsonify({"message": "Missing required fields"}), 400
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    connection = get_pymysql_connection() # Use PyMySQL direct connection
    if connection is None:
        return jsonify({"message": "Database connection error"}), 500
    
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id FROM users WHERE username = %s OR email = %s"
            cursor.execute(sql, (username, email))
            existing_user = cursor.fetchone()
            if existing_user:
                return jsonify({"message": "Username or email already exists"}), 409
            sql = "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)"
            cursor.execute(sql, (username, email, password_hash))
        connection.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        connection.rollback()
        print(f"Error registering user: {e}")
        return jsonify({"message": f"Error registering user: {e}"}), 500
    finally:
        if connection:
            connection.close()

# User login (MODIFIED FOR JWT TOKEN ISSUANCE)
@app.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        return jsonify({"message": "Missing username or password"}), 400
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    connection = get_pymysql_connection()
    if connection is None:
        return jsonify({"message": "Database connection error"}), 500
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, username, is_admin FROM users WHERE username = %s AND password_hash = %s"
            cursor.execute(sql, (username, password_hash))
            user = cursor.fetchone()
            if user:
                # --- JWT TOKEN CREATION ---
                # Define the payload (data to be encoded in the token)
                payload = {
                    'user_id': user['id'],
                    'username': user['username'],
                    'is_admin': bool(user['is_admin']), # Ensure boolean type
                    'exp': datetime.utcnow() + timedelta(days=1), # Token expiration time (e.g., 1 day from now)
                    'iat': datetime.utcnow(), # Issued at (timestamp)
                    'aud': "ecommerce-app" # Audience (who the token is intended for, good practice)
                }
                # Encode the token using your secret key from config.py and HS256 algorithm
                token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
                # --- END JWT TOKEN CREATION ---

                return jsonify({
                    "message": "Login successful",
                    "access_token": token, # Send the JWT to the frontend
                    # For frontend convenience, you can still include these directly in the response
                    # The frontend will store these, but the 'access_token' is the one for API calls
                    "user_id": user['id'],
                    "username": user['username'],
                    "is_admin": bool(user['is_admin'])
                }), 200
            else:
                return jsonify({"message": "Invalid username or password"}), 401
    except Exception as e:
        print(f"Error logging in: {e}")
        return jsonify({"message": f"Error logging in: {e}"}), 500
    finally:
        if connection:
            connection.close()

# Get all products (publicly accessible)
@app.route('/products', methods=['GET'])
def get_products():
    connection = get_pymysql_connection()
    if connection is None:
        return jsonify({"message": "Failed to connect to database"}), 500

    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, name, description, price, category, image_url, stock_quantity FROM products" # Added stock_quantity
            cursor.execute(sql)
            products = cursor.fetchall()

            for product in products:
                if 'price' in product and isinstance(product['price'], (float, int)):
                    pass
                elif 'price' in product:
                    try:
                        product['price'] = float(product['price'])
                    except (ValueError, TypeError):
                        product['price'] = 0.0
                        print(f"Warning: Could not convert price for product {product.get('id', 'unknown')}: {product['price']}")
            return jsonify(products), 200
    except Exception as e:
        print(f"Error fetching products: {e}")
        return jsonify({"message": f"Server error fetching products: {e}"}), 500
    finally:
        if connection:
            connection.close()

# Get a single product by ID and record interaction (NOW PROTECTED BY JWT)
@app.route('/products/<int:product_id>', methods=['GET'])
@jwt_required # <--- UNCOMMENT THIS LINE (REMOVE THE '#')
def get_product_detail(product_id):
    user_id = g.user_id # <--- CORRECTED: Get user ID from g.user_id (from JWT)

    connection = get_pymysql_connection()
    if connection is None:
        return jsonify({"message": "Failed to connect to database"}), 500

    try:
        with connection.cursor() as cursor:
            sql_product = "SELECT id, name, description, price, category, image_url, stock_quantity FROM products WHERE id = %s"
            cursor.execute(sql_product, (product_id,))
            product = cursor.fetchone()

            if not product:
                return jsonify({"message": "Product not found"}), 404

            if 'price' in product and isinstance(product['price'], (float, int)):
                pass
            elif 'price' in product:
                try:
                    product['price'] = float(product['price'])
                except (ValueError, TypeError):
                    product['price'] = 0.0
                    print(f"Warning: Could not convert price for product {product.get('id', 'unknown')}: {product['price']}")

            # Record interaction (user_id is guaranteed by jwt_required)
            # The 'if user_id:' check is no longer needed because g.user_id is always present
            try:
                sql_interaction = "INSERT INTO user_interactions (user_id, product_id, interaction_type, interaction_value, interaction_time) VALUES (%s, %s, %s, %s, NOW())"
                cursor.execute(sql_interaction, (user_id, product_id, 'view', 1)) # Use user_id from g.user_id
                connection.commit()
            except Exception as e:
                connection.rollback()
                print(f"Error recording user interaction: {e}")

            return jsonify(product), 200
    except Exception as e:
        print(f"Error fetching product or recording interaction: {e}")
        return jsonify({"message": f"Server error: {e}"}), 500
    finally:
        if connection:
            connection.close()


# --- NEW API ENDPOINT FOR SEARCH ---

@app.route('/products/search', methods=['GET'])
def search_products():
    # Get the search query from the 'q' URL parameter. Default to empty string if not provided.
    query = request.args.get('q', '').strip() 

    # If the query is empty, return all products (behaves like the /products endpoint)
    # Note: This means /products/search?q= will return all products.
    if not query:
        return get_products() # Re-use the existing get_products function

    connection = get_pymysql_connection()
    if connection is None:
        return jsonify({"message": "Failed to connect to database"}), 500

    try:
        with connection.cursor() as cursor:
            # Use LIKE operator for partial matching across name, description, and category
            # The % acts as a wildcard, matching any sequence of characters.
            search_pattern = f"%{query}%" # Example: if query is "lap", search_pattern becomes "%lap%"
            
            sql = """
            SELECT id, name, description, price, category, image_url, stock_quantity
            FROM products
            WHERE name LIKE %s OR description LIKE %s OR category LIKE %s
            """
            # Execute the query, passing the search pattern for each LIKE clause
            cursor.execute(sql, (search_pattern, search_pattern, search_pattern))
            products = cursor.fetchall()

            # Ensure price is converted to float for frontend compatibility, as in other product fetches
            for product in products:
                if 'price' in product and isinstance(product['price'], (float, int)):
                    pass # Already a float or int
                elif 'price' in product:
                    try:
                        product['price'] = float(product['price'])
                    except (ValueError, TypeError):
                        product['price'] = 0.0 # Default to 0.0 if conversion fails
                        print(f"Warning: Could not convert price for product {product.get('id', 'unknown')}: {product['price']}")
            
            return jsonify(products), 200
    except Exception as e:
        print(f"Error searching products: {e}")
        return jsonify({"message": f"Server error searching products: {e}"}), 500
    finally:
        if connection:
            connection.close()

# --- END NEW API ENDPOINT ---

# Add a new product (ADMIN ONLY)
@app.route('/products/add', methods=['POST'])
@admin_required # Protect this endpoint
def add_product():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    price = data.get('price')
    category = data.get('category')
    image_url = data.get('image_url')
    stock_quantity = data.get('stock_quantity', 0)

    if not all([name, price, category]):
        return jsonify({"message": "Missing required fields (name, price, category)"}), 400

    try:
        price = float(price)
        stock_quantity = int(stock_quantity)
    except (ValueError, TypeError):
        return jsonify({"message": "Price and Stock quantity must be valid numbers"}), 400

    connection = get_pymysql_connection()
    if connection is None:
        return jsonify({"message": "Database connection error"}), 500

    try:
        with connection.cursor() as cursor:
            sql = """
            INSERT INTO products (name, description, price, category, image_url, stock_quantity)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (name, description, price, category, image_url, stock_quantity))
        connection.commit()
        return jsonify({"message": "Product added successfully", "product_id": cursor.lastrowid}), 201
    except Exception as e:
        connection.rollback()
        print(f"Error adding product: {e}")
        return jsonify({"message": f"Server error adding product: {e}"}), 500
    finally:
        if connection:
            connection.close()

# Update an existing product (ADMIN ONLY)
@app.route('/products/update/<int:product_id>', methods=['PUT'])
@admin_required # Protect this endpoint
def update_product(product_id):
    data = request.get_json()
    
    connection = get_pymysql_connection()
    if connection is None:
        return jsonify({"message": "Database connection error"}), 500

    try:
        with connection.cursor() as cursor:
            set_clauses = []
            params = []
            
            if 'name' in data:
                set_clauses.append("name = %s")
                params.append(data['name'])
            if 'description' in data:
                set_clauses.append("description = %s")
                params.append(data['description'])
            if 'price' in data:
                try:
                    price = float(data['price'])
                    set_clauses.append("price = %s")
                    params.append(price)
                except (ValueError, TypeError):
                    return jsonify({"message": "Price must be a valid number"}), 400
            if 'category' in data:
                set_clauses.append("category = %s")
                params.append(data['category'])
            if 'image_url' in data:
                set_clauses.append("image_url = %s")
                params.append(data['image_url'])
            if 'stock_quantity' in data:
                try:
                    stock_quantity = int(data['stock_quantity'])
                    set_clauses.append("stock_quantity = %s")
                    params.append(stock_quantity)
                except (ValueError, TypeError):
                    return jsonify({"message": "Stock quantity must be a valid integer"}), 400

            if not set_clauses:
                return jsonify({"message": "No fields provided for update"}), 400

            sql = f"UPDATE products SET {', '.join(set_clauses)} WHERE id = %s"
            params.append(product_id)

            cursor.execute(sql, tuple(params))
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({"message": "Product not found or no changes made"}), 404
            
            return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        connection.rollback()
        print(f"Error updating product: {e}")
        return jsonify({"message": f"Server error updating product: {e}"}), 500
    finally:
        if connection:
            connection.close()

# Delete a product (ADMIN ONLY)
@app.route('/products/delete/<int:product_id>', methods=['DELETE'])
@admin_required # Protect this endpoint
def delete_product(product_id):
    connection = get_pymysql_connection()
    if connection is None:
        return jsonify({"message": "Database connection error"}), 500

    try:
        with connection.cursor() as cursor:
            sql = "DELETE FROM products WHERE id = %s"
            cursor.execute(sql, (product_id,))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Product not found"}), 404
        
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        connection.rollback()
        print(f"Error deleting product: {e}")
        return jsonify({"message": f"Server error deleting product: {e}"}), 500
    finally:
        if connection:
            connection.close()


# Get recommendations for a user
@app.route('/recommendations/<int:user_id>', methods=['GET'])
@jwt_required # <--- THIS IS CRUCIAL: It ensures a valid JWT and sets g.user_id
def get_recommendations(user_id):
    # Security check: Ensure the user_id in the URL path matches the user_id from the authenticated JWT token (g.user_id).
    # This prevents users from requesting recommendations for other users' profiles.
    if user_id != g.user_id:
        return jsonify({"message": "Unauthorized access to recommendations for another user."}), 403 # Forbidden

    # Load all necessary interaction and product data from the database
    interactions_df, products_df = load_interaction_data()

    # Debugging prints to trace data loading status
    print(f"\n--- Debugging Recommendations for User {g.user_id} (from JWT) ---") # Using g.user_id for clarity
    print(f"Interactions DataFrame loaded (first 5 rows):\n{interactions_df.head() if interactions_df is not None else 'None'}")
    print(f"Products DataFrame loaded (first 5 rows):\n{products_df.head() if products_df is not None else 'None'}")

    # Handle cases where data loading failed or no products exist
    if interactions_df is None or products_df is None:
        print("DEBUG: Data loading failed (interactions_df or products_df is None).")
        return jsonify({"message": "Failed to load data for recommendations."}), 500

    if products_df.empty:
        print("DEBUG: Products DataFrame is empty.")
        return jsonify({"message": "No product data loaded. Check 'products' table."}), 200

    # Initialize variables to store final recommendations and their source
    final_recommendation_ids = []
    recommendation_source = "None"

    # --- Step 1: Try User-Based Collaborative Filtering (UBCF) ---
    # Create the user-item interaction matrix
    user_item_matrix, all_product_ids_ubcf = create_user_item_matrix(interactions_df)

    # Check if the user-item matrix is not empty and the target user (g.user_id) has interactions in it
    if not user_item_matrix.empty and g.user_id in user_item_matrix.index:
        print(f"DEBUG: Attempting UBCF for user {g.user_id}...")
        try:
            # Get the target user's interaction vector from the matrix
            target_user_interactions = user_item_matrix.loc[g.user_id].values.reshape(1, -1)
            
            # Calculate cosine similarity between the target user and all other users in the matrix
            user_similarities = cosine_similarity(target_user_interactions, user_item_matrix.values)
            user_similarities = user_similarities.flatten() # Convert to a 1D array

            # Map similarity scores back to user IDs and remove self-similarity
            user_similarity_series = pd.Series(user_similarities, index=user_item_matrix.index)
            user_similarity_series = user_similarity_series.drop(index=g.user_id, errors='ignore') # Ignore error if user is only one in matrix
            most_similar_users = user_similarity_series.sort_values(ascending=False) # Sort to find most similar users

            top_n_similar_users = 3 # Number of top similar users to consider for recommendations
            similar_users_ids = most_similar_users.head(top_n_similar_users).index.tolist()

            if similar_users_ids:
                recommended_product_ids_ubcf = set()
                # Get products already viewed by the target user to avoid recommending them again
                products_viewed_by_target = user_item_matrix.loc[g.user_id][user_item_matrix.loc[g.user_id] == 1].index.tolist()

                # Collect products viewed by similar users that the target user hasn't seen
                for sim_user_id in similar_users_ids:
                    if sim_user_id in user_item_matrix.index: # Ensure similar user is actually in the matrix
                        products_viewed_by_sim_user = user_item_matrix.loc[sim_user_id][user_item_matrix.loc[sim_user_id] == 1].index.tolist()
                        for prod_id in products_viewed_by_sim_user:
                            if prod_id not in products_viewed_by_target:
                                recommended_product_ids_ubcf.add(prod_id) # Add to set to ensure uniqueness
                
                if recommended_product_ids_ubcf:
                    final_recommendation_ids = list(recommended_product_ids_ubcf)[:5] # Get top 5 recommendations from UBCF
                    recommendation_source = "UBCF"
                    print(f"DEBUG: UBCF generated recommendations: {final_recommendation_ids}")
            else:
                print("DEBUG: No similar users found for UBCF.")
        except Exception as e:
            print(f"DEBUG: Error during UBCF: {e}")

    # --- Step 2: Fallback to Content-Based Filtering if UBCF failed or yielded no new items ---
    # This block runs only if UBCF didn't produce recommendations AND the user has interactions for content-based basis
    if not final_recommendation_ids and not interactions_df.empty and g.user_id in interactions_df['user_id'].unique():
        print(f"DEBUG: UBCF failed or empty. Attempting Content-Based for user {g.user_id}...")
        try:
            # Calculate content-based similarity matrix (product-to-product similarity)
            content_similarity_matrix, product_ids_in_content_matrix = calculate_content_based_similarity(products_df)
            
            if content_similarity_matrix.size > 0: # Check if the content similarity matrix is not empty
                # Get content-based recommendations based on user's viewed products
                content_based_recs = get_content_based_recommendations(
                    g.user_id, products_df, interactions_df, content_similarity_matrix, product_ids_in_content_matrix, top_n=5
                )
                if content_based_recs:
                    final_recommendation_ids = content_based_recs
                    recommendation_source = "Content-Based"
                    print(f"DEBUG: Content-Based generated recommendations: {final_recommendation_ids}")
                else:
                    print("DEBUG: Content-Based generated no recommendations.")
            else:
                print("DEBUG: Content similarity matrix is empty.")
        except Exception as e:
            print(f"DEBUG: Error during Content-Based filtering: {e}")

    # --- Step 3: Ultimate Fallback to Popular Items if both UBCF and Content-Based failed ---
    # This block runs if neither UBCF nor Content-Based produced recommendations
    if not final_recommendation_ids:
        print(f"DEBUG: Both UBCF and Content-Based failed or empty. Falling back to popular items for user {g.user_id}.")
        if not interactions_df.empty:
            # Get the top 5 most frequently viewed products overall
            popular_product_ids = interactions_df['product_id'].value_counts().nlargest(5).index.tolist()
            final_recommendation_ids = popular_product_ids
            recommendation_source = "Popular Items"
            print(f"DEBUG: Falling back to popular items: {final_recommendation_ids}")
        else:
            print("DEBUG: No interactions for popular items fallback.")
            final_recommendation_ids = []
            recommendation_source = "None (No Data)"
    
    # 7. Fetch full Product Details for the recommended IDs (from the final_recommendation_ids list)
    recommended_products_details = []
    if final_recommendation_ids:
        recommended_products_details = products_df[products_df['id'].isin(final_recommendation_ids)].to_dict(orient='records')
        # Ensure price is float before sending (though load_interaction_data should already handle it)
        for p in recommended_products_details:
            if 'price' in p: p['price'] = float(p['price'])

    # 8. Return Recommendations as JSON
    print(f"Final recommended product details ({recommendation_source}): {recommended_products_details}")
    print(f"--- End Debugging ---")
    return jsonify({
        "message": f"Recommendations generated successfully! Source: {recommendation_source}",
        "user_id": g.user_id, # Return user_id from token
        "recommended_products": recommended_products_details
    }), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000) # Run on port 5000