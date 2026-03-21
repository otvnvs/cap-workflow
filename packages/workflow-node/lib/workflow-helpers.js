'use strict';

const cds = require('@sap/cds');

const VALID_STATUSES = new Set([
  'NOT_STARTED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'CANCELLED',
])

// ─── Shared helpers ───────────────────────────────────────────────────────────

function validateEntityRef(entityRef) {
  if (!entityRef?.entityName) {
    throw Object.assign(
      new Error('entityRef.entityName is required'),
      { code: 'INVALID_ENTITY_REF' }
    )
  }
  if (!entityRef?.keys || Object.keys(entityRef.keys).length === 0) {
    throw Object.assign(
      new Error('entityRef.keys is required and must not be empty'),
      { code: 'INVALID_ENTITY_REF' }
    )
  }
}

async function fetchEntity(db, entityName, keys) {
  const existing = await db.run(SELECT.one.from(entityName).where(keys))
  if (!existing) {
    throw Object.assign(
      new Error(`Entity '${entityName}' with keys ${JSON.stringify(keys)} not found`),
      { code: 'ENTITY_NOT_FOUND' }
    )
  }
  return existing
}

// ─── start(entityRef, options) ────────────────────────────────────────────────
// Sets workflowStatus = IN_PROGRESS, workflowInitiatedBy, workflowInitiatedAt.

async function start(entityRef, options = {}) {
  validateEntityRef(entityRef)

  const { entityName, keys } = entityRef
  const initiatedBy = options.initiatedBy ?? cds.context?.user?.id ?? 'system'
  const initiatedAt = new Date().toISOString()

  const db       = await cds.connect.to('db')
  const existing = await fetchEntity(db, entityName, keys)

  // Idempotent — already started, return current state
  if (existing.workflowStatus === 'IN_PROGRESS') {
    return {
      entityName,
      keys,
      workflowStatus:      existing.workflowStatus,
      workflowInitiatedBy: existing.workflowInitiatedBy,
      workflowInitiatedAt: existing.workflowInitiatedAt,
    }
  }

  await db.run(
    UPDATE(entityName)
      .set({ workflowStatus: 'IN_PROGRESS', workflowInitiatedBy: initiatedBy, workflowInitiatedAt: initiatedAt })
      .where(keys)
  )

  return { entityName, keys, workflowStatus: 'IN_PROGRESS', workflowInitiatedBy: initiatedBy, workflowInitiatedAt: initiatedAt }
}

// ─── setDueDate(entityRef, dueDate) ───────────────────────────────────────────
// Updates only workflowDueDate. dueDate must be an ISO string or Date.

async function setDueDate(entityRef, dueDate) {
  validateEntityRef(entityRef)

  if (!dueDate) {
    throw Object.assign(
      new Error('dueDate is required'),
      { code: 'INVALID_DUE_DATE' }
    )
  }

  const { entityName, keys } = entityRef
  const dueDateIso = dueDate instanceof Date ? dueDate.toISOString() : String(dueDate)

  const db = await cds.connect.to('db')
  await fetchEntity(db, entityName, keys)

  await db.run(
    UPDATE(entityName)
      .set({ workflowDueDate: dueDateIso })
      .where(keys)
  )

  return { entityName, keys, workflowDueDate: dueDateIso }
}

// ─── assignOwner(entityRef, ownerId) ──────────────────────────────────────────
// Updates only workflowOwner.

async function assignOwner(entityRef, ownerId) {
  validateEntityRef(entityRef)

  if (!ownerId) {
    throw Object.assign(
      new Error('ownerId is required'),
      { code: 'INVALID_OWNER' }
    )
  }

  const { entityName, keys } = entityRef

  const db = await cds.connect.to('db')
  await fetchEntity(db, entityName, keys)

  await db.run(
    UPDATE(entityName)
      .set({ workflowOwner: String(ownerId) })
      .where(keys)
  )

  return { entityName, keys, workflowOwner: String(ownerId) }
}

// ─── transition(entityRef, status, substatus?) ────────────────────────────────
// Validates the platform enum and updates workflowStatus + optionally workflowSubstatus.

async function transition(entityRef, status, substatus) {
  validateEntityRef(entityRef)

  if (!status) {
    throw Object.assign(
      new Error('status is required'),
      { code: 'INVALID_STATUS' }
    )
  }

  if (!VALID_STATUSES.has(status)) {
    throw Object.assign(
      new Error(`Invalid workflowStatus '${status}'. Must be one of: ${[...VALID_STATUSES].join(', ')}`),
      { code: 'INVALID_STATUS' }
    )
  }

  const { entityName, keys } = entityRef

  const db       = await cds.connect.to('db')
  const existing = await fetchEntity(db, entityName, keys)

  // Idempotent — already in this status with same substatus
  if (existing.workflowStatus === status && existing.workflowSubstatus === (substatus ?? existing.workflowSubstatus)) {
    return {
      entityName,
      keys,
      workflowStatus:    existing.workflowStatus,
      workflowSubstatus: existing.workflowSubstatus,
    }
  }

  const patch = { workflowStatus: status }
  if (substatus !== undefined) patch.workflowSubstatus = substatus

  await db.run(
    UPDATE(entityName)
      .set(patch)
      .where(keys)
  )

  return {
    entityName,
    keys,
    workflowStatus:    status,
    workflowSubstatus: substatus ?? existing.workflowSubstatus,
  }
}

module.exports = { start, setDueDate, assignOwner, transition, VALID_STATUSES }
