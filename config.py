# config.py
import os # Import the os module to access environment variables

class config:
    # Database Configuration:
    # In production, Render will provide these as environment variables (e.g., DATABASE_URL, or separate ones).
    # Locally, these will fall back to your hardcoded local MySQL credentials.
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    # IMPORTANT: Keep your actual local password as the default for local testing.
    # In Render, you MUST set a secure environment variable for MYSQL_PASSWORD.
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '7ekj@234') 
    MYSQL_DB = os.getenv('MYSQL_DB', 'ecommerce_recommender')
    
    # Flask Secret Key:
    # This key is CRITICAL for JWT security (signing/verifying tokens) and Flask's session management.
    # Locally, use a strong default. In production, it MUST be set as a secure environment variable on Render.
    SECRET_KEY = os.getenv('SECRET_KEY', 'mySecretkey') # <<< REPLACE WITH A LONG RANDOM STRING FOR DEV DEFAULT

    # A flag to distinguish between development and production environments (useful for debugging/logging)
    # Render often sets FLASK_ENV to 'production' automatically.
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development' # Debug mode should only be on in development
    TESTING = False