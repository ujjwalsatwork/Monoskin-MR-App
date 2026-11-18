/**
 * The one role this application is for.
 *
 * Matches the `Medical Representative` member of the ERP's `role` enum
 * (monoskin-erp/shared/schema.ts). The app is an MR tool: no other role has a
 * screen here, and several endpoints resolve "the current MR" from the session.
 */
export const MR_ROLE = 'Medical Representative';

/**
 * The single source of truth for "may this session use the app?" (MOB-01).
 *
 * Before, the role was compared with `!==` on exactly one screen, after the
 * session had already been established. This function is now applied on BOTH
 * entry paths — first sign-in and session restore — so the answer cannot differ
 * between them.
 *
 * Compared case- and whitespace-insensitively on purpose: a trailing space or a
 * casing change in an ERP seed must not silently admit a non-MR, but neither
 * should it lock out the entire field force. The comparison is still exact on the
 * role name itself — no prefix or substring matching.
 */
export const isMedicalRepresentative = (role: unknown): boolean =>
    typeof role === 'string' && role.trim().toLowerCase() === MR_ROLE.toLowerCase();
