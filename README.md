# PrintEase

A clean, fast print-order app built for students and print shops. Upload files, get instant quotes, track your order.

**Live**: [https://printease-mu.vercel.app](https://printease-mu.vercel.app)  
**Admin**: [https://printease-mu.vercel.app/admin.html](https://printease-mu.vercel.app/admin.html)

## The Problem

Ordering prints sucks. Files get lost in emails. Pricing is confusing. You never know when your stuff will be ready.

PrintEase fixes this: one place to upload, one tracking code, real-time updates.

## What It Does

**For Customers:**
- Upload PDFs, docs, images
- See price instantly
- Get a tracking code
- Check status anytime

**For Admins:**
- See all orders
- Update status
- Track revenue
- Manage everything

## Pricing

| Type | Cost | Speed |
|------|------|-------|
| Same-day pickup | ₹2/page | < 4 hrs |
| Next-day delivery | ₹3/page | 6-12 hrs |
| Bulk (5K+ pages) | Custom | Custom |

## Setup Local

```bash
# Clone
git clone https://github.com/omb-11/printease.git
cd printease

# Virtual env
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1

# Install & run
pip install -r requirements.txt
python api/index.py
```

Open http://localhost:5000

## Deploy on Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your repo
5. Click "Deploy"

Done. Your app goes live automatically.

## API

### Create Order
```bash
POST /api/orders
Content-Type: multipart/form-data

customer_name=John&email=john@example.com&phone=9876543210&total_pages=50&files=file.pdf
```

### Track Order
```bash
GET /api/orders/track/PRINT12345678
```

### Admin Login
```bash
POST /api/admin/login
{
  "username": "admin",
  "password": "printease123"
}
```

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JS
- **Backend**: Flask 3.1
- **Database**: SQLite
- **Hosting**: Vercel (serverless)

## File Types

Supported: PDF, DOCX, PPT, PNG, JPG, ZIP (max 100MB each)

## Admin Dashboard

Go to `/admin.html`

**Login:**
- Username: `admin`
- Password: `printease123`

**Features:**
- View all orders
- Search by code/name/email
- Update order status
- Delete orders
- See stats (total orders, revenue, pending, delivered)

## Order Statuses

- Pending
- Processing
- Ready for Pickup
- Shipped
- Delivered
- Cancelled

## How It Works

1. Customer uploads files
2. Backend estimates pages
3. Price calculated instantly
4. Order saved with tracking code
5. Customer gets code
6. Admin can update status
7. Customer tracks by code

## Folder Structure

```
printease/
├── api/index.py          # Flask backend
├── assets/
│   ├── app.js           # Customer frontend
│   └── admin.js         # Admin dashboard
├── index.html           # Customer page
├── admin.html           # Admin page
├── styles.css           # Styling
├── README.md            # This file
├── requirements.txt     # Python deps
├── vercel.json          # Vercel config
└── .gitignore           # Git ignore
```

## Running Locally

```bash
python api/index.py
```

Visit `http://localhost:5000`

Test admin at `http://localhost:5000/admin.html`

## Credentials

**Admin (default - change in production!):**
- Username: `admin`
- Password: `printease123`

## Common Issues

**Files not uploading?**
- Check file type (PDF, DOC, IMG only)
- Max 100MB per file
- Check connection

**Price not calculating?**
- Refresh page
- Check console for errors
- Backend running?

**Admin login fails?**
- Clear cache
- Check credentials
- Backend running?

**Order not found?**
- Double-check tracking code
- Database exists?
- Backend logs?

## Future

Stuff we might add:
- Payment processing
- SMS notifications
- Bulk order API
- Analytics
- Multi-language

## License

MIT - use however you want

---

Made by PrintEase team. Questions? Check GitHub issues.
