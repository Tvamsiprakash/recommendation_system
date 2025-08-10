// src/components/ProductCardAdmin.js
import React from 'react';

const ProductCardAdmin = ({ product, onDelete, onEdit }) => {
    return (
        <li className="product-admin-item">
            <div className="product-admin-details">
                <h4>{product.name} (ID: {product.id})</h4>
                <p>Price: ${product.price.toFixed(2)} | Category: {product.category} | Stock: {product.stock_quantity}</p>
                <p>{product.description.substring(0, 70)}{product.description.length > 70 ? '...' : ''}</p>
            </div>
            <div className="product-admin-actions">
                <button className="admin-action-btn edit-btn" onClick={() => onEdit(product)}>Edit</button>
                <button className="admin-action-btn delete-btn" onClick={() => onDelete(product.id)}>Delete</button>
            </div>
        </li>
    );
};

export default ProductCardAdmin;