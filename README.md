# Dental Clinic Management System

A comprehensive dental clinic management application built with Next.js, Supabase, and modern web technologies.

## Features

- **Patient Management**: Complete patient records and profiles
- **Appointment Scheduling**: Advanced booking system with time slots
- **Payment Tracking**: Invoice generation and payment history
- **Staff Dashboard**: Role-based access for doctors and staff
- **Admin Panel**: Complete clinic management tools
- **Real-time Updates**: Live notifications and updates
- **Emergency Appointments**: Priority booking system

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/dental-clinic-management.git
cd dental-clinic-management
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

4. Set up the database:
Run the SQL scripts in your Supabase dashboard in this order:
- `scripts/setup-database-v7.sql`
- `scripts/setup-appointments.sql`
- `scripts/setup-payments.sql`
- `scripts/setup-clinic-settings.sql`
- `scripts/setup-clinic-availability.sql`
- `scripts/update-time-slots.sql`
- `scripts/setup-patient-records.sql`
- `scripts/remove-lifestyle-columns.sql`
- `scripts/add-google-maps-link.sql`
- `scripts/add-outstanding-balance-column.sql`
- `scripts/add-social-media-columns.sql`
- `scripts/fix-payments-columns.sql`
- `scripts/add-clinic-settings-columns.sql`
- `scripts/add-medical-fields-to-users.sql`
- `scripts/add-priority-column-to-appointments.sql`
- `scripts/setup-appointment-types.sql`

5. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

### Netlify Deployment

1. **Push to GitHub**: Make sure your code is pushed to a GitHub repository
2. **Connect to Netlify**: 
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Select your repository
   - Build settings are configured in `netlify.toml`
3. **Environment Variables**: Add your Supabase credentials in Netlify dashboard
4. **Deploy**: Netlify will automatically build and deploy

### Build Commands

\`\`\`bash
# Build for production
npm run build

# Start production server
npm start
\`\`\`

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── admin/             # Admin panel pages
│   ├── appointments/      # Appointment management
│   ├── dashboard/         # User dashboards
│   ├── login/            # Authentication
│   └── payments/         # Payment management
├── components/           # Reusable React components
├── lib/                 # Utility functions and configurations
├── scripts/             # Database setup scripts
├── types/               # TypeScript type definitions
└── public/              # Static assets
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Git Commands for Upload

Use these commands to upload to your GitHub repository:

\`\`\`bash
# Navigate to your project directory
cd your-project-directory

# Initialize git repository
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Dental clinic management system"

# Set main branch
git branch -M main

# Add your repository as remote origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# Push to GitHub
git push -u origin main
\`\`\`

## Netlify Deployment Steps

1. **Create GitHub Repository**: Create a new repository on GitHub
2. **Push Code**: Use the git commands above to push your code
3. **Connect to Netlify**: 
   - Go to netlify.com and sign in
   - Click "New site from Git"
   - Choose GitHub and select your repository
   - Build settings are automatically configured via `netlify.toml`
4. **Add Environment Variables**: In Netlify dashboard, add your Supabase URL and API key
5. **Deploy**: Click deploy and your site will be live!

The `netlify.toml` file I included will handle all the build configuration automatically.
