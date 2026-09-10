export type CookieConsentPreferences = {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_NAME = "dukaos_cookie_consent";

const defaultPreferences: CookieConsentPreferences = {
  essential: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

function getRuntimeCookieValue(): string | null {
  if (typeof document !== "undefined") {
    const cookieEntry = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${COOKIE_NAME}=`));

    if (cookieEntry) {
      return decodeURIComponent(cookieEntry.slice(COOKIE_NAME.length + 1));
    }
  }

  const storeValue = (globalThis as typeof globalThis & {
    __DUKAOS_COOKIE_CONSENT__?: string;
  }).__DUKAOS_COOKIE_CONSENT__;

  return storeValue ?? null;
}

export function getCookieConsent(): CookieConsentPreferences | null {
  const storedValue = getRuntimeCookieValue();

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<CookieConsentPreferences>;
    return { ...defaultPreferences, ...parsed };
  } catch {
    return null;
  }
}

export function setCookieConsent(preferences: CookieConsentPreferences) {
  const nextValue = JSON.stringify({ ...defaultPreferences, ...preferences });

  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(nextValue)}; path=/; max-age=31536000; SameSite=Lax`;
    return;
  }

  (globalThis as typeof globalThis & {
    __DUKAOS_COOKIE_CONSENT__?: string;
  }).__DUKAOS_COOKIE_CONSENT__ = nextValue;
}
