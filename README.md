# Yogyata (योग्यता) - Premium MERN Stack Certificate Showcase

Yogyata is a beautiful, secure, and responsive portfolio showcase web application designed specifically for hosting, organizing, and verifying official credentials, academic degrees, and professional certifications.

The application features a modern dark aesthetic with a purple accent and warm gold highlights, inspired by Indian geometric designs (Mandala motifs).

---

## Technical Highlights

- **Backend**: Node.js, Express, MongoDB (via Mongoose), Multer, Cloudinary
- **Frontend**: React + Vite, Tailwind CSS (v3.4), TanStack Query, Axios, Lucide Icons, React Hot Toast
- **Security & Session Management**:
  - JWT stored exclusively in `httpOnly` secure cookies.
  - Rate limiting on the login endpoint (max 5 attempts per 15 minutes).
  - Centralized error handler middleware.
  - Helmet headers & input sanitization to prevent NoSQL query injections.
  - Front-end CORS access restricted to the configured origin.
- **Smart Uploads Fallback**:
  - Works fully offline using a local storage `/uploads` folder if Cloudinary credentials are not supplied in `.env`.
  - Automatically pushes to Cloudinary and cleans up local temporary files when Cloudinary credentials are provided.

---

## Workspace Structure

```text
certificate/
├── backend/            # Express REST API, Mongoose Models, Security middle
│   ├── config/         # DB & Upload handlers
│   ├── controllers/    # API endpoints logic
│   ├── middleware/     # Auth checks, error handling, rate limiting
│   ├── models/         # Mongoose Schemas (Admin, Certificate)
│   ├── uploads/        # Fallback local uploads folder
│   └── utils/          # Seeding utility & request validation rules
├── frontend/           # Vite React App using Tailwind CSS
│   ├── src/
│   │   ├── components/ # Navbar, Footer, Skeletons, Auth Guard
│   │   ├── context/    # Auth context for admin login state
│   │   ├── pages/      # Home, Gallery, Details, Admin CRUD, forms
│   │   └── utils/      # Axios instance configured with credential cookies
```

---

## Installation & Configuration

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (e.g. `mongodb://127.0.0.1:27017/certificate_showcase`) or a MongoDB Atlas connection string.

### Setup Instructions

1. **Install Dependencies**:
   Run the following command at the root directory to automatically install packages for both backend and frontend:
   ```bash
   npm run install-all
   ```
   *(Alternatively, run `npm install` inside both `/backend` and `/frontend` directories).*

2. **Configure Environment Variables**:
   Create a `.env` file in the `/backend` folder. You can copy the variables from the provided `backend/.env.example`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://127.0.0.1:27017/certificate_showcase
   JWT_SECRET=super_secret_jwt_key_change_me_in_production
   FRONTEND_URL=http://localhost:5173

   # Admin credentials to seed
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=Admin@123456

   # Optional Cloudinary (leaves files locally in /uploads if omitted)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

   Create a `.env` file in the `/frontend` folder:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

3. **Seed the Admin User**:
   Run the seeding script to create the initial administrative account in your database:
   ```bash
   npm run seed
   ```
   *(Or run `npm run seed` directly inside the `backend/` folder).*

---

## Running the Application

Start both the backend and frontend dev servers concurrently with a single command from the root directory:
```bash
npm run dev
```

- **Frontend client** runs at: [http://localhost:5173](http://localhost:5173)
- **Backend API server** runs at: [http://localhost:5000](http://localhost:5000)

---

## User Verification Scenarios

### Admin Operations
1. Go to [http://localhost:5173/admin/login](http://localhost:5173/admin/login) and log in with your seeded credentials (e.g., `admin@example.com` / `Admin@123456`).
2. Explore the admin dashboard to add new certificates, upload PDFs or JPGs/PNGs, toggle spotlight highlights, and reorder credentials.
3. Test that the dashboard reflects modifications instantly.

### Public View
1. Visit the Home view to inspect pinned featured achievements.
2. Search, sort, or page through records inside the Gallery view.
3. Navigate to a certificate's detail page to preview documents directly (embedded PDF or image), click verification URLs, or download copies.
