# Amrutam Telemedicine Platform

Welcome to the Amrutam Telemedicine Platform repository. This project features a Django REST Framework backend and a React frontend, designed to provide a seamless, premium experience for patients and doctors.

For an in-depth breakdown of the modular backend architecture and the React UI layout, please refer to the [Architecture and Features Document](./Architecture_and_Features.md).

---

## 🚀 Setup & Installation Guide

This project is split into two distinct directories:
1. `Amrutam_backend` (Django)
2. `Amrutam_frontend` (React)

### Prerequisites
- Python 3.10+
- Node.js (v16+)
- Redis (Running locally for OTP and caching)

---

### 1. Backend Setup

1. **Navigate to the root directory and create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

2. **Navigate into the backend folder and install dependencies:**
   ```bash
   cd Amrutam_backend
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Ensure you have a `.env` file in the `Amrutam_backend/Amrutam_backend/` directory (or wherever your `settings.py` loads it from) containing your secret keys, for example:
   ```env
   SECRET_KEY=your_django_secret_key
   DEBUG=True
   RAZORPAY_KEY_ID=your_test_key_id
   RAZORPAY_KEY_SECRET=your_test_key_secret
   ```

4. **Run Migrations & Start Server:**
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   The backend will now be available at `http://localhost:8000/`.

*(Note: To create an admin user for the Django panel or the Admin Dashboard, run `python manage.py createsuperuser`)*.

---

### 2. Frontend Setup

1. **Open a new terminal tab and navigate to the frontend folder:**
   ```bash
   cd Amrutam_frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm start
   ```
   The frontend will automatically open at `http://localhost:3000/`.

---

## 🛠️ Testing the Application

1. **Admin Access**: Log in at `http://localhost:3000/` using the credentials you created via `createsuperuser` to view the System Audit logs and Overviews.
2. **Doctor Access**: You can create Doctor profiles via the Django Admin panel (`http://localhost:8000/admin/`).
3. **Patient Access**: Click "Sign up" on the frontend to create and verify a new patient account via OTP.
