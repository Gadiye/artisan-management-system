# 🪵 Artisan Management System

A modern, full-stack production management platform designed for service-based businesses. Built with Django + Next.js, this system streamlines job tracking, inventory management, artisan payroll, and comprehensive business analytics.

**Live Demo:** [artisan-management.vercel.app](https://artisan-management.vercel.app)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Django](https://img.shields.io/badge/django-5.x-darkgreen.svg)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/next.js-16+-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5+-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **📊 Live Dashboard** | Real-time KPIs, active job overview, and quick-action shortcuts |
| **🏭 Production Pipeline** | Multi-stage job tracking (Drawing → Carving → Cutting → Sanding → Painting → Finishing) |
| **👷 Artisan Management** | Profile management, workload tracking, earnings, and soft-delete deactivation |
| **📦 Inventory Control** | Work-in-progress tracking by service category and finished stock monitoring |
| **🛍️ Product Catalog** | Full product management with variants (type, animal, size), pricing, and price history |
| **📋 Order Management** | Customer orders with line items, status tracking, and fulfillment workflows |
| **💰 Financial Management** | Artisan advances, deductions, automated payslip generation (Excel), service rate configuration |
| **📈 Analytics & Reports** | Revenue, production volume, quality metrics, rejection analysis, trends, and artisan rankings |
| **🔐 Authentication** | Secure session-based auth via NextAuth v5 with Django backend integration |
| **⚡ Real-time Updates** | Live status changes, demand vs. supply dashboard, and artisan workload distribution |

---

## 🏗 Architecture

```
artisan-management-system/
├── myapp/
│   ├── appback/                    # Django REST API Backend
│   │   ├── appback/                #   Project settings & root URLs
│   │   ├── artisans/               #   Artisan profiles & payments tracking
│   │   ├── customers/              #   Customer management
│   │   ├── products/               #   Product catalog & price history
│   │   ├── jobs/                   #   Jobs, job items, deliveries & service rates
│   │   ├── inventory/              #   WIP inventory & finished stock
│   │   ├── orders/                 #   Order management & fulfillment
│   │   ├── financials/             #   Payslips, advances, deductions
│   │   ├── data_entry/             #   Bulk data import utilities
│   │   ├── Dockerfile              #   Backend container config
│   │   ├── requirements.txt        #   Python dependencies
│   │   ├── manage.py               #   Django CLI
│   │   └── gunicorn.conf.py        #   Production server config
│   │
│   ├── my-app/                     # Next.js Frontend (App Router)
│   │   ├── app/                    #   Pages (Dashboard, Jobs, Inventory, Reports, etc.)
│   │   ├── components/             #   UI components (ShadCN UI + Radix primitives)
│   │   ├── hooks/                  #   Custom data fetching hooks (SWR-powered)
│   │   ├── lib/                    #   API client, utilities, constants
│   │   ├── types/                  #   TypeScript type definitions
│   │   ├── auth.ts                 #   NextAuth configuration
│   │   ├── Dockerfile              #   Frontend container config
│   │   └── package.json            #   Node.js dependencies
│   │
│   ├── docker-compose.yml          # Container orchestration
│   ├── services.json               # Master config for service categories
│   ├── sync_services.py            # Config sync script (back ↔ front)
│   └── README.md
│
└── This README

```

---

## 🛠 Tech Stack

### Backend
- **Framework:** Django 5.0 + Django REST Framework
- **Database:** PostgreSQL (production) with `dj-database-url`
- **API Features:** `django-filter` (search, filtering, ordering), `django-cors-headers`, `djangorestframework-camel-case`
- **File Generation:** openpyxl (Excel payslips), ReportLab (PDF reports)
- **Static Files:** WhiteNoise
- **Server:** Gunicorn (production), Django dev server (local)

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI Library:** React 19
- **Components:** ShadCN UI (built on Radix primitives)
- **Styling:** Tailwind CSS v4
- **Data Fetching:** SWR with custom `useApi` hook for API abstraction
- **Authentication:** NextAuth v5 (beta)
- **Icons:** Lucide React
- **Date Utilities:** date-fns + react-day-picker
- **Spreadsheets:** xlsx for data export

### DevOps
- **Containerization:** Docker & Docker Compose
- **Version Control:** Git
- **Package Management:** pip (Python), npm (Node.js)
- **Code Quality:** ESLint, Prettier, TypeScript

---

## 🚀 Quick Start

### Prerequisites

Choose one setup method:

- **Option A (Recommended):** Docker & Docker Compose
- **Option B:** Python 3.11+ & Node.js 18+ for local development

### Option 1: Docker Compose

```bash
# Clone and navigate
git clone https://github.com/Gadiye/artisan-management-system.git
cd artisan-management-system/myapp

# Create backend environment
cat > appback/.env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/artisan_db
SECRET_KEY=your-django-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
EOF

# Start services
docker compose up --build
```

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3001 | 3001 |
| Backend API | http://localhost:8001/api/ | 8001 |
| Database | PostgreSQL | 5432 |

### Option 2: Local Development

#### Backend Setup

```bash
cd myapp/appback

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and SECRET_KEY

# Database setup
python manage.py migrate

# (Optional) Create superuser for Django admin
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend will be available at **http://localhost:8000/api/**

#### Frontend Setup

```bash
cd myapp/my-app

# Install dependencies
npm install

# Configure environment
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api/
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=false
EOF

# Start development server
npm run dev
```

Frontend will be available at **http://localhost:3000**

---

## ⚙️ Configuration

### Environment Variables

#### Backend (`appback/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `SECRET_KEY` | Django secret key (generate a strong one) | `django-insecure-...` |
| `DEBUG` | Debug mode (set to `False` in production) | `True` or `False` |
| `ALLOWED_HOSTS` | Space-separated allowed hosts | `localhost 127.0.0.1 example.com` |
| `CORS_ALLOWED_ORIGINS` | CORS-allowed frontend URL | `http://localhost:3000` |

#### Frontend (`my-app/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api/` |
| `NEXTAUTH_SECRET` | NextAuth encryption secret (generate with `openssl rand -base64 32`) | Random 32-byte string |
| `NEXTAUTH_URL` | Frontend base URL | `http://localhost:3000` |
| `NEXT_PUBLIC_DEMO_MODE` | Enable demo/read-only mode | `true` or `false` |

### Service Categories Configuration

The app uses a centralized service category system (production stages) managed via `services.json`:

```bash
# 1. Edit services.json in the root directory
# Example:
# {
#   "stages": [
#     {"key": "drawing", "label": "Drawing", "color": "bg-blue-500"},
#     {"key": "carving", "label": "Carving", "color": "bg-yellow-500"},
#     ...
#   ]
# }

# 2. Sync to backend & frontend
python sync_services.py

# 3. (Optional) Create new backend migrations if schema changed
cd appback
python manage.py makemigrations
python manage.py migrate
```

This updates:
- **Backend:** `SERVICE_CATEGORIES` in Django models
- **Frontend:** `SERVICE_CATEGORIES`, `PRODUCTION_CHAIN_MAP`, `STAGE_COLORS` in `lib/constants.ts`

---

## 📡 API Endpoints

### Authentication
```
POST /api/login/            # JSON-based login
POST /api/logout/           # Logout
GET  /api/user/             # Current user info
```

### Core Resources

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/products/` | GET, POST, PUT, DELETE | Product catalog management |
| `/api/artisans/` | GET, POST, PUT, DELETE | Artisan profiles & status |
| `/api/customers/` | GET, POST, PUT, DELETE | Customer management |
| `/api/jobs/` | GET, POST, PUT, DELETE | Job CRUD with nested items & deliveries |
| `/api/orders/` | GET, POST, PUT, DELETE | Order management & fulfillment |
| `/api/inventory/items/` | GET, POST, PUT, DELETE | Work-in-progress inventory |
| `/api/inventory/finished-stock/` | GET | Finished stock levels by category |
| `/api/financials/payslips/` | GET, POST | Payslip generation & listing |
| `/api/financials/service-rates/` | GET | Service rate lookup |

### Specialized Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/jobs/dashboard/` | Aggregate job statistics (count, completion rates, etc.) |
| `GET /api/jobs/production-guide/` | Demand, stock, WIP, and artisan workload analysis |
| `GET /api/jobs/comprehensive-reports/` | Revenue, production volume, quality metrics, trends (supports `?start_date=` & `?end_date=`) |
| `GET /api/job-items/pending-delivery/` | Items awaiting artisan delivery |
| `GET /api/job-items/pending-payslip/` | Items ready for payslip generation |
| `GET /api/service-rates/hierarchical/` | Rate structure by product & category |

### Query Parameters

All list endpoints support:
- **`search`** — Search across relevant fields
- **`ordering`** — Sort by field (prefix with `-` for descending, e.g., `-created_date`)
- **`page`** — Pagination page number
- **`page_size`** — Items per page

**Example:**
```bash
GET /api/jobs/?search=John&ordering=-created_date&page=1&page_size=20
```

### Example Requests

#### Create a Customer
```bash
curl -X POST http://localhost:8000/api/customers/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "phone": "+1234567890",
    "address": "123 Main St"
  }'
```

#### Get Orders with Filtering
```bash
curl "http://localhost:8000/api/orders/?search=Acme&ordering=-created_date"
```

#### Generate Production Guide
```bash
curl "http://localhost:8000/api/jobs/production-guide/"
```

---

## 🎯 Usage Workflow

### 1. **Setup Products/Services**
   - Navigate to **Products** page
   - Add products with variants (type, animal, size)
   - Set base prices and service rates
   - Track price history

### 2. **Add Customers**
   - Go to **Customers** section
   - Create customer profiles with contact info
   - View order history and communication

### 3. **Create Orders**
   - Go to **Orders** page
   - Select customer and add line items
   - Set quantities and requirements
   - Track order fulfillment status

### 4. **Create & Assign Jobs**
   - Create **Jobs** from orders
   - Add job items with production stages
   - Assign artisans by stage
   - Monitor progress through pipeline

### 5. **Track Inventory**
   - Monitor **WIP (Work-in-Progress)** inventory by stage
   - Track finished stock levels
   - Update inventory as jobs progress

### 6. **Manage Artisan Payroll**
   - Record **Advances** and **Deductions** in Financials
   - Generate **Payslips** for completed work
   - Export payslips as Excel files
   - Track pending payments

### 7. **View Reports & Analytics**
   - Access **Dashboard** for live KPIs
   - Review **Production Guide** for demand vs. supply
   - Generate **Comprehensive Reports** with date filtering
   - Analyze top artisans, quality rates, revenue trends

---

## 🔧 Development

### Folder Structure & Code Organization

#### Backend (`appback/`)
- Each Django app (artisans, jobs, orders, etc.) follows the standard structure:
  - `models.py` — Database schemas
  - `serializers.py` — DRF serializers (for API responses)
  - `views.py` — ViewSets & API views
  - `urls.py` — URL routing
  - `filters.py` — Custom filters for search/ordering

#### Frontend (`my-app/`)
- **`app/`** — Next.js pages using App Router
- **`components/`** — Reusable UI components (table, forms, dialogs, etc.)
- **`hooks/`** — SWR data-fetching hooks (e.g., `useArtisans()`, `useJobs()`)
- **`lib/`** — Utilities, API client, constants, helpers
- **`types/`** — TypeScript interfaces for all API models
- **`auth.ts`** — NextAuth session management

### Adding a New Feature

1. **Backend:**
   - Create models in `appback/your_module/models.py`
   - Write serializers in `serializers.py`
   - Create ViewSet in `views.py`
   - Register URLs in `urls.py`
   - Run migrations: `python manage.py makemigrations && python manage.py migrate`

2. **Frontend:**
   - Add TypeScript types in `types/`
   - Create a custom hook in `hooks/` (e.g., `useYourData()`)
   - Build components in `components/`
   - Add pages in `app/`

### Running Tests

#### Backend
```bash
cd appback
python manage.py test
```

#### Frontend
```bash
cd my-app
npm test
```

---

## 🚀 Deployment

### Production Considerations

- Use **PostgreSQL** (not SQLite)
- Set **`DEBUG=False`** in Django settings
- Configure proper **`ALLOWED_HOSTS`** and **`CORS_ALLOWED_ORIGINS`**
- Use a **reverse proxy** (Nginx, Caddy, etc.)
- Set up **SSL certificates** (Let's Encrypt)
- Configure **environment variables** securely
- Set up **monitoring & logging** (e.g., Sentry, CloudWatch)
- Use a **production-grade web server** (Gunicorn is pre-configured)

### Docker Deployment

```bash
# Build & deploy with Docker Compose
docker compose up --build

# Or push to cloud platform (Render, Heroku, Railway, etc.)
# Follow platform-specific deployment guides
```

### Environment for Production

```bash
# appback/.env
DEBUG=False
SECRET_KEY=<very-long-random-string>
DATABASE_URL=<production-postgresql-url>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 🤝 Contributing

We welcome contributions! Follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Guidelines

- **Python:** Follow PEP 8 (use `black`, `flake8` for linting)
- **TypeScript/JavaScript:** Follow ESLint & Prettier configs in the project
- **Tests:** Write tests for new features
- **Documentation:** Update README and inline comments as needed

---

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ShadCN UI Components](https://ui.shadcn.com)
- [NextAuth.js Documentation](https://next-auth.js.org)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute this software for personal or commercial purposes.

---

## 🆘 Support & Issues

Encounter a problem? Here's how to get help:

1. **Check the [Issues](https://github.com/Gadiye/artisan-management-system/issues)** page for existing solutions
2. **Create a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Your environment (OS, Python version, Node version, etc.)
   - Error logs or screenshots
3. **Reach out** via GitHub Discussions or create a detailed issue

---

## 🎉 Status

- ✅ Core features (Jobs, Inventory, Payroll) — Production ready
- ✅ Analytics & Reporting — Complete
- ✅ Docker deployment — Supported
- 🔄 Mobile optimization — In progress
- 🔄 Advanced caching — Planned

---

**Built with ❤️ by [Gadiye](https://github.com/Gadiye)**

Last Updated: September 2026
