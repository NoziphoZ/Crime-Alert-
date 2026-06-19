import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).defaultNow(),
})

export const crimeReports = pgTable('crime_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',
    }),
  isAnonymous: boolean('is_anonymous')
    .notNull()
    .default(false),
  fullName: text('full_name'),
  contactInfo: text('contact_info'),
  location: text('location').notNull(),
  incidentDateTime: timestamp('incident_date_time', {
    withTimezone: true,
  }).notNull(),
  typeOfIncident: text('type_of_incident').notNull(),
  priority: text('priority').notNull(),
  description: text('description').notNull(),
  witnesses: text('witnesses'),
  additionalInformation: text('additional_information'),
  evidenceUrl: text('evidence_url'),
  status: text('status')
    .notNull()
    .default('pending'),
})

// ── UPDATED EMERGENCY ALERTS SCHEMA ──
export const emergencyAlerts = pgTable('emergency_alerts', {
  id: uuid('id')
    .defaultRandom()
    .primaryKey(),
  userId: uuid('user_id').references(
    () => users.id,
    {
      onDelete: 'set null',
    }
  ),
  latitude: numeric('latitude', {
    precision: 10,
    scale: 7,
  }).notNull(),
  longitude: numeric('longitude', {
    precision: 10,
    scale: 7,
  }).notNull(),
  location: text('location'), // ← NEW: Human-readable address
  status: text('status')
    .notNull()
    .default('Received'), // ← Changed from 'Critical' to 'Received'
  priority: text('priority')
    .notNull()
    .default('Medium'), // ← NEW: Priority field
  isActive: boolean('is_active')
    .notNull()
    .default(true), // ← NEW: Active flag
  locationSource: text('location_source')
    .notNull()
    .default('unknown'), // ← NEW: Source of location (gps, ip, unknown)
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).defaultNow(), // ← NEW: Updated at timestamp
})

// ── TYPES FOR TYPE SAFETY ──
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type CrimeReport = typeof crimeReports.$inferSelect
export type NewCrimeReport = typeof crimeReports.$inferInsert
export type EmergencyAlert = typeof emergencyAlerts.$inferSelect
export type NewEmergencyAlert = typeof emergencyAlerts.$inferInsert

// ── ENUMS FOR VALIDATION ──
export const EmergencyStatus = {
  RECEIVED: 'Received',
  LOCATION_VERIFIED: 'Location Verified',
  UNIT_DISPATCHED: 'Unit Dispatched',
  UNIT_ARRIVED: 'Unit Arrived',
  CASE_RESOLVED: 'Case Resolved',
} as const

export type EmergencyStatusType = typeof EmergencyStatus[keyof typeof EmergencyStatus]

export const EmergencyPriority = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const

export type EmergencyPriorityType = typeof EmergencyPriority[keyof typeof EmergencyPriority]

export const LocationSource = {
  GPS: 'gps',
  IP: 'ip',
  UNKNOWN: 'unknown',
} as const

export type LocationSourceType = typeof LocationSource[keyof typeof LocationSource]

// ── HELPER FUNCTIONS ──
export const isValidStatus = (status: string): status is EmergencyStatusType => {
  return Object.values(EmergencyStatus).includes(status as EmergencyStatusType)
}

export const isValidPriority = (priority: string): priority is EmergencyPriorityType => {
  return Object.values(EmergencyPriority).includes(priority as EmergencyPriorityType)
}

export const isValidLocationSource = (source: string): source is LocationSourceType => {
  return Object.values(LocationSource).includes(source as LocationSourceType)
}