# Suggestions for Super Admin Implementation

This document outlines the proposed architecture and features for the Super Admin dashboard and management system for the GearSwap Marketplace.

## 1. Authentication & Role-Based Access Control (RBAC)

### Add `SUPER_ADMIN` Role
Modify `backend/src/modules/auth/auth.model.ts` to include the new role:
```typescript
export enum UserRole {
    BUYER = 'BUYER',
    SELLER = 'SELLER',
    SUPER_ADMIN = 'SUPER_ADMIN', // New Role
}
```

### Secure GraphQL Resolvers
Implement a middleware or use a library like `graphql-shield` to protect admin-only operations.
- **Admin-Only Queries**: `getAllUsers`, `getAllSellers`, `getGlobalAnalytics`, `getAuditLogs`.
- **Admin-Only Mutations**: `updateUserStatus`, `approveSeller`, `removeInappropriateProduct`.

---

## 2. Super Admin Dashboard: What to See & Manage

### A. User Management (Buyers)
The Super Admin needs a bird's-eye view of all platform participants.
- **Required Details**:
    - Registration date and last login.
    - Total orders placed and total spend.
    - Status (Active, Suspended, Banned).
- **Management Actions**:
    - Block/Unblock users for policy violations.
    - Manually trigger password resets.
    - View user communication logs (for dispute resolution).

### B. Seller Management
Sellers are the backbone of the marketplace; they require closer monitoring.
- **Required Details**:
    - Business name, GSTIN, and registration details.
    - Total products listed vs. active products.
    - Total revenue (GMV) and pending payouts.
    - Seller rating and return/cancellation rates.
- **Management Actions**:
    - **Verification**: Approve new sellers after reviewing their documents.
    - **Commission**: Set custom commission rates per seller.
    - **Storefront Control**: Feature certain sellers on the homepage.
    - **Dashboard Mirroring**: A tool to view the "Live" dashboard exactly as the seller sees it.

### C. Cross-Dashboard Management
A Super Admin should be able to influence both Seller and User experiences simultaneously:
- **Site-Wide Configuration**:
    - Manage "Service-Wide Message" or "Maintenance Mode" banners.
    - Toggle specific features (e.g., "Enable Gifting", "Disable Chat").
- **User Impersonation**:
    - Securely "Log in as" a User or Seller to troubleshoot reported issues.
    - View the user's current Cart or Order status to assist with support requests.
- **Support & Dispute Center**:
    - A centralized area to read and participate in Chat logs between Sellers and Buyers for mediation.

### C. Product Moderation
Ensuring quality and legality of items listed.
- **Required Details**:
    - Global list of all products across all sellers.
    - Flagged products (reported by users).
    - High-stock vs. Out-of-stock items.
- **Management Actions**:
    - Bulk update categories.
    - Delete/Hide products that violate marketplace rules.

### D. Order & Financial Oversight
- **Required Details**:
    - Real-time stream of all orders.
    - Payment status (Pending, Paid, Failed).
    - Platform-wide GST reports (Tax collected).
- **Management Actions**:
    - Refund processing.
    - Status overrides (e.g., manually marking a stuck order as "Completed").

---

## 3. Global Analytics (The "Super" View)

The Dashboard should feature a summary section for quick decision-making:
1.  **Key Performance Indicators (KPIs)**:
    - Total Registered Users (Growth chart).
    - Active Sellers count.
    - Daily/Monthly Revenue.
2.  **Infrastructure Health**:
    - Status of Redis queues (BullMQ).
    - Typesense Search Index sync status.
3.  **Conflict Resolution**:
    - Open chat tickets between Buyers and Sellers.

---

## 4. Frontend Implementation Suggestions

### Dedicated Admin Layout
- Create a specific layout in Next.js (e.g., `/app/admin/**`) with a sidebar for navigation.
- Use **TanStack Table (React Table)** for high-performance data grids with filtering/sorting.
- Use **Recharts** or **Chart.js** for visualizing sales and user growth.

### Access Control on Frontend
- Ensure the Admin Dashboard is not only hidden but also protected via route guards.
- Redirect non-admin users to `/` if they attempt to access `/admin`.

---

## 5. First Step: Seeding the Admin
Create a script to promote an existing user or create a new one with the `SUPER_ADMIN` role:
```typescript
// backend/src/scripts/create-admin.ts
const admin = await User.create({
    email: 'admin@gearswap.com',
    password: 'securepassword',
    role: UserRole.SUPER_ADMIN
});
```
