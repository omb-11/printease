from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import sqlite3
import json
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename
import io

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = '/tmp/printease_uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'ppt', 'png', 'jpg', 'jpeg', 'zip'}
DB_NAME = '/tmp/printease.db'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Pricing configuration
PRICING = {
    'same-day': 2.0,  # ₹ per page
    'next-day': 3.0,   # ₹ per page
}

# Initialize database
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tracking_code TEXT UNIQUE,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        files TEXT NOT NULL,
        total_pages INTEGER NOT NULL,
        total_price REAL NOT NULL,
        delivery_type TEXT NOT NULL,
        paper_type TEXT NOT NULL,
        finish_type TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL
    )''')
    
    conn.commit()
    conn.close()

init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/', methods=['GET'])
def home():
    return jsonify({'status': 'PrintEase Backend Active', 'version': '1.0'}), 200

@app.route('/api/calculate-price', methods=['POST'])
def calculate_price():
    """Calculate total price based on pages and delivery type"""
    try:
        data = request.json
        total_pages = int(data.get('total_pages', 0))
        delivery_type = data.get('delivery_type', 'next-day')
        
        if total_pages <= 0:
            return jsonify({'error': 'Invalid page count'}), 400
        
        price_per_page = PRICING.get(delivery_type, PRICING['next-day'])
        total_price = total_pages * price_per_page
        
        return jsonify({
            'total_pages': total_pages,
            'price_per_page': price_per_page,
            'total_price': round(total_price, 2),
            'delivery_type': delivery_type
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Create a new order with file uploads"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get form data
        customer_name = request.form.get('customer_name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        total_pages = int(request.form.get('total_pages', 0))
        delivery_type = request.form.get('delivery_type', 'next-day')
        paper_type = request.form.get('paper_type', 'standard')
        finish_type = request.form.get('finish_type', 'black-white')
        
        if not all([customer_name, email, phone, total_pages]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Handle file uploads
        uploaded_files = []
        if 'files' in request.files:
            files = request.files.getlist('files')
            for file in files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
                    unique_filename = timestamp + filename
                    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                    file.save(file_path)
                    uploaded_files.append(unique_filename)
        
        # Generate order ID and tracking code
        order_id = str(uuid.uuid4())
        tracking_code = 'PRINT' + ''.join([str(uuid.uuid4().int)[:8]])
        
        # Calculate price
        price_per_page = PRICING.get(delivery_type, PRICING['next-day'])
        total_price = total_pages * price_per_page
        
        # Save to database
        now = datetime.now().isoformat()
        c.execute('''INSERT INTO orders 
                     (id, tracking_code, customer_name, email, phone, files, 
                      total_pages, total_price, delivery_type, paper_type, finish_type, 
                      status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (order_id, tracking_code, customer_name, email, phone, 
                   json.dumps(uploaded_files), total_pages, total_price, 
                   delivery_type, paper_type, finish_type, 'Pending', now, now))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'order_id': order_id,
            'tracking_code': tracking_code,
            'total_price': round(total_price, 2),
            'message': f'Order created! Track it with code: {tracking_code}'
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/track/<tracking_code>', methods=['GET'])
def track_order(tracking_code):
    """Track order by tracking code"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('SELECT * FROM orders WHERE tracking_code = ?', (tracking_code,))
        order = c.fetchone()
        conn.close()
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        return jsonify({
            'order_id': order['id'],
            'tracking_code': order['tracking_code'],
            'customer_name': order['customer_name'],
            'email': order['email'],
            'phone': order['phone'],
            'total_pages': order['total_pages'],
            'total_price': order['total_price'],
            'delivery_type': order['delivery_type'],
            'status': order['status'],
            'created_at': order['created_at'],
            'updated_at': order['updated_at']
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Admin login (basic authentication)"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        # Default credentials (change in production!)
        if username == 'admin' and password == 'printease123':
            return jsonify({
                'success': True,
                'token': 'admin_token_' + str(uuid.uuid4()),
                'message': 'Login successful'
            }), 200
        
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/admin/orders', methods=['GET'])
def get_all_orders():
    """Get all orders (admin view)"""
    try:
        # Check authorization token
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer admin_token_'):
            return jsonify({'error': 'Unauthorized'}), 401
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get filter parameters
        status = request.args.get('status', None)
        search = request.args.get('search', None)
        
        query = 'SELECT * FROM orders WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        if search:
            query += ' AND (tracking_code LIKE ? OR customer_name LIKE ? OR email LIKE ?)'
            search_term = f'%{search}%'
            params.extend([search_term, search_term, search_term])
        
        query += ' ORDER BY created_at DESC'
        
        c.execute(query, params)
        orders = c.fetchall()
        conn.close()
        
        orders_list = [{
            'id': order['id'],
            'tracking_code': order['tracking_code'],
            'customer_name': order['customer_name'],
            'email': order['email'],
            'phone': order['phone'],
            'total_pages': order['total_pages'],
            'total_price': order['total_price'],
            'delivery_type': order['delivery_type'],
            'status': order['status'],
            'created_at': order['created_at'],
            'updated_at': order['updated_at']
        } for order in orders]
        
        return jsonify({'orders': orders_list, 'total': len(orders_list)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/orders/<order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update order status (admin only)"""
    try:
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer admin_token_'):
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.json
        new_status = data.get('status')
        
        valid_statuses = ['Pending', 'Processing', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled']
        if new_status not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        now = datetime.now().isoformat()
        c.execute('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
                  (new_status, now, order_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': f'Order status updated to {new_status}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/orders/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    """Delete an order (admin only)"""
    try:
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer admin_token_'):
            return jsonify({'error': 'Unauthorized'}), 401
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('DELETE FROM orders WHERE id = ?', (order_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Order deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics (admin only)"""
    try:
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer admin_token_'):
            return jsonify({'error': 'Unauthorized'}), 401
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('SELECT COUNT(*) as total_orders FROM orders')
        total_orders = c.fetchone()['total_orders']
        
        c.execute('SELECT SUM(total_price) as total_revenue FROM orders')
        total_revenue = c.fetchone()['total_revenue'] or 0
        
        c.execute('SELECT COUNT(*) as pending FROM orders WHERE status = "Pending"')
        pending = c.fetchone()['pending']
        
        c.execute('SELECT COUNT(*) as delivered FROM orders WHERE status = "Delivered"')
        delivered = c.fetchone()['delivered']
        
        conn.close()
        
        return jsonify({
            'total_orders': total_orders,
            'total_revenue': round(total_revenue, 2),
            'pending_orders': pending,
            'delivered_orders': delivered
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
