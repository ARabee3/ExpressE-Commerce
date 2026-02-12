# 🛠️ Development Guidelines

This document outlines the workflow and coding standards for our Node.js/Express e-commerce project. Adhering to these rules is mandatory to ensure we meet all project requirements within our 5-day sprint.

## 1. Git Workflow & Collaboration

- **Feature Branches:** Never push directly to `main`. Create a branch for every task
  - Format: `feat/feature-name` or `fix/issue-name`.
- **Pull Requests:** Before merging to `master`, a PR must be opened and reviewed by at least one other team member.
- **Daily Sync:** Always `git pull origin master` before starting your work to avoid merge conflicts.

## 2. Global Error Handling (Mandatory)

Ahmed has implemented a global error handling system using `catchAsync` and an `AppError` class. **Do not use try/catch blocks in your controllers.** ### **How to use it:**

#### **A. For Operations (catchAsync)**

Wrap your entire controller function in `catchAsync`. This automatically catches any rejected promises and passes the error to the global handler.

```javascript
import { catchAsync } from "../../Utils/catchAsync.js";

export const createProduct = catchAsync(async (req, res, next) => {
  const product = await Product.create(req.body);
  res.status(201).json({ status: "success", data: product });
});
```

#### **B. For Custom Errors (AppError)**

When you need to trigger a specific error (e.g., 404 Not Found), use `next(new AppError(message, statusCode))`.

```javascript
import AppError from "../../Utils/AppError.js";

export const getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({ status: "success", data: product });
});
```

---

## 3. Database & Business Logic Rules

- **Soft Deletes:** Admin must "approve/restrict users" via soft delete. Do not delete user records; set an `isActive: false` or `isDeleted: true` flag.

- **Order Integrity:** In the `Order` model, you must **snapshot** the product price and title. Do not rely on references for historical data, as prices may change after the order is placed.

- **Stock Management:** Every successful order must decrement the `stockQuantity` of the purchased products.

- **Roles:** Use the authentication middleware to restrict access based on roles: `Customer`, `Seller`, and `Admin`.

## 4. Requirement Checklist per Module

- **User (Ahmed):** Registration, Login, Social Auth (bonus), and Email Confirmation.

- **Product (Sohayla):** CRUD, Categories, Image uploads, and Search/Filtering.

- **Cart & Checkout (Youssef):** Quantity adjustments, total price breakdowns, and Guest Checkout.

- **Orders & Admin (Mostafa):** Order tracking, status updates, and user restriction.

---

## 5. Definition of Done

A feature is only considered "Done" if:

1. It is documented in the code.
2. It uses the `AppError` and `catchAsync` patterns.
3. It has been tested in Postman and returns correct HTTP status codes (200, 201, 400, 404, etc.).
4. A README update is provided if setup steps have changed.
