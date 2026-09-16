import { Alert, Linking } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// The one way this app hands a value to the operating system to open (MOB-08).
//
// Ten call sites used to interpolate a stored value straight into `Linking.openURL`
// — `tel:${item.phone}`, `mailto:${lead.email}`, `whatsapp://send?phone=${...}`.
// Those values come from the ERP, and the app assumed they were plain phone numbers
// and addresses. A record whose "phone" field held `x&url=…` or a different scheme
// entirely would make the handset open something else: an arbitrary app, or a web
// page, at a tap the representative believes is a phone call.
//
// The defence is not to escape the value but to REBUILD the URL from validated
// parts. Nothing the server sends is ever concatenated into a URL as-is: a phone
// number is reduced to digits, an address is matched against a strict pattern, and
// anything that fails is refused with a message rather than opened.
// ─────────────────────────────────────────────────────────────────────────────

/** E.164 allows 15 digits; 5 is shorter than any real dialable number. */
const MIN_PHONE_DIGITS = 5;
const MAX_PHONE_DIGITS = 15;

/**
 * Deliberately stricter than the RFC: no quoted local parts, no comment syntax,
 * no bare IP hosts — none of which appear in a doctor record, and all of which are
 * where mailto parsing surprises live.
 */
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})+$/;

/**
 * Reduce anything to the digits of a dialable number.
 *
 * Keeps a single leading `+` because Indian numbers are stored both as
 * `+919812345678` and `9812345678`. Everything else — `,` and `;` pause
 * characters, `#` and `*`, DTMF sequences, whitespace, and every character that
 * could carry a second scheme or a query string — is dropped, so the result can
 * only ever be a number.
 */
export const toDialableNumber = (raw: unknown): string | null => {
    if (typeof raw !== 'string' && typeof raw !== 'number') { return null; }
    const text = String(raw).trim();
    const hasPlus = text.startsWith('+');
    const digits = text.replace(/\D/g, '');
    if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) { return null; }
    return hasPlus ? `+${digits}` : digits;
};

/** Digits only — WhatsApp's `phone` parameter rejects a `+` anyway. */
export const toWhatsAppNumber = (raw: unknown): string | null => {
    const dialable = toDialableNumber(raw);
    return dialable ? dialable.replace(/\D/g, '') : null;
};

export const toValidEmail = (raw: unknown): string | null => {
    if (typeof raw !== 'string') { return null; }
    const text = raw.trim();
    if (text.length > 254 || !EMAIL_PATTERN.test(text)) { return null; }
    return text;
};

/**
 * True when a record simply has no value in this field.
 *
 * These callers used to be guarded with `value && Linking.openURL(...)`, so an
 * absent phone or email did nothing at all. That silence is preserved: an alert is
 * for a value that IS present and fails validation, which is worth explaining. A
 * missing one is an empty field, not an error, and a lead with no email should not
 * scold the representative for tapping the button.
 */
const isAbsent = (raw: unknown): boolean =>
    raw == null || (typeof raw === 'string' && raw.trim() === '');

/**
 * Open a URL this app built itself.
 *
 * Private on purpose: every exported helper below constructs its own URL from
 * validated parts, so no caller can reach `Linking.openURL` with a server value.
 * The catch matters as well as the validation — `openURL` rejects when no app can
 * handle the scheme (no WhatsApp installed, no mail account configured), and those
 * rejections were previously unhandled.
 */
const openBuiltUrl = async (url: string, whenUnavailable: string): Promise<boolean> => {
    try {
        await Linking.openURL(url);
        return true;
    } catch (err) {
        console.log('🚀 ~ openBuiltUrl ~ failed:', url, err);
        Alert.alert('Unavailable', whenUnavailable);
        return false;
    }
};

/** Place a call. Returns false, with an explanation, if the number is unusable. */
export const openPhoneNumber = async (raw: unknown): Promise<boolean> => {
    if (isAbsent(raw)) { return false; }
    const number = toDialableNumber(raw);
    if (!number) {
        Alert.alert('Invalid number', 'This contact does not have a valid phone number.');
        return false;
    }
    return openBuiltUrl(`tel:${number}`, 'This device cannot place calls.');
};

/** Compose an email. */
export const openEmailAddress = async (raw: unknown): Promise<boolean> => {
    if (isAbsent(raw)) { return false; }
    const email = toValidEmail(raw);
    if (!email) {
        Alert.alert('Invalid address', 'This contact does not have a valid email address.');
        return false;
    }
    // Not percent-encoded. `toValidEmail` has already refused every character that
    // could end the address or open a query (`?`, `&`, `#`, `/`, `:`), so the
    // address goes in as-is. Encoding it only turned `@` into `%40`, which then
    // depended on every mail app decoding it before filling the To: field.
    return openBuiltUrl(`mailto:${email}`, 'No email app is set up on this device.');
};

/** Open a WhatsApp chat. */
export const openWhatsAppNumber = async (raw: unknown): Promise<boolean> => {
    if (isAbsent(raw)) { return false; }
    const number = toWhatsAppNumber(raw);
    if (!number) {
        Alert.alert('Invalid number', 'This contact does not have a valid WhatsApp number.');
        return false;
    }
    return openBuiltUrl(
        `whatsapp://send?phone=${number}`,
        'WhatsApp is not installed on this device.',
    );
};

/**
 * Hand a destination to the platform maps app.
 *
 * Takes coordinates rather than a URL so there is no string for a caller to
 * smuggle a scheme into, and rejects anything outside real latitude/longitude
 * range — which also catches `undefined` arriving as `NaN`.
 */
export const openNavigationTo = async (
    lat: unknown,
    lng: unknown,
    platform: 'ios' | 'android',
): Promise<boolean> => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const valid =
        Number.isFinite(latitude) && Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

    if (!valid) {
        Alert.alert('Unavailable', 'This stop does not have usable coordinates.');
        return false;
    }

    const url =
        platform === 'ios'
            ? `maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`
            : `google.navigation:q=${latitude},${longitude}`;

    return openBuiltUrl(url, 'No maps app is available on this device.');
};
