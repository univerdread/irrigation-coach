import type { FarmInput } from '@irrigation-coach/engine';
import type { Locale } from './i18n';

/**
 * One registered farmer on the basic-phone channel. Registered by a pump dealer or extension
 * officer with the farmer's consent (Kenya Data Protection Act 2019); the farmer can ask for
 * deletion at any time. Holds only what the coach needs.
 */
export interface Profile {
  phone: string;
  locale: Locale;
  farm: FarmInput;
  consent_at: string;
}

export interface ProfileStore {
  get(phone: string): Profile | null;
  put(p: Profile): void;
  all(): Profile[];
  delete(phone: string): void;
}

export class MemoryStore implements ProfileStore {
  private m = new Map<string, Profile>();
  get(phone: string) {
    return this.m.get(phone) ?? null;
  }
  put(p: Profile) {
    this.m.set(p.phone, structuredClone(p));
  }
  all() {
    return [...this.m.values()];
  }
  delete(phone: string) {
    this.m.delete(phone);
  }
}
