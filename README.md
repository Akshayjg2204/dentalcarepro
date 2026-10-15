# 🦷 DentalCare Pro — Clinic Management System

<div align="center">
  <p align="center">
    <b>An enterprise-grade dental clinic operations and practice management platform.</b><br>
    Engineered with Next.js 14, React 18, TypeScript, Supabase (PostgreSQL), Tailwind CSS, and Radix UI.
  </p>

  <p align="center">
    <a href="https://github.com/Akshayjg2204/dentalcarepro"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="Repository" /></a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=nextdotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
    <img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white" />
  </p>
</div>

---

## 🌟 Platform Capabilities

- **📋 Patient Health Records (EHR):** Complete digital health profiles, treatment history logs, dental charting notes, contact data, and active medication tracking.
- **🗓️ Intelligent Appointment Scheduling:** Calendar scheduling with multi-dentist slot availability, time-block collision detection, procedure-length estimation, and status updates (Pending, Confirmed, Completed, Cancelled).
- **🚨 Emergency Priority Triage:** Dedicated urgent triage booking workflow enabling rapid placement for acute dental emergencies without disrupting routine appointments.
- **💳 Billing & Invoice Management:** Automated cost generation, printable receipts, payment method tracking (Cash, Card, Insurance), and outstanding balance alerts.
- **👥 Role-Based Staff Dashboards:** Distinct permission boundaries and tailored views for Administrators, Dentists, Dental Assistants, and Front-Desk Receptionists.
- **⚙️ Clinic Roster & Availability Engine:** Configurable working hours, holiday schedules, break windows, and room allocation rules.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Next.js 14** | Full-stack React framework utilizing App Router and Server Components |
| **TypeScript** | End-to-end static typing across database schemas, UI components, and API routes |
| **Supabase** | Backend-as-a-Service providing PostgreSQL, Row-Level Security (RLS), and Authentication |
| **PostgreSQL** | Relational data persistence with stored procedures and relational triggers |
| **Tailwind CSS** | Clean utility-first clinical design system with custom medical color palette |
| **Radix UI** | Accessible, headless primitives (Dialogs, Dropdowns, Popovers, Tabs, Accordions) |
| **Lucide React** | Medical and operational vector iconography |
| **Sonner** | Accessible toast notification system for instant action feedback |

---

## 🗄️ Database Architecture & Migrations

The platform includes modular PostgreSQL migration scripts located in the [`scripts/`](./scripts) directory to set up or replicate the database schema on any Supabase instance:

1. `setup-database-v7.sql` — Core database tables, extensions, and ENUM types
2. `setup-appointments.sql` — Appointment scheduling rules and status triggers
3. `setup-payments.sql` — Invoices, payments, and billing ledger tables
4. `setup-clinic-settings.sql` — Clinic metadata, opening hours, and configuration
5. `setup-clinic-availability.sql` — Time slot generator and doctor roster availability
6. `setup-patient-records.sql` — Extended patient treatment logs and medical history

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or yarn
- A Supabase account (or local PostgreSQL instance)

```bash
# 1. Clone the repository
git clone https://github.com/Akshayjg2204/dentalcarepro.git
cd dentalcarepro

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.local.example .env.local
```

Populate `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 👨‍💻 Author

**Akshay Gaikwad**  
Founder & Lead Engineer at [Streamline.dev](https://github.com/Streamline-dev0)  
- 🌐 Portfolio: [stream-line.dev](https://stream-line.dev/)  
- 💼 LinkedIn: [linkedin.com/in/akshayjgaikwad](https://www.linkedin.com/in/akshayjgaikwad/)  
- 🐙 GitHub: [@Akshayjg2204](https://github.com/Akshayjg2204)  
