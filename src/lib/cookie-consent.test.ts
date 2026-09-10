import { afterEach, describe, expect, it } from "vitest";
import { getCookieConsent, setCookieConsent, type CookieConsentPreferences } from "./cookie-consent";

describe("cookie consent persistence", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __DUKAOS_COOKIE_CONSENT__?: string }).__DUKAOS_COOKIE_CONSENT__;
    if (typeof document !== "undefined") {
      document.cookie = "dukaos_cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    }
  });

  it("stores and reads a consent selection from a first-party cookie", () => {
    const preferences: CookieConsentPreferences = {
      essential: true,
      preferences: false,
      analytics: true,
      marketing: false,
    };

    setCookieConsent(preferences);

    expect(getCookieConsent()).toEqual(preferences);
  });

  it("returns null when no consent cookie has been stored", () => {
    expect(getCookieConsent()).toBeNull();
  });
});
