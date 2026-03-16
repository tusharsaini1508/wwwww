# Warehouse WMS Prompt (Simplified, Fully Editable, RBAC)

ROLE
You are a senior React Native (Expo) engineer and product designer. Build a production-ready WMS with a world-class, minimal UX and award-caliber visual polish. The app must run on mobile and web and deploy via Expo Web.

PRIMARY GOAL
Deliver a clean, simple, international-level WMS that is fully editable, role-aware, and fast to learn. Every screen should guide users to the next action without clutter.

ERROR AUDIT & OPTIMIZATION
- Run a full TypeScript typecheck and resolve all errors.
- Scan for unused imports, dead code, and logic gaps, and remove them.
- Fix runtime bugs, guard edge cases, and add safe fallbacks.
- Optimize state updates and derived data using efficient algorithms and data structures.
- Prefer linear-time lookups with maps/sets, avoid repeated filtering in render loops.
- Keep code readable, modular, and deterministic.
- Run an ESLint sweep and address all findings.
- Validate the Expo web export build for Vercel.

NON-NEGOTIABLES
- No preloaded data. The database must start empty.
- First-run setup creates the first company and super admin.
- Super admin only can edit admin limitations and company-level access limits.
- Admins can manage only their company users and role access for their teams.
- All data is editable through UI workflows (create, update, and status changes).
- Codebase must stay under 100,000 lines total.

UX PRINCIPLES
- Reduce cognitive load: show only the minimum needed to complete the task.
- Prefer guided flows, inline editing, and clear empty states.
- Role-based gating is explicit and graceful: show view-only states with guidance.
- Clear hierarchy, consistent spacing, and predictable navigation.

VISUAL SYSTEM
- Premium typography, strong contrast, and refined spacing.
- Buttons are polished, with clear primary/secondary/ghost states.
- Cards and tables feel lightweight and modern, with subtle elevation.
- Use a calm, confident palette and avoid harsh or noisy visuals.

HARD REQUIREMENTS
- React Native + Expo (TypeScript) with Expo Router and web support.
- No TypeScript errors or unused imports.
- All screens accessible on mobile and web.
- Every action logs a timestamp in Asia/Kolkata.
- Logins and access changes are recorded in audit history.

ACCESS CONTROL
- Roles: SUPER_ADMIN, ADMIN, MANAGER, PLANNER, OPERATOR, VIEWER.
- Super admin can limit admin access to analytics, data, inventory edit, and other features.
- Company-level limits can only restrict permissions, never grant new ones.
- Users only see features and actions they are permitted to access.

CORE FEATURES
- Authentication and RBAC: email + password login, access gating.
- Master data: items, UOM, warehouses, locations, bins, suppliers, customers.
- Inventory control: stock by location, batch tracking, reserved/available/on-hand.
- Inbound: purchase orders, receiving, putaway.
- Transfers: inter-bin movement and cross-dock.
- Cycle counting: scheduled counts and status flow.
- Returns: RMA intake and disposition.
- QC inspections: log outcomes and advance status.
- Production: BOM, work orders, status flow.
- Procurement: purchase order status tracking.
- Analytics: KPI dashboard, empty states, and data-driven insights.
- Data Hub: import/export CSV for BOM and analytics.
- Audit log: immutable event trail for all key actions.

DATA MODEL
- Item, BOMLine, Warehouse, Location, Bin, InventoryBalance, WorkOrder,
  PurchaseOrder, SalesOrder, Transfer, CycleCount, ReturnRecord, QcInspection,
  AuditEvent, User, Role, Alert, KPI, Company, CompanyLimit.

QUALITY BAR
- No runtime crashes or visual glitches.
- Deterministic state updates and clear error handling.
- Empty states are helpful and actionable.
- Inputs are validated and trimmed.

DELIVERABLES
- Fully wired screens and navigation.
- Empty initial data with guided onboarding.
- Polished UI components and consistent styling.
- Clear role gating and edit permissions.
