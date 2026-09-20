# Amrutam Telemedicine Platform

## System Architecture

The Amrutam Telemedicine Platform is built on a modern, decoupled client-server architecture designed for scalability, security, and exceptional user experience. 

### Backend Architecture (Django REST Framework)
The backend is engineered using Django and Django REST Framework (DRF), following a highly modular "app-based" approach. This ensures separation of concerns, easier maintenance, and strict security controls.

#### Core Modules
1. **`users` (Authentication & Identity)**
   - Utilizes a Custom User Model (`CustomUser`) identifying users by Email instead of Username.
   - Distinct profiles are securely linked to this user model via One-to-One relations (`Profile` for patients, `Doctor` for specialists).
   - Secures authentication using **JWT (JSON Web Tokens)** for stateless, scalable session management.
   - Includes a robust, anti-enumeration OTP-based password reset flow, leveraging Redis for caching and temporary state management.

2. **`consultations` (Core Logic & Scheduling)**
   - Manages the core telemedicine workflows: Slot Management, Consultation Bookings, and Medical Prescriptions.
   - `AvailabilitySlot` model allows Doctors to declare their schedule.
   - Prevents overlapping slot creation and double-booking using robust Django validation layers.
   - State-machine driven `Consultation` instances track appointments through various statuses (`payment_pending`, `paid`, `completed`).

3. **`payments` (Financial Operations)**
   - Integrated with the **Razorpay API** for secure, regulatory-compliant payment gateways.
   - Utilizes database transactions (`transaction.atomic()` and `select_for_update()`) during signature verification to prevent race conditions and ensure idempotency during payment state updates.

4. **`audit` (System Monitoring)**
   - A dedicated logging subsystem that captures critical business events (User Signups, Doctor Onboarding, Slot Creation, Bookings, Payments, and Prescriptions).
   - Generates a chronological, immutable feed of platform activity accessible strictly by Admin personnel.

#### Security & Performance
- **Role-Based Access Control (RBAC)**: Custom permission classes (`IsDoctor`, `IsPatient`, `IsAdmin`) secure every API endpoint, ensuring actors can only mutate or access data they own.
- **Database**: Employs SQLite for relational data structuring (easily swappable to PostgreSQL for production environments).
- **Environment Management**: Secrets and API keys (Razorpay, Django Secret Key) are securely injected via `.env`.

---

### Frontend Architecture (React)

The frontend is a dynamic, Single Page Application (SPA) built with React. It focuses heavily on presenting a premium, wellness-oriented aesthetic inspired by Amrutam's brand identity.

- **Design System**: Built without heavy CSS frameworks, relying on a robust, hand-crafted `index.css` leveraging modern CSS variables, flexbox, and 100vh panel-based layouts to prevent clunky full-page scrolls.
- **Dynamic Dashboards**:
  - **Patient Dashboard**: A 3-column interactive layout (Specialists -> Bookings -> Appointments).
  - **Doctor Dashboard**: Dedicated interfaces for Slot Management and issuing Prescriptions.
  - **Admin Dashboard**: Real-time aggregate statistics and a live feed of System Activity Logs.
- **Axios Interceptors**: Automatically handles JWT injection into headers and gracefully redirects users upon token expiration.

## Key Features

1. **Secure Onboarding**: OTP-based verification and secure password resets.
2. **Real-time Slot Booking**: Patients can instantly view and book active slots.
3. **Integrated Payments**: Frictionless payment flow using Razorpay before a consultation is confirmed.
4. **Digital Prescriptions**: Doctors can issue immutable digital prescriptions post-consultation.
5. **Admin Audit Logs**: Full systemic transparency into the platform's operational flow.
