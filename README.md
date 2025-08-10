# 🚀 E-commerce Recommender System

A full-stack e-commerce application with a robust **hybrid recommendation engine**. This project demonstrates a complete development workflow, from database design and a RESTful API to a modern React front-end and sophisticated AI model integration.

***

### ✨ Key Features

* **Hybrid Recommendation Engine:** Provides personalized product recommendations by combining three methods:
    * **User-Based Collaborative Filtering:** Recommends products based on the viewing habits of similar users.
    * **Content-Based Filtering:** Recommends products based on their similarity to items a user has viewed (using product descriptions and categories).
    * **Popularity Fallback:** Recommends the most popular products for new users with no interaction history.
* **Secure Authentication:** Implements a robust and stateless authentication system using **JSON Web Tokens (JWT)**.
* **Admin Panel:** A dedicated dashboard for administrators to securely manage the product catalog (add, update, delete products).
* **Dynamic Front-End:** A responsive and modular Single-Page Application (SPA) built with **React.js**.
* **Product Search:** Allows users to search for products by keyword across names, descriptions, and categories.
* **Database Management:** Uses MySQL with foreign key constraints (`ON DELETE CASCADE`) for data integrity.

***

### 🛠️ Technologies Used

* **Backend:** Python, Flask, Gunicorn
* **Frontend:** React.js, `react-router-dom`, HTML, CSS, JavaScript
* **Database:** MySQL
* **AI/ML:** `scikit-learn`, `pandas`, `numpy`, `TfidfVectorizer`
* **Authentication:** JWT, `PyJWT`

***

### ⚙️ Setup and Installation

Follow these steps to get the project running on your local machine.

#### 1. Backend Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Tvamsiprakash/recommendation_system]
    cd ecommerce_recommendation_system
    ```

2.  **Create and Activate a Python Virtual Environment:**
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```

3.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Database Configuration:**
    * Set up a MySQL database named `ecommerce_recommender`.
    * Run the SQL commands from your `CREATE.sql` file (which includes table creation, sample data, and `ON DELETE CASCADE`).
    * Update the `config.py` file with your local MySQL credentials.

5.  **Run the Flask Backend:**
    ```bash
    python app.py
    ```
    The backend API will start at `http://localhost:5000`.

#### 2. Frontend Setup

1.  **Navigate to the Frontend Directory:**
    ```bash
    cd frontend
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

3.  **Run the React Development Server:**
    ```bash
    npm start
    ```
    The React application will launch at `http://localhost:3000`.

***

### 🚀 Usage

1.  **Register & Log In:** Create a new user account. Log in with your credentials to access the main shop.
2.  **Browse & Interact:** Click on products to view their details. Your viewing history is used to build your personalized recommendations.
3.  **Search:** Use the search bar in the header to find products by keywords.
4.  **Admin Panel:** Log in with an admin user to access the admin dashboard (`http://localhost:3000/admin`) and manage the product catalog.

***

<img width="1919" height="913" alt="image" src="https://github.com/user-attachments/assets/e99da970-d680-4b11-8f31-52f45f76a3b6" />

<img width="1891" height="444" alt="image" src="https://github.com/user-attachments/assets/8f8f8191-637a-4f28-a2d5-38c217f1025a" />



### ✍️ Author

* -Vamsi Prakash


***

_This README.md provides a comprehensive overview of the project, its features, and instructions for running it. It can be easily added to your GitHub repository to showcase your work._
