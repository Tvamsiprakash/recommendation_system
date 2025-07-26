// frontend/script.js

const API_BASE_URL = 'http://127.0.0.1:5000'; // Our Flask backend URL

// Global state for user ID and JWT token
let currentUserId = localStorage.getItem('user_id') ? parseInt(localStorage.getItem('user_id'), 10) : null;
let currentUsername = localStorage.getItem('username');
let isAdmin = localStorage.getItem('is_admin') === 'true'; // Get admin status from localStorage
let accessToken = localStorage.getItem('access_token'); // Store the JWT token

// Function to display messages (reusable across pages)
function displayMessage(element, message, type) {
    if (element) { // Check if element exists on the current page
        element.textContent = message;
        element.className = `message ${type}`; // Add 'success' or 'error' class
        setTimeout(() => {
            if (element) { // Check again before clearing
                element.textContent = '';
                element.className = 'message';
            }
        }, 3000); // Clear message after 3 seconds
    }
}

// --- Helper to get headers with JWT ---
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (accessToken) { // Only add Authorization header if token exists
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
}

// --- Common Logic for all pages ---
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const welcomeMessage = document.getElementById('welcomeMessage');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            currentUserId = null;
            currentUsername = null;
            isAdmin = false;
            accessToken = null;
            window.location.href = 'login.html';
        });
    }

    if (welcomeMessage && currentUsername) {
        welcomeMessage.textContent = `Welcome, ${currentUsername}!`;
    }

    // Routing logic based on current HTML file
    if (window.location.pathname.endsWith('index.html')) {
        if (!currentUserId || !accessToken) {
            window.location.href = 'login.html';
            return;
        }
        setupIndexPage();
    } else if (window.location.pathname.endsWith('admin.html')) {
        if (!currentUserId || !isAdmin || !accessToken) {
            alert('Access Denied: You must be logged in as an administrator to view this page.');
            window.location.href = 'login.html';
            return;
        }
        setupAdminPage();
    } else if (window.location.pathname.endsWith('login.html')) {
        setupLoginPage();
    } else if (window.location.pathname.endsWith('register.html')) {
        setupRegisterPage();
    }
});


// --- Specific Logic for index.html (Product Listing, Detail, and SEARCH) ---
function setupIndexPage() {
    const productsContainer = document.getElementById('productsContainer');
    const productListingMessage = document.getElementById('productListingMessage'); // New for search messages
    const productDetailSection = document.getElementById('productDetail');
    const backToProductsBtn = document.getElementById('backToProductsBtn');
    const detailProductName = document.getElementById('detailProductName');
    const detailProductImage = document.getElementById('detailProductImage');
    const detailProductPrice = document.getElementById('detailProductPrice');
    const detailProductDescription = document.getElementById('detailProductDescription');
    const detailProductCategory = document.getElementById('detailProductCategory');
    const detailProductStock = document.getElementById('detailProductStock');

    const recommendationsSection = document.getElementById('recommendations');
    const recommendationsContainer = document.getElementById('recommendationsContainer');

    // --- NEW SEARCH ELEMENTS ---
    const searchBar = document.getElementById('searchBar');
    const searchButton = document.getElementById('searchButton');
    const clearSearchButton = document.getElementById('clearSearchButton');
    // --- END NEW SEARCH ELEMENTS ---


    function showSection(sectionId) {
        document.querySelectorAll('main section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(sectionId).classList.remove('hidden');
    }

    backToProductsBtn.addEventListener('click', () => {
        showSection('productListing');
        if (currentUserId) { 
            recommendationsSection.classList.remove('hidden');
        }
        // When going back to product listing, clear search bar and show all products
        searchBar.value = '';
        clearSearchButton.style.display = 'none';
        fetchProducts(); // Re-fetch all products
    });

    // Helper function to render products into a container (used by fetchProducts and performSearch)
    function renderProducts(products, containerElement, messageElement) {
        containerElement.innerHTML = ''; // Clear container
        messageElement.textContent = ''; // Clear any previous messages

        if (products.length === 0) {
            messageElement.textContent = 'No products found matching your criteria.';
            messageElement.className = 'message'; // Default message style
            return;
        }

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.innerHTML = `
                <img src="${product.image_url || 'https://via.placeholder.com/150'}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>$${product.price.toFixed(2)}</p>
            `;
            productCard.addEventListener('click', () => showProductDetail(product.id));
            containerElement.appendChild(productCard);
        });
    }

    // Fetch and display all products (public endpoint, no JWT needed here)
    async function fetchProducts() {
        try {
            const response = await fetch(`${API_BASE_URL}/products`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            const products = await response.json();
            renderProducts(products, productsContainer, productListingMessage); // Use helper

        } catch (error) {
            productListingMessage.innerHTML = `<p class="message error">Failed to load products: ${error.message}. Please check backend console for details.</p>`;
            console.error('Error fetching products:', error);
        } finally {
            clearSearchButton.style.display = 'none'; // Hide clear button when showing all
            searchBar.value = ''; // Clear search bar
        }
    }

    // Add a global flag to prevent multiple rapid clicks on product cards
    let isFetchingProductDetail = false;

    // Show product detail and record user interaction (Protected by JWT)
    async function showProductDetail(productId) {
        if (isFetchingProductDetail) {
            console.warn("Already fetching product detail. Ignoring rapid click.");
            return;
        }
        isFetchingProductDetail = true;

        try {
            const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401 || response.status === 403) {
                    alert('Session expired or unauthorized. Please log in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            const product = await response.json();

            detailProductName.textContent = product.name;
            detailProductImage.src = product.image_url || 'https://via.placeholder.com/300';
            detailProductPrice.textContent = `Price: $${product.price.toFixed(2)}`;
            detailProductDescription.textContent = product.description;
            detailProductCategory.textContent = `Category: ${product.category}`;
            detailProductStock.textContent = product.stock_quantity;
            showSection('productDetail');

        } catch (error) {
            alert(`Network error or ${error.message || 'product details could not be loaded.'}`);
            console.error('Error fetching product detail:', error);
            showSection('productListing');
        } finally {
            isFetchingProductDetail = false;
        }
    }

    // Fetch and display recommendations (Protected by JWT)
    async function fetchRecommendations() {
        if (!currentUserId) { 
            recommendationsSection.classList.add('hidden');
            return;
        }
        recommendationsSection.classList.remove('hidden');
        recommendationsContainer.innerHTML = '<p>Loading recommendations...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}/recommendations/${currentUserId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401 || response.status === 403) {
                    alert('Session expired or unauthorized. Please log in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();

            if (data.recommended_products && data.recommended_products.length > 0) {
                recommendationsContainer.innerHTML = '';
                data.recommended_products.forEach(product => {
                    const productCard = document.createElement('div');
                    productCard.classList.add('product-card');
                    productCard.innerHTML = `
                        <img src="${product.image_url || 'https://via.placeholder.com/150'}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <p>$${product.price.toFixed(2)}</p>
                    `;
                    productCard.addEventListener('click', () => showProductDetail(product.id));
                    recommendationsContainer.appendChild(productCard);
                });
            } else {
                recommendationsContainer.innerHTML = '<p>No recommendations available yet. Browse some products!</p>';
            }
        } catch (error) {
            recommendationsContainer.innerHTML = `<p class="message error">Failed to load recommendations: ${error.message}.</p>`;
            console.error('Error fetching recommendations:', error);
        }
    }

    // --- NEW SEARCH FUNCTIONALITY ---

    async function performSearch() {
        const query = searchBar.value.trim();
        if (!query) {
            fetchProducts(); // Show all products if search bar is empty
            return;
        }

        // Hide recommendations section during search results display
        recommendationsSection.classList.add('hidden');
        productListingMessage.textContent = 'Searching...';
        productListingMessage.className = 'message';

        try {
            const response = await fetch(`${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            const products = await response.json();
            renderProducts(products, productsContainer, productListingMessage); // Use helper

            if (products.length > 0) {
                clearSearchButton.style.display = 'inline-block'; // Show clear button if results found
            } else {
                clearSearchButton.style.display = 'none';
            }

        } catch (error) {
            productListingMessage.innerHTML = `<p class="message error">Error during search: ${error.message}.</p>`;
            console.error('Error searching products:', error);
            clearSearchButton.style.display = 'none';
        }
    }

    // Event Listeners for Search Bar
    searchButton.addEventListener('click', performSearch);
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    clearSearchButton.addEventListener('click', () => {
        searchBar.value = '';
        clearSearchButton.style.display = 'none';
        fetchProducts(); // Show all products again
        recommendationsSection.classList.remove('hidden'); // Show recommendations again
    });

    // --- END NEW SEARCH FUNCTIONALITY ---


    fetchProducts(); // Initial load of all products
    fetchRecommendations(); // Initial load of recommendations
}

// ... (setupLoginPage, setupRegisterPage, setupAdminPage functions remain unchanged)

// --- Specific Logic for login.html ---
function setupLoginPage() {
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');

    loginBtn.addEventListener('click', async () => {
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok) {
                displayMessage(loginMessage, data.message, 'success');
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_id', data.user_id);
                localStorage.setItem('username', data.username);
                localStorage.setItem('is_admin', data.is_admin ? 'true' : 'false');

                accessToken = data.access_token;
                currentUserId = data.user_id;
                currentUsername = data.username;
                isAdmin = data.is_admin;

                if (isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                displayMessage(loginMessage, data.message, 'error');
            }
        } catch (error) {
            displayMessage(loginMessage, 'Network error. Could not login.', 'error');
            console.error('Error:', error);
        }
    });
}

// --- Specific Logic for register.html ---
function setupRegisterPage() {
    const regUsernameInput = document.getElementById('regUsername');
    const regEmailInput = document.getElementById('regEmail');
    const regPasswordInput = document.getElementById('regPassword');
    const registerBtn = document.getElementById('registerBtn');
    const regMessage = document.getElementById('regMessage');

    registerBtn.addEventListener('click', async () => {
        const username = regUsernameInput.value;
        const email = regEmailInput.value;
        const password = regPasswordInput.value;

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();

            if (response.ok) {
                displayMessage(regMessage, data.message, 'success');
                regUsernameInput.value = '';
                regEmailInput.value = '';
                regPasswordInput.value = '';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                displayMessage(regMessage, data.message, 'error');
            }
        } catch (error) {
            displayMessage(regMessage, 'Network error. Could not register.', 'error');
            console.error('Error:', error);
        }
    });
}


// --- Logic for admin.html (Product Management) ---
function setupAdminPage() {
    const adminUsernameSpan = document.getElementById('adminUsername');
    if (adminUsernameSpan) {
        adminUsernameSpan.textContent = currentUsername || 'Admin';
    }

    const addProductForm = document.getElementById('addProductForm');
    const addProductMessage = document.getElementById('addProductMessage');
    const adminProductList = document.getElementById('adminProductList');
    const manageProductsMessage = document.getElementById('manageProductsMessage');

    const editProductModal = document.getElementById('editProductModal');
    const closeModalButton = editProductModal.querySelector('.close-button');
    const editProductForm = document.getElementById('editProductForm');
    const editProductMessage = document.getElementById('editProductMessage');

    let currentEditingProductId = null;

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productData = {
            name: document.getElementById('addProductName').value,
            description: document.getElementById('addProductDescription').value,
            price: parseFloat(document.getElementById('addProductPrice').value),
            category: document.getElementById('addProductCategory').value,
            image_url: document.getElementById('addProductImageUrl').value,
            stock_quantity: parseInt(document.getElementById('addProductStock').value, 10)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/products/add`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(productData)
            });

            const data = await response.json();
            if (response.ok) {
                displayMessage(addProductMessage, data.message, 'success');
                addProductForm.reset();
                fetchAdminProducts();
            } else {
                if (response.status === 401 || response.status === 403) {
                    alert('Session expired or unauthorized. Please log in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                displayMessage(addProductMessage, data.message || 'Failed to add product', 'error');
            }
        } catch (error) {
            displayMessage(addProductMessage, 'Network error: Could not add product.', 'error');
            console.error('Error adding product:', error);
        }
    });

    async function fetchAdminProducts() {
        adminProductList.innerHTML = '';
        manageProductsMessage.textContent = 'Loading products...';
        manageProductsMessage.className = 'message';

        try {
            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'GET',
            });
            const products = await response.json();

            if (response.ok) {
                if (products.length === 0) {
                    manageProductsMessage.textContent = 'No products found. Add some above!';
                    manageProductsMessage.className = 'message';
                    return;
                }
                manageProductsMessage.textContent = '';

                products.forEach(product => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('product-admin-item');
                    listItem.innerHTML = `
                        <div class="product-admin-details">
                            <h4>${product.name} (ID: ${product.id})</h4>
                            <p>Price: $${product.price.toFixed(2)} | Category: ${product.category} | Stock: ${product.stock_quantity}</p>
                            <p>${product.description.substring(0, 70)}${product.description.length > 70 ? '...' : ''}</p>
                        </div>
                        <div class="product-admin-actions">
                            <button class="admin-action-btn edit-btn" data-product-id="${product.id}">Edit</button>
                            <button class="admin-action-btn delete-btn" data-product-id="${product.id}">Delete</button>
                        </div>
                    `;
                    adminProductList.appendChild(listItem);
                });

                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', (e) => openEditModal(e.target.dataset.productId));
                });
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', (e) => deleteProduct(e.target.dataset.productId));
                });

            } else {
                displayMessage(manageProductsMessage, data.message || 'Failed to load products for management.', 'error');
            }
        } catch (error) {
            displayMessage(manageProductsMessage, 'Network error: Could not load products for management.', 'error');
            console.error('Error fetching admin products:', error);
        }
    }

    async function openEditModal(productId) {
        currentEditingProductId = productId;
        editProductMessage.textContent = '';

        try {
            const response = await fetch(`${API_BASE_URL}/products/${productId}`);
            const product = await response.json();

            if (response.ok) {
                document.getElementById('editProductId').value = product.id;
                document.getElementById('editProductName').value = product.name;
                document.getElementById('editProductDescription').value = product.description;
                document.getElementById('editProductPrice').value = product.price;
                document.getElementById('editProductCategory').value = product.category;
                document.getElementById('editProductImageUrl').value = product.image_url;
                document.getElementById('editProductStock').value = product.stock_quantity;
                
                editProductModal.style.display = 'flex';
            } else {
                displayMessage(manageProductsMessage, product.message || 'Product not found for editing.', 'error');
            }
        } catch (error) {
            displayMessage(manageProductsMessage, 'Network error: Could not fetch product for editing.', 'error');
            console.error('Error opening edit modal:', error);
        }
    }

    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('editProductId').value;
        const productData = {
            name: document.getElementById('editProductName').value,
            description: document.getElementById('editProductDescription').value,
            price: parseFloat(document.getElementById('editProductPrice').value),
            category: document.getElementById('editProductCategory').value,
            image_url: document.getElementById('editProductImageUrl').value,
            stock_quantity: parseInt(document.getElementById('editProductStock').value, 10)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/products/update/${productId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(productData)
            });

            const data = await response.json();
            if (response.ok) {
                displayMessage(editProductMessage, data.message, 'success');
                editProductModal.style.display = 'none';
                fetchAdminProducts();
            } else {
                 if (response.status === 401 || response.status === 403) {
                    alert('Session expired or unauthorized. Please log in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                displayMessage(editProductMessage, data.message || 'Failed to update product', 'error');
            }
        } catch (error) {
            displayMessage(editProductMessage, 'Network error: Could not update product.', 'error');
            console.error('Error updating product:', error);
        }
    });

    async function deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/products/delete/${productId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            if (response.ok) {
                displayMessage(manageProductsMessage, data.message, 'success');
                fetchAdminProducts();
            } else {
                 if (response.status === 401 || response.status === 403) {
                    alert('Session expired or unauthorized. Please log in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                displayMessage(manageProductsMessage, data.message || 'Failed to delete product', 'error');
            }
        } catch (error) {
            displayMessage(manageProductsMessage, 'Network error: Could not delete product.', 'error');
            console.error('Error deleting product:', error);
        }
    }

    closeModalButton.addEventListener('click', () => {
        editProductModal.style.display = 'none';
        editProductMessage.textContent = '';
    });

    window.addEventListener('click', (event) => {
        if (event.target == editProductModal) {
            editProductModal.style.display = 'none';
            editProductMessage.textContent = '';
        }
    });

    fetchAdminProducts();
}