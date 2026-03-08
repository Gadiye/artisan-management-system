# 🪵 Artisan Management System

A full-stack production management platform for woodcraft businesses. Track artisans, manage jobs through multi-stage production pipelines, monitor inventory across service categories, process orders, generate payslips, and gain real-time insights — all from a single dashboard.

---

## ✨ Features

| Module | Description |
|---|---|
| **Dashboard** | Live KPIs, active job overview, and quick-action shortcuts |
| **Jobs** | Create, assign, and track multi-item jobs through production stages (Drawing → Carving → Cutting → Sanding → Painting → Finishing) |
| **Artisans** | Manage artisan profiles, track workloads, earnings, and soft-delete with deactivation |
| **Inventory** | Monitor work-in-progress inventory across service categories and finished stock levels |
| **Products** | Full product catalog with type/animal/size variants, pricing, and price history |
| **Orders** | Customer order management with line items, status tracking, and fulfillment |
| **Customers** | Customer profiles with contact details and order history |
| **Financials** | Artisan advances, deductions, payslip generation (PDF via ReportLab), and service rate management |
| **Pricing** | Hierarchical service rate configuration per product and service category |
| **Production Guide** | Real-time demand vs. supply dashboard showing shortages, WIP, and artisan workload distribution |
| **Reports & Analytics** | Dynamic reports with revenue, production volume, quality rates, rejection analysis, trends, and top artisan rankings |
| **Authentication** | Session-based authentication via NextAuth v5 with Django backend credentials |

---

## 🏗 Architecture

```
myapp/
├── appback/                # Django REST API backend
│   ├── appback/            #   Project settings & root URLs
│   ├── artisans/           #   Artisan profiles & pending payments
│   ├── customers/          #   Customer management
│   ├── products/           #   Product catalog & price history
│   ├── jobs/               #   Jobs, job items, deliveries & service rates
│   ├── inventory/          #   WIP inventory & finished stock
│   ├── orders/             #   Orders & order items
│   ├── financials/         #   Payslips, advances & deductions
│   ├── data_entry/         #   Bulk data import utilities
│   ├── Dockerfile          #   Backend container config
│   └── requirements.txt    #   Python dependencies
├── my-app/                 # Next.js frontend
│   ├── app/                #   Pages (Dashboard, Jobs, Inventory, etc.)
│   ├── components/         #   UI components (ShadCN UI + custom)
│   ├── hooks/              #   SWR-powered data fetching hooks
│   ├── lib/                #   API client, utilities
│   ├── types/              #   TypeScript type definitions
│   ├── auth.ts             #   NextAuth configuration
│   ├── Dockerfile          #   Frontend container config
│   └── package.json        #   Node dependencies
├── docker-compose.yml      # Container orchestration
└── README.md
```

---

## 🛠 Tech Stack

### Backend
- **Framework:** Django 4.2 + Django REST Framework
- **Database:** PostgreSQL (via `dj-database-url`)
- **Filtering:** `django-filter` for query parameter filtering & search
- **PDF Generation:** ReportLab for artisan payslips
- **Static Files:** WhiteNoise
- **CORS:** `django-cors-headers`

### Frontend
- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** ShadCN UI (Radix primitives)
- **Data Fetching:** SWR with custom `useApi` hook
- **Auth:** NextAuth v5 (beta)
- **Icons:** Lucide React
- **Date Handling:** date-fns + react-day-picker
- **Spreadsheets:** xlsx for data export

---

## 🚀 Getting Started

### Prerequisites

- **Docker & Docker Compose** (recommended) — or —
- **Python 3.11+** and **Node.js 18+** for local development

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd myapp

# Create backend environment file
cat > appback/.env << EOF
DATABASE_URL=<your-postgresql-connection-string>
SECRET_KEY=<your-django-secret-key>
DEBUG=True
EOF

# Start both services
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8001/api/ |

### Option 2: Local Development

#### Backend

```bash
cd appback

# Create & activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env   # Edit with your DATABASE_URL

# Run migrations & start server
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`.

#### Frontend

```bash
cd my-app

# Install dependencies
npm install

# Configure environment
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api/
NEXTAUTH_SECRET=<generate-a-secret>
NEXTAUTH_URL=http://localhost:3000
EOF

# Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 📡 API Endpoints

### Core Resources

| Endpoint | Methods | Description |
|---|---|---|
| `/api/products/` | GET, POST | Product catalog management |
| `/api/artisans/` | GET, POST | Artisan profiles |
| `/api/customers/` | GET, POST | Customer management |
| `/api/jobs/` | GET, POST | Job CRUD with nested items & deliveries |
| `/api/inventory/items/` | GET | Work-in-progress inventory |
| `/api/inventory/finished-stock/` | GET | Finished stock levels |
| `/api/orders/` | GET, POST | Order management |
| `/api/financials/payslips/` | GET, POST | Payslip generation & listing |
| `/api/financials/service-rates/` | GET | Service rate lookup |

### Specialized Endpoints

| Endpoint | Description |
|---|---|
| `/api/jobs/dashboard/` | Aggregate job statistics |
| `/api/jobs/production-guide/` | Demand, stock, WIP, and artisan workload data |
| `/api/jobs/comprehensive-reports/` | Revenue, production, quality, and trend analytics (supports `?start_date=` & `?end_date=`) |
| `/api/job-items/pending-delivery/` | Items awaiting artisan delivery |
| `/api/job-items/pending-payslip/` | Items ready for payslip generation |
| `/api/service-rates/hierarchical/` | Hierarchical rate structure by product |
| `/api/login/` | JSON-based authentication |

All list endpoints support **filtering**, **search**, and **ordering** via query parameters (e.g., `?search=John&ordering=-created_date`).

---

## 🔧 Environment Variables

### Backend (`appback/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | *required* |
| `SECRET_KEY` | Django secret key | `django-insecure-fallback-key-for-dev` |
| `DEBUG` | Enable debug mode | `True` |
| `ALLOWED_HOSTS` | Space-separated allowed hosts | `localhost 127.0.0.1 0.0.0.0` |

### Frontend (`my-app/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8001/api/` |
| `NEXTAUTH_SECRET` | NextAuth encryption secret | *generate a random string* |
| `NEXTAUTH_URL` | Frontend base URL | `http://localhost:3000` |

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.