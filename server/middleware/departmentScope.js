'use strict';

/**
 * departmentScope.js
 *
 * Centralises all department-based access-control logic for tickets and documents.
 *
 * Key concepts
 * ─────────────
 * ownerDepartment  — the department that OWNS the ticket (ticket.ownerDepartment
 *                    or ticket.department for back-compat).  Never changes after
 *                    creation.
 * sharedWith       — array of { department, sharedBy, sharedAt, reason } entries
 *                    added by the owner when they need assistance.
 *
 * Three distinct permission levels for a non-Admin officer:
 *   OWNER       — belongs to the owner department  → full workflow access
 *   COLLABORATOR — belongs to a sharedWith dept     → read + add internal notes
 *   NONE         — unrelated dept                   → 403 / invisible
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Return the canonical owner-department string for a resource.
 * Handles both Ticket objects (ownerDepartment || department) and plain
 * department strings (legacy callers).
 */
function ownerDeptOf(resource) {
  if (typeof resource === 'string') return resource;
  if (resource && typeof resource === 'object') {
    return resource.ownerDepartment || resource.department || null;
  }
  return null;
}

/**
 * Return true if the user's department is in the ticket's sharedWith list.
 */
function isInSharedWith(user, resource) {
  if (!user?.department || !resource?.sharedWith) return false;
  return resource.sharedWith.some((s) => s.department === user.department);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * isOwnerDepartment(user, resource)
 *
 * Returns true when the user is Admin OR belongs to the owner department.
 * Collaborating (sharedWith) departments return false.
 *
 * Use this to gate: resolve, close, change status, assign, share/unshare.
 */
function isOwnerDepartment(user, resource) {
  if (user?.role === 'Admin') return true;
  if (!user?.department) return false;
  return user.department === ownerDeptOf(resource);
}

/**
 * canAccessDepartment(user, resource)
 *
 * Returns true when the user may VIEW the resource at all.
 * This includes both owners AND collaborators.
 *
 * Use this to gate: GET ticket, GET document, add internal note.
 */
function canAccessDepartment(user, resource) {
  if (user?.role === 'Admin') return true;
  if (!user?.department) return false;

  // Legacy string call (e.g. canAccessDepartment(user, 'Finance'))
  if (typeof resource === 'string') {
    return user.department === resource;
  }

  if (!resource || typeof resource !== 'object') return false;

  // Owner check
  if (user.department === ownerDeptOf(resource)) return true;

  // Collaborator check (in sharedWith list)
  if (isInSharedWith(user, resource)) return true;

  // Document-level: sharedWith may be an array of department strings
  if (Array.isArray(resource.sharedWith)) {
    // Object-style sharedWith (Ticket)
    if (resource.sharedWith.some((s) => s?.department === user.department)) return true;
    // String-style sharedWith (Document)
    if (resource.sharedWith.includes(user.department)) return true;
  }

  return false;
}

/**
 * departmentFilter(user, extraFilter)
 *
 * Builds a Mongoose query filter scoped to the authenticated user's access.
 *
 * Admin   → no restriction (returns extraFilter as-is)
 * Officer → $or: own department  OR  in sharedWith.department  OR  requester (own submissions)
 * Viewer  → only documents they uploaded
 *
 * Never trusts a client-supplied department string.
 * Fails closed when user.department is missing.
 */
function departmentFilter(user, filter = {}) {
  if (user?.role === 'Admin') return { ...filter };

  // Viewer users (employees/requesters) can only see documents they uploaded
  if (user?.role === 'Viewer') {
    return {
      ...filter,
      uploadedBy: user.id,
    };
  }

  // Fail-closed: no department = no results
  if (!user?.department) return { ...filter, _id: null };

  // Officers can see: their department work + their own submissions
  return {
    ...filter,
    $or: [
      { department:              user.department },
      { ownerDepartment:         user.department },
      { 'sharedWith.department': user.department },
      { requester:               user.id }, // Allow officers to see their own submissions
    ],
  };
}

/**
 * accessLevel(user, resource)
 *
 * Returns a string describing the user's access level to a resource.
 * Useful for the frontend annotation (_isShared).
 *
 * Returns: 'admin' | 'owner' | 'collaborator' | 'none'
 */
function accessLevel(user, resource) {
  if (user?.role === 'Admin') return 'admin';
  if (!user?.department) return 'none';
  if (user.department === ownerDeptOf(resource)) return 'owner';
  if (canAccessDepartment(user, resource)) return 'collaborator';
  return 'none';
}

/**
 * isRequester(user, resource)
 *
 * Returns true when the user is the original requester/submitter of the resource.
 * Used to allow requesters to view their own submissions even if processed by another dept.
 */
function isRequester(user, resource) {
  if (!user?.id || !resource) return false;
  const requesterId = resource.requester?._id?.toString?.() ?? resource.requester?.toString?.();
  return user.id === requesterId;
}

/**
 * isAssignedOfficer(user, ticket)
 *
 * Returns true when the user is Admin, OR is the specific officer assigned
 * to this ticket (ticket.assignedTo._id === user.id).
 *
 * When a ticket is UNASSIGNED (assignedTo = null), any owner-dept officer
 * may act — the ticket has not been locked to a specific person yet.
 *
 * Use this to gate: resolve, updateStatus, share/unshare, addInternalNote
 * (for owner-dept actions).
 */
function isAssignedOfficer(user, ticket) {
  if (user?.role === 'Admin') return true;
  // Unassigned ticket — any owner-dept officer may act
  if (!ticket?.assignedTo) return isOwnerDepartment(user, ticket);
  // Assigned ticket — only the assigned officer (or Admin) may act
  const assignedId = ticket.assignedTo?._id?.toString?.() ?? ticket.assignedTo?.toString?.();
  return user?.id === assignedId;
}

module.exports = {
  ownerDeptOf,
  canAccessDepartment,
  departmentFilter,
  accessLevel,
  isOwnerDepartment,
  isAssignedOfficer,
  isRequester,
};
