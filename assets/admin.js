// Admin Dashboard JavaScript
const API_BASE = window.location.origin === 'http://localhost:5000' 
    ? 'http://localhost:5000/api' 
    : 'https://printease-mu.vercel.app/api';

let authToken = null;
let currentOrders = [];
let selectedOrderId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('printease_admin_token');
    if (savedToken) {
        authToken = savedToken;
        showDashboard();
        fetchStats();
        fetchOrders();
    } else {
        showLogin();
    }
});

// Show/hide sections
function showLogin() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = `Bearer ${data.token}`;
            localStorage.setItem('printease_admin_token', authToken);
            showNotification('Login successful', 'success');
            showDashboard();
            fetchStats();
            fetchOrders();
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

// Handle logout
function handleLogout() {
    authToken = null;
    localStorage.removeItem('printease_admin_token');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showLogin();
    showNotification('Logged out', 'info');
}

// Fetch statistics
async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'Authorization': authToken }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('totalOrders').textContent = data.total_orders;
            document.getElementById('totalRevenue').textContent = '₹' + data.total_revenue.toLocaleString();
            document.getElementById('pendingOrders').textContent = data.pending_orders;
            document.getElementById('deliveredOrders').textContent = data.delivered_orders;
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Fetch orders
async function fetchOrders() {
    try {
        const status = document.getElementById('statusFilter').value;
        const search = document.getElementById('searchInput').value;
        
        let url = `${API_BASE}/admin/orders?`;
        if (status) url += `status=${status}&`;
        if (search) url += `search=${search}&`;
        
        const response = await fetch(url.replace(/&$/, ''), {
            headers: { 'Authorization': authToken }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentOrders = data.orders;
            renderOrders(data.orders);
        }
    } catch (error) {
        showNotification('Error fetching orders: ' + error.message, 'error');
    }
}

// Render orders table
function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (orders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order.tracking_code}</strong></td>
            <td>${order.customer_name}</td>
            <td>${order.email}</td>
            <td>${order.total_pages}</td>
            <td>₹${order.total_price.toLocaleString()}</td>
            <td>
                <span class="status-badge status-${order.status.toLowerCase().replace(/ /g, '-')}">
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" onclick="openStatusModal('${order.id}')">Update</button>
                    <button class="action-btn danger" onclick="deleteOrder('${order.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Open status update modal
function openStatusModal(orderId) {
    selectedOrderId = orderId;
    const order = currentOrders.find(o => o.id === orderId);
    if (order) {
        document.getElementById('newStatus').value = order.status;
    }
    document.getElementById('statusModal').classList.add('active');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    selectedOrderId = null;
}

// Confirm status update
async function confirmStatusUpdate() {
    if (!selectedOrderId) return;
    
    const newStatus = document.getElementById('newStatus').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${selectedOrderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Order status updated', 'success');
            closeModal('statusModal');
            fetchStats();
            fetchOrders();
        } else {
            showNotification(data.error || 'Error updating status', 'error');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

// Delete order
async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': authToken }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Order deleted', 'success');
            fetchStats();
            fetchOrders();
        } else {
            showNotification(data.error || 'Error deleting order', 'error');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#ff6b6b' : '#2196f3'};
        color: #fff;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Event listeners
document.getElementById('searchInput')?.addEventListener('keyup', fetchOrders);
document.getElementById('statusFilter')?.addEventListener('change', fetchOrders);
