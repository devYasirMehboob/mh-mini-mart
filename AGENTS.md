# MH Mini Mart — Codex Project Instructions

## 1. Project Identity

Project name: **MH Mini Mart**

MH Mini Mart is a simple, minimal, offline-first Point of Sale and management system for one physical bakery and mini-mart shop.

The system will run locally on a Windows computer using XAMPP. It does not require web hosting or a permanent internet connection.

Primary users:

* Admin
* Cashier

The application must prioritize:

* Fast billing
* Simple navigation
* Reliable stock handling
* Accurate sales records
* Easy receipt printing
* Clear reports
* Secure local operation
* Maintainable code

---

## 2. Technology Stack

### Frontend

* React.js
* Vite
* JavaScript
* React Router
* Axios
* Tailwind CSS

Do not add another UI framework unless explicitly requested.

Do not use Bootstrap.

Do not use TypeScript unless explicitly requested.

### Backend

* Core PHP
* PHP 8.1 or newer
* PDO
* REST-style JSON API
* PHP sessions for authentication
* Object-oriented architecture using classes and namespaces
* Controllers, services, and repositories with dependency injection where practical

Do not introduce Laravel, Symfony, CodeIgniter, or another PHP framework unless explicitly requested.

### Database

* MySQL
* InnoDB tables
* UTF-8 using `utf8mb4`
* Foreign keys where appropriate
* Database transactions for critical operations

### Local environment

Frontend development URL:

`http://localhost:5173`

Backend API URL:

`http://localhost/mh-mini-mart-api`

MySQL database name:

`mh_mini_mart`

Production frontend may eventually be built and served locally through Apache.

---

## 3. Repository Structure

Use the following general structure:

```text
mh-mini-mart/
├── AGENTS.md
├── README.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── backend/
│   ├── api/
│   ├── config/
│   ├── controllers/
│   ├── helpers/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── services/
│   ├── uploads/
│   └── index.php
│
└── database/
    ├── migrations/
    ├── seeds/
    └── schema.sql
```

Keep frontend and backend responsibilities separate.

Do not place SQL queries directly inside React code.

Do not mix HTML page rendering into API endpoints.

---

## 4. Development Workflow

Before making a significant change:

1. Inspect the existing repository structure.
2. Read relevant files before editing them.
3. Identify existing conventions and reusable components.
4. Provide a brief implementation plan.
5. Implement the smallest complete version of the feature.
6. Test or validate the changed behavior.
7. Review the diff for unrelated changes.
8. Summarize the files changed and any remaining concerns.

Do not rewrite unrelated files.

Do not perform large refactors unless they are necessary for the requested feature.

Do not delete working code without explaining why it must be replaced.

When requirements are slightly unclear, choose the simplest reasonable implementation that matches the existing architecture.

---

## 5. Implementation Order

Build the application in this order unless instructed otherwise:

### Phase 1 — Foundation

* React application setup
* PHP API setup
* MySQL connection
* Shared API response helpers
* Error handling
* Login
* Logout
* Current-user endpoint
* Protected frontend routes
* Role-based backend authorization
* Main application layout

### Phase 2 — Core management

* Categories CRUD
* Products CRUD
* Users and cashier accounts
* Product search
* Product status management
* Stock adjustments
* Stock transaction history

### Phase 3 — POS

* Product search
* Barcode input
* Category filters
* Cart
* Quantity controls
* Discounts
* Payment calculation
* Hold and resume sale
* Complete sale
* Stock reduction
* Receipt generation
* Basic browser printing

### Phase 4 — Business management

* Sales history
* Sale details
* Receipt reprinting
* Expenses
* Dashboard
* Reports
* Refund and cancellation workflow
* Activity logs

### Phase 5 — System features

* Shop settings
* Printer settings
* QZ Tray integration
* Manual backup
* Automatic backup
* Restore process
* CSV export

Do not implement advanced reporting or printer automation before the basic sale workflow is stable.

---

## 6. UI and Design Rules

The design must be:

* Simple
* Minimal
* Clean
* Fast
* Desktop-first
* Responsive enough for tablets
* Easy for non-technical shop staff

Use:

* Light gray application background
* White cards and panels
* One main accent color
* Clear typography
* Large POS buttons
* Visible totals
* Simple status badges
* Consistent spacing
* Subtle borders
* Minimal shadows
* Rounded corners between 8px and 12px

Avoid:

* Gradients
* Glassmorphism
* Excessive shadows
* Excessive animations
* Too many colors
* Decorative elements with no functional purpose
* Tiny controls
* Crowded layouts

Suggested Tailwind design tokens:

```js
export default {
  theme: {
    extend: {
      colors: {
        app: "#f6f7f9",
        surface: "#ffffff",
        border: "#e5e7eb",
        primary: "#111827",
      },
      borderRadius: {
        app: "10px",
      },
    },
  },
};
```

Use Tailwind utility classes for all frontend styling. Create reusable React components instead of repeating large blocks of markup.

---

## 7. React Coding Standards

Use functional React components and hooks.

Preferred component style:

```jsx
function ProductCard({ product, onAdd }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-gray-200 bg-white p-3 text-left"
      onClick={() => onAdd(product)}
    >
      <span>{product.name}</span>
      <strong>{product.formattedPrice}</strong>
    </button>
  );
}

export default ProductCard;
```

Rules:

* Keep pages focused on orchestration.
* Move reusable UI into `components`.
* Move API requests into `src/api`.
* Move reusable logic into hooks or utilities.
* Avoid deeply nested components.
* Avoid very large files.
* Use controlled form inputs.
* Give buttons an explicit `type`.
* Include loading, empty, success, and error states.
* Prevent duplicate form submissions.
* Use semantic HTML where practical.
* Use stable keys when rendering lists.
* Do not use array indexes as keys when records have IDs.
* Do not store derived values unnecessarily in state.
* Do not directly mutate state.

Use React Router for navigation.

Use Axios through one shared API client.

Do not repeat the API base URL throughout the application.

Store the API URL in an environment variable:

```env
VITE_API_BASE_URL=http://localhost/mh-mini-mart-api/api
```

---

## 8. Frontend API Convention

Use a shared Axios instance:

```js
import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

export default apiClient;
```

Frontend API modules should return normalized API data and allow the calling component to handle display messages.

Example:

```js
import apiClient from "./apiClient";

export async function getProducts(params = {}) {
  const response = await apiClient.get("/products", { params });
  return response.data;
}
```

Never silently ignore API errors.

Show safe, user-friendly error messages in the UI.

Do not display raw database or PHP errors to users.

---

## 9. PHP Coding Standards

Use:

* `declare(strict_types=1);`
* Object-oriented PHP using classes and namespaces
* Controllers for HTTP orchestration
* Services for business logic
* Repositories for data access
* Constructor-based dependency injection where practical
* PDO for the MySQL database connection
* PDO prepared statements for every database query
* Type declarations where practical
* Consistent JSON responses
* Clear separation between routing, validation, business logic, and data access
* HTTP status codes that match the result

Example PHP file header:

```php
<?php

declare(strict_types=1);
```

Do not use deprecated MySQL functions.

Do not concatenate untrusted values into SQL.

Do not expose stack traces, SQL statements, passwords, or internal paths in API responses.

Use a consistent response structure:

```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Unable to create the product.",
  "errors": {
    "name": ["Product name is required."]
  }
}
```

Use suitable status codes:

* `200` for successful reads and updates
* `201` for successful creation
* `204` where no response body is needed
* `400` for malformed requests
* `401` for unauthenticated requests
* `403` for unauthorized actions
* `404` for missing records
* `409` for conflicts such as duplicate barcodes
* `422` for validation errors
* `500` for unexpected server errors

---

## 10. Authentication and Authorization

Use password-only access with PHP sessions for local authentication.

Authentication requirements:

* The login screen contains only one password field and a Login button.
* Do not request a username or email on the login screen.
* Store the password securely using `password_hash()`.
* Verify the password using `password_verify()`.
* Session regenerated after successful login
* Logout destroys the session
* All backend API routes verify authentication, except the minimum authentication entry points required to establish a session.
* Backend permissions are authoritative
* Frontend route guards are only for user experience
* All protected React routes redirect unauthorized users to the login screen.
* Never hardcode the plain password in React or expose it through API responses.

Roles:

### Admin

The admin can access all modules.

### Cashier

The cashier can:

* Access POS
* Complete sales
* Print receipts
* View personal sales
* Reprint recent receipts

The cashier cannot:

* Change prices
* Delete products
* Manage users
* View profit reports
* Restore backups
* Cancel completed sales without permission

Never rely only on hidden frontend buttons for authorization.

Every restricted backend action must check the current user's role or permission.

---

## 11. Security Requirements

Every feature must consider:

* SQL injection prevention
* Cross-site scripting prevention
* CSRF protection for state-changing requests
* Session security
* Role authorization
* Server-side validation
* Output escaping
* File upload validation
* Duplicate submission prevention
* Sensitive error handling

For uploaded images:

* Verify MIME type
* Verify extension
* Limit file size
* Generate a safe random filename
* Store outside executable directories where possible
* Never trust the original filename

Do not store plain-text passwords.

Do not hardcode the plain access password in frontend code or return it from an API response.

Do not expose database credentials in the frontend.

Do not commit secrets or environment files containing credentials.

---

## 12. Database Rules

Use:

* InnoDB
* `utf8mb4`
* Foreign keys
* Indexes on commonly searched columns
* `DECIMAL` for money and quantities
* Timestamps for important records
* Soft status changes where audit history matters

Money fields should normally use:

```sql
DECIMAL(12, 2)
```

Stock quantities should normally use:

```sql
DECIMAL(12, 3)
```

Do not use JavaScript or PHP floating-point values as the source of truth for financial calculations.

Validate and calculate monetary totals on the backend.

Store historical sale values inside `sale_items`, including:

* Product name at sale time
* Unit selling price
* Purchase cost at sale time
* Discount
* Quantity
* Line total

This prevents later product edits from changing historical reports.

Completed sales must not be permanently deleted.

Use statuses such as:

* completed
* cancelled
* refunded

---

## 13. Critical Sale Transaction Rules

Completing a sale is a critical operation and must use one database transaction.

The transaction must:

1. Validate the request.
2. Validate that the user is authorized.
3. Re-read products from the database.
4. Validate product status.
5. Validate available stock.
6. Calculate trusted totals on the backend.
7. Generate a unique invoice number.
8. Insert the sale.
9. Insert all sale items.
10. Insert the payment record.
11. Reduce tracked stock.
12. Create stock transaction records.
13. Write an activity log.
14. Commit only when every operation succeeds.

On any failure:

* Roll back the full transaction.
* Do not leave partial sale records.
* Return a safe error response.

Use row locking where needed to prevent two requests from selling the same remaining stock:

```sql
SELECT id, quantity
FROM products
WHERE id = ?
FOR UPDATE
```

Never trust totals, prices, purchase costs, discounts, or product availability sent by the frontend without backend verification.

---

## 14. POS Rules

The POS page should be optimized for speed.

Desktop layout:

* Product area: approximately 65%
* Cart area: approximately 35%

Product area should contain:

* Search field
* Barcode input behavior
* Category filters
* Product cards
* Loading state
* No-results state
* Out-of-stock indication

Cart area should contain:

* Product name
* Unit price
* Quantity control
* Line total
* Remove action
* Subtotal
* Discount
* Tax when enabled
* Grand total
* Amount received
* Change returned
* Payment method
* Complete Sale button

POS behavior:

* Selecting the same product increases its quantity.
* Quantity cannot become zero or negative.
* Tracked products cannot exceed available stock.
* Untracked products may be sold without strict quantity checks.
* Cash payments require received amount to cover the payable amount.
* Non-cash payment behavior should remain configurable.
* The Complete Sale button must be disabled while submitting.
* A failed request must not clear the cart.
* A successful sale may clear the cart after receipt data is available.

Keyboard and barcode workflows should not be broken by unnecessary modal dialogs.

---

## 15. Inventory Rules

Every stock change must create a stock transaction record.

Stock transaction fields should include:

* Product ID
* User ID
* Transaction type
* Quantity
* Previous stock
* New stock
* Reason
* Related sale where applicable
* Date and time

Supported transaction types may include:

* opening
* addition
* sale
* manual reduction
* adjustment
* damaged
* expired
* wastage
* refund

Do not update product quantity without also recording why it changed.

---

## 16. Receipt Rules

Begin with browser printing using a dedicated receipt view and `window.print()`.

Receipt data must come from the saved sale, not directly from unsaved cart state.

Receipt content:

* MH Mini Mart name
* Address
* Phone number
* Invoice number
* Date and time
* Cashier
* Products
* Quantities
* Unit prices
* Line totals
* Subtotal
* Discount
* Tax where enabled
* Grand total
* Received amount
* Change
* Payment method
* Footer message
* Return policy

Support 80mm paper first.

Use Tailwind print utilities for receipt-specific print styling.

Hide navigation, actions, and non-receipt elements during printing.

Do not implement QZ Tray until browser receipt printing is working correctly.

---

## 17. Error Handling

Handle expected errors explicitly:

* Database connection failure
* Authentication failure
* Authorization failure
* Invalid input
* Duplicate product code
* Duplicate barcode
* Product not found
* Insufficient stock
* Invalid payment
* Sale transaction failure
* Printer failure
* Upload failure
* Backup failure

Backend errors should be logged safely.

Frontend errors should be understandable to shop staff.

Avoid vague UI messages such as “Something went wrong” when a more useful safe message is available.

Example:

“Chocolate Cake only has 2 pieces available.”

---

## 18. Validation Rules

Validate on both frontend and backend, but treat backend validation as authoritative.

Validate:

* Required fields
* Positive prices
* Valid stock quantities
* Unique product codes
* Unique barcodes when provided
* Valid role values
* Valid payment methods
* Valid discount values
* Valid date ranges
* Valid uploaded files
* Received amount for cash sales
* Product availability
* Duplicate invoice prevention

Frontend validation improves usability but must never replace backend validation.

---

## 19. Testing and Verification

After changing code:

### Frontend

* Run the configured lint command.
* Run the build command.
* Check for console errors.
* Test loading states.
* Test empty states.
* Test API failures.
* Test responsive behavior.
* Test keyboard interactions where relevant.

Typical commands:

```bash
npm run lint
npm run build
```

### Backend

* Run PHP syntax checks on changed files.
* Verify API status codes.
* Verify JSON response structure.
* Test validation errors.
* Test unauthorized access.
* Test database rollback behavior.

Example syntax check:

```bash
php -l path/to/file.php
```

### Database

* Confirm migrations are safe.
* Confirm foreign keys work.
* Confirm duplicate constraints work.
* Confirm indexes exist for frequently searched fields.
* Confirm failed sale transactions leave no partial records.

Do not claim a feature has been tested unless the relevant test or command was actually run.

When a test cannot be run, clearly state why.

---

## 20. Documentation Requirements

Update documentation when adding:

* Environment variables
* Installation steps
* Database migrations
* API routes
* External dependencies
* Printer setup
* Backup scripts
* New commands

The README should eventually include:

* Project requirements
* XAMPP setup
* Frontend installation
* Backend configuration
* Database import or migration steps
* Development commands
* Default local URLs
* Printer setup
* Backup setup

Never place real production credentials in documentation.

---

## 21. Response Format for Coding Tasks

When completing a coding task, report:

1. What was implemented.
2. Important design decisions.
3. Files added or changed.
4. Commands or tests run.
5. Any remaining limitation or next logical step.

Keep explanations focused.

Do not paste every changed file into the response unless requested.

Make actual repository edits when authorized instead of only describing hypothetical code.

---

## 22. Current MVP Goal

The first complete working flow is:

```text
Login
→ Manage categories
→ Manage products
→ Adjust stock
→ Open POS
→ Add products to cart
→ Accept payment
→ Complete sale
→ Reduce stock
→ Save stock history
→ Print receipt
→ View sale history
```

Prioritize this flow over optional features.

The first version should support:

* One shop
* One local computer
* Admin and cashier accounts
* Products and categories
* POS billing
* Stock management
* Basic receipt printing
* Sales history
* Expenses
* Basic reports
* Local backups

Do not prematurely optimize for multiple branches, cloud synchronization, online ordering, or mobile applications.

---

## 23. Definition of Done

A feature is complete only when:

* It follows the existing architecture.
* It has server-side validation.
* It enforces authorization.
* It handles loading and errors.
* It does not expose sensitive information.
* It does not introduce unrelated changes.
* Relevant lint, build, syntax, or test commands pass.
* The feature is documented when setup changes are required.
* The implementation is usable by non-technical bakery staff.
