// Browser-safe exports (the app's basic-phone preview uses these). The HTTP server is in server.ts.
export { handleUssd, type UssdRequest } from './ussd';
export { handleSms, parseSms, morningMessages, type SmsCommand } from './sms';
export { planText } from './messages';
export { MemoryStore, type Profile, type ProfileStore } from './store';
export { isGsm7, gsm7Length, SMS_MAX, USSD_MAX } from './gsm';
export type { Locale } from './i18n';
