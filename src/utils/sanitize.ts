// ─────────────────────────────────────────────────────────────────────────────
// Turning server-supplied text into something safe to put in a file path (MOB-07).
//
// Asset titles come from the ERP's content-management side, and the download code
// built a filename straight out of one — replacing spaces, but nothing else. A
// title containing `../` therefore wrote the file outside the Monoskin downloads
// folder, and a title containing `/` split the path. The realistic attacker is an
// internal user with content rights, which is exactly the insider case worth
// defending against.
//
// The rule applied here is allow-list, not deny-list: anything outside a known-safe
// character set is replaced, so a traversal sequence expressed in some encoding
// nobody thought of still cannot survive.
// ─────────────────────────────────────────────────────────────────────────────

/** Keep filenames comfortably inside every filesystem limit, extension included. */
const MAX_BASE_LENGTH = 80;

/** Reserved on Windows/SMB shares an MR might copy a brochure onto. */
const RESERVED_NAMES = new Set([
    'con', 'prn', 'aux', 'nul',
    'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
    'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Reduce arbitrary text to a single safe path segment.
 *
 * Guarantees about the result: it contains no path separator, no `..`, no control
 * or leading-dot character, is never empty, and is never a reserved device name.
 * It is a segment only — it can never be interpreted as a path.
 */
export const safeFileSegment = (raw: unknown, fallback = 'file'): string => {
    const text = typeof raw === 'string' ? raw : '';

    let out = text
        // Normalise so composed/decomposed forms collapse before filtering.
        .normalize('NFKC')
        // Allow-list: letters, digits, space, dot, dash, underscore. Everything
        // else — separators, control characters, quotes, colons — becomes '_'.
        .replace(/[^A-Za-z0-9 ._-]/g, '_')
        .replace(/\s+/g, '_')
        // Collapse every remaining dot run, which is what kills `..` without
        // needing to reason about how many dots an attacker chained together.
        .replace(/\.{2,}/g, '_')
        // A leading dot hides the file on POSIX and can confuse extension parsing.
        .replace(/^[.\-_]+/, '')
        .replace(/[.\-_]+$/, '')
        .slice(0, MAX_BASE_LENGTH);

    if (RESERVED_NAMES.has(out.toLowerCase())) { out = `${out}_file`; }

    return out.length > 0 ? out : fallback;
};

/**
 * Build the on-disk name for a downloaded asset.
 *
 * The numeric id is appended by the caller's convention and is what actually makes
 * the name unique — the title is only there so the file is recognisable in the
 * Files app or the Downloads folder. Both the title and the extension are treated
 * as untrusted, because both arrive from the server.
 */
export const safeAssetFileName = (title: unknown, id: number, fileType: unknown): string =>
    `${safeFileSegment(title, 'asset')}_${id}.${safeFileExtension(fileType)}`;

/**
 * Reduce a server-supplied file type (`PDF`, `mp4`, …) to a bare lowercase
 * extension: letters and digits only, at most 8 characters, `bin` when nothing
 * usable is left. Shared by every place that turns `fileType` into a path, so a
 * cache file and a download can never disagree about the extension.
 */
export const safeFileExtension = (fileType: unknown): string =>
    safeFileSegment(typeof fileType === 'string' ? fileType.toLowerCase() : '', 'bin')
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 8) || 'bin';
