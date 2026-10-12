# Security Specification for IT Helpdesk & Computer Inventory

## 1. Data Invariants
1. A support ticket must have valid required fields (ticketNumber, title, description, category, priority, status, requesterEmail).
2. A computer asset must have a unique non-empty assetTag and serialNumber, along with brand, model, and valid status.
3. Employees, companies, and departments must maintain structural consistency; an employee cannot reference a non-existent company or role.
4. Role-based privilege separation:
   - Admin: Read/Write all collections (users, admins, companies, departments, employees, computers, tickets, comments).
   - IT Technician: Read all organizational data; Create/Update/Read tickets and computers; Create comments.
   - Employee: Read own tickets (`requesterId == auth.uid` or `requesterEmail == auth.token.email`); Read assigned devices (`assignedEmployeeId == employee.id` or matching email); Create own tickets.
5. All records must contain valid audit timestamps (`createdAt`, `updatedAt`).
6. Document IDs must conform to `isValidId(id)` pattern with maximum length constraints.

## 2. The "Dirty Dozen" Payloads (Must be Denied)
1. Unauthenticated write to `/tickets/{id}`.
2. Employee attempting to delete or overwrite another employee's ticket.
3. Employee attempting to delete or mutate computer inventory hardware records.
4. Non-admin attempting to write to `/admins/{id}` to escalate privileges.
5. Ticket creation with missing `requesterEmail` or oversized description (> 5000 chars).
6. Computer creation with empty `assetTag` or invalid status enumeration.
7. Spoofed admin write where `email_verified` is false or user email does not match admin credentials.
8. Injection of arbitrary ghost keys or shadow updates on company/department entities.
9. Attempt to forge `createdAt` with arbitrary past or future timestamp bypassing `request.time`.
10. Unauthenticated read of sensitive company or employee directory records.
11. Employee viewing all support tickets across other corporate organizations when not an admin or technician.
12. Technician attempting to drop company records or delete admin records.

## 3. Test Runner Invariant
The security rules enforce default-deny, authenticated requests with valid verified status, role validations via `/admins/` and `/users/` documents, and field boundaries.
