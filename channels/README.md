# Basic-phone channel (USSD + SMS)

For farmers without a smartphone: about one in three connected devices in Kenya is a feature phone (Communications Authority of Kenya, June 2026). The same engine as the app, delivered over USSD and SMS: any GSM phone, 2G, no data bundle, no app.

| File | What |
|---|---|
| `src/ussd.ts` | USSD menu as a pure function (Africa's Talking convention: `text` = inputs joined by `*`; reply `CON …` / `END …`) |
| `src/sms.ts` | Inbound SMS commands in English and Kiswahili, the morning message for every farmer |
| `src/messages.ts` | Plan → one GSM-7 SMS (≤ 160 characters, tested for every golden scenario in both languages) |
| `src/server.ts` | HTTP gateway: `/ussd`, `/sms`, `/morning`, `/register`, `/forget`, `/health` |

```bash
npm run gateway                     # :4650, outgoing SMS go to channels/data/outbox.jsonl
AT_USERNAME=sandbox AT_API_KEY=… AGENT_TOKEN=… npm run gateway   # Africa's Talking sandbox
```

**Going live** needs things only the team can do: an aggregator account (e.g. Africa's Talking; sandbox is free), a USSD service code and SMS short code, a public HTTPS URL for the callbacks, and a 06:00 scheduler calling `POST /morning`. The `*384*123#` code in the app's simulator is illustrative.

**Data protection.** A basic phone can't compute, so this is the one part that runs on a server. It stores the minimum (phone number, plot inputs, language, consent time), refuses registration without `consent_at`, and deletes on `POST /forget`. `channels/data/` is git-ignored: it holds personal data.

**Same answer on every device.** The gateway plans with the same FAO-56 deficit source as the app (from the area pack's climatology, `AREA_PACK=…`); `test/channels.test.ts` pins that SMS, USSD and the app agree.
