<div align="center">

# FinSage

[![FinSage](https://img.shields.io/badge/FinSage-Fintech%20Platform-2ecc71?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Codemakerom/Finsage)
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge&logo=vercel&logoColor=white)](https://finexa-1.vercel.app/)

</div>

---

## Technology Stack

<div align="center">

![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.x-646cff?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

## Overview

FinSage is a fintech-focused web platform designed to make high-quality financial guidance accessible, personalized, and affordable for college students and young professionals. 

The platform helps users build a detailed financial profile and provides multi-agent AI-powered guidance across budgeting, savings, debt management, and investments—all synthesized into a single, actionable monthly plan. With scenario comparisons, visual dashboards, and transparent insights, FinSage empowers users to build financial confidence and move toward long-term stability.

Repository structure (high level):

```
FinSage/
├── backend/        # Node.js + Express API, student profiles, transactions, goals
├── frontend/       # React + Vite dashboard & landing page
└── README.md       # <-- you are here
```

### Key Features

- 📊 Detailed financial profile builder with income, expenses, debts, and savings
- 🤖 Multi-agent AI financial council (Budget, Savings, Debt, Investment agents)
- 📈 Visual dashboard with spending breakdown, savings growth, and debt payoff tracking
- 🎯 Goal-based savings planning (short-term & long-term)
- 🔄 Transaction tracking and categorization
- 📋 Monthly action plans with scenario comparisons
- 🔐 Firebase authentication & privacy-first approach
- 💡 Beginner-friendly investment recommendations based on risk tolerance

## Quick Start

These instructions will get a local copy running for development and testing.

### Prerequisites

- Node.js v18+ and npm
- MongoDB (local or Atlas)
- Firebase project (for authentication)

### Backend (API)

1. Open a terminal and install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in `backend/` with the following variables:

```env
PORT=8000
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_storage_bucket
```

3. Start the backend server in development mode:

```bash
npm run dev
```

The server entry point is `backend/server.js`.

### Frontend (Dashboard & Landing Page)

1. Install dependencies and run the dev server:

```bash
cd frontend
npm install
npm run dev
```

2. The frontend uses Vite and React sources are in `frontend/src/`.

## Project Details & Notable Files

- `backend/server.js` — Express app, middleware, and route mounting
- `backend/controllers/` — request handlers for students, profiles, transactions, goals
- `backend/models/` — Mongoose schemas for Student, StudentProfile, Transaction, GoalSchema
- `backend/routes/` — API route definitions
- `frontend/src/pages/` — React pages: Landing, Auth, Dashboard, Profile, Transactions
- `frontend/src/components/` — Reusable UI components and layouts
- `frontend/src/context/` — Context providers for user and theme management

## API Endpoints (Selected)

Authentication & User:

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/student/profile/:firebaseUid
```

Student Profile & Goals:

```
PUT    /api/student/profile/:firebaseUid
POST   /api/student/goals/toggle
GET    /api/student/goals/:firebaseUid
```

Transactions:

```
GET    /api/transactions/:firebaseUid
POST   /api/transactions
GET    /api/transactions/stats/:firebaseUid
POST   /api/student/record-monthly-income
```

Note: Inspect files under `backend/routes/` for the complete list of endpoints.

## Environment Config & Secrets

Keep a `.env.example` file with placeholders (no real secrets) and commit it to the repo. Never commit `.env` files with actual secrets. Use environment variables in production deployments.

## Running Tests

```bash
cd backend
npm test

cd ../frontend
npm test
```

## Deployment

**Backend:** Any Node.js host (Railway, Render, Heroku, AWS Elastic Beanstalk). Configure environment variables and set start script to `node server.js`.

**Frontend:** Vercel or Netlify recommended. Build with `npm run build` and deploy the `dist/` folder.

## Support

For questions or issues, open an issue in this repository or contact the me :)
