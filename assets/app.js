// Configuration
const API_BASE = window.location.origin === 'http://localhost:5000' 
    ? 'http://localhost:5000/api' 
    : 'https://printease-mu.vercel.app/api';

let selectedFiles = [];
let totalPages = 0;
let totalPrice = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupNavigation();
});

// Setup navigation
function setupNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.querySelector('.upload-zone');
    
    if (uploadZone) {
        uploadZone.addEventListener('click', () => fileInput?.click());
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--accent)';
            uploadZone.style.backgroundColor = 'rgba(49, 227, 255, 0.2)';
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.borderColor = 'rgba(124, 92, 255, 0.5)';
            uploadZone.style.backgroundColor = 'rgba(124, 92, 255, 0.12)';
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'rgba(124, 92, 255, 0.5)';
            uploadZone.style.backgroundColor = 'rgba(124, 92, 255, 0.12)';
            handleFiles(e.dataTransfer.files);
        });
    }
    
    fileInput?.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    // Form submission
    const uploadCard = document.querySelector('.upload-card');
    if (uploadCard) {
        const submitBtn = uploadCard.querySelector('.primary-btn.full');
        submitBtn?.addEventListener('click', handleFormSubmit);
    }
    
    // Primary buttons
    document.querySelectorAll('.primary-btn:not(.full)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.textContent.includes('Upload') || btn.textContent.includes('Launch') || btn.textContent.includes('Print')) {
                scrollToUpload();
            }
        });
    });
    
    // Track order button
    setupTrackingModal();
}

// Handle file selection
function handleFiles(files) {
    selectedFiles = [];
    totalPages = 0;
    
    const fileArray = Array.from(files);
    fileArray.forEach((file, index) => {
        if (isValidFile(file)) {
            selectedFiles.push({
                file: file,
                name: file.name,
                size: file.size,
                pages: Math.ceil(file.size / 50000) // Rough estimate
            });
            totalPages += selectedFiles[selectedFiles.length - 1].pages;
        }
    });
    
    updateFileDisplay();
    calculatePrice();
}

// Validate file type and size
function isValidFile(file) {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint', 'image/png', 'image/jpeg', 'application/zip'];
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    if (!validTypes.includes(file.type)) {
        showNotification(`Invalid file type: ${file.name}`, 'error');
        return false;
    }
    if (file.size > maxSize) {
        showNotification(`File too large: ${file.name}`, 'error');
        return false;
    }
    return true;
}

// Update file display
function updateFileDisplay() {
    const uploadZone = document.querySelector('.upload-zone');
    if (uploadZone && selectedFiles.length > 0) {
        uploadZone.innerHTML = `
            <span>✓ ${selectedFiles.length} file(s) selected</span>
            <small>${(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB</small>
            <small style="margin-top: 8px; font-size: 0.8rem;">Estimated ${totalPages} pages</small>
        `;
    }
}

// Calculate price
async function calculatePrice() {
    try {
        const deliveryType = document.querySelector('select:nth-of-type(1)')?.value || 'next-day';
        
        const response = await fetch(`${API_BASE}/calculate-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                total_pages: totalPages || 1,
                delivery_type: deliveryType
            })
        });
        
        const data = await response.json();
        totalPrice = data.total_price;
        
        // Update display
        const priceDisplay = document.querySelector('.upload-card');
        if (priceDisplay) {
            let priceElement = priceDisplay.querySelector('.price-estimate');
            if (!priceElement) {
                priceElement = document.createElement('div');
                priceElement.className = 'price-estimate';
                priceElement.style.cssText = 'margin: 16px 0; padding: 12px; background: rgba(124, 92, 255, 0.2); border-radius: 12px; text-align: center;';
                priceDisplay.insertBefore(priceElement, priceDisplay.querySelector('.primary-btn.full'));
            }
            priceElement.innerHTML = `<strong>Estimated Price: ₹${data.total_price}</strong>`;
        }
    } catch (error) {
        console.error('Price calculation error:', error);
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    if (selectedFiles.length === 0) {
        showNotification('Please select files first', 'error');
        return;
    }
    
    const uploadCard = document.querySelector('.upload-card');
    const customerName = prompt('Enter your name:');
    if (!customerName) return;
    
    const email = prompt('Enter your email:');
    if (!email) return;
    
    const phone = prompt('Enter your phone number:');
    if (!phone) return;
    
    const deliveryType = document.querySelector('select:nth-of-type(1)')?.value || 'next-day';
    const paperType = document.querySelector('select:nth-of-type(2)')?.value || 'standard';
    const finishType = document.querySelector('select:nth-of-type(3)')?.value || 'black-white';
    
    const formData = new FormData();
    formData.append('customer_name', customerName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('total_pages', totalPages);
    formData.append('delivery_type', deliveryType);
    formData.append('paper_type', paperType);
    formData.append('finish_type', finishType);
    
    selectedFiles.forEach(f => {
        formData.append('files', f.file);
    });
    
    try {
        const submitBtn = uploadCard.querySelector('.primary-btn.full');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
        
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`Order created! Tracking code: ${data.tracking_code}`, 'success');
            alert(`Your order has been created!\n\nTracking Code: ${data.tracking_code}\nTotal Price: ₹${data.total_price}\n\nSave this code to track your order.`);
            selectedFiles = [];
            totalPages = 0;
            updateFileDisplay();
            document.getElementById('fileInput').value = '';
        } else {
            showNotification(data.error || 'Error creating order', 'error');
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    } finally {
        const submitBtn = uploadCard.querySelector('.primary-btn.full');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Schedule Next-Day Delivery';
    }
}

// Setup tracking modal
function setupTrackingModal() {
    // Add tracking modal to page
    const trackingHTML = `
        <div id="trackingModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center;">
            <div style="background: var(--surface); padding: 32px; border-radius: 20px; max-width: 400px; border: 1px solid var(--border);">
                <h3>Track Your Order</h3>
                <input id="trackingCode" type="text" placeholder="Enter tracking code" style="width:100%; padding:10px; margin:16px 0; border-radius:8px; border:1px solid var(--border); background: var(--card); color: var(--text);">
                <div id="trackingResult" style="margin:16px 0;"></div>
                <button onclick="trackOrder()" class="primary-btn" style="width:100%; margin-bottom:8px;">Track</button>
                <button onclick="document.getElementById('trackingModal').style.display='none'" class="ghost-btn" style="width:100%;">Close</button>
            </div>
        </div>
    `;
    
    if (!document.getElementById('trackingModal')) {
        document.body.insertAdjacentHTML('beforeend', trackingHTML);
    }
}

// Track order
async function trackOrder() {
    const code = document.getElementById('trackingCode').value;
    if (!code) {
        showNotification('Please enter a tracking code', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/orders/track/${code}`);
        const data = await response.json();
        
        if (response.ok) {
            const resultDiv = document.getElementById('trackingResult');
            resultDiv.innerHTML = `
                <div style="background: var(--card); padding: 16px; border-radius: 12px; border-left: 4px solid var(--accent);">
                    <p><strong>Status:</strong> ${data.status}</p>
                    <p><strong>Pages:</strong> ${data.total_pages}</p>
                    <p><strong>Price:</strong> ₹${data.total_price}</p>
                    <p><strong>Delivery:</strong> ${data.delivery_type}</p>
                    <p><strong>Created:</strong> ${new Date(data.created_at).toLocaleDateString()}</p>
                </div>
            `;
        } else {
            showNotification(data.error || 'Order not found', 'error');
        }
    } catch (error) {
        showNotification('Error tracking order: ' + error.message, 'error');
    }
}

// Scroll to upload
function scrollToUpload() {
    document.querySelector('.upload-card')?.scrollIntoView({ behavior: 'smooth' });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--accent)' : type === 'error' ? '#ff6b6b' : 'var(--primary)'};
        color: ${type === 'success' ? '#000' : '#fff'};
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
