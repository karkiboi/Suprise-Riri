# Riri's Midnight Surprise 🌷

A small Node/Express birthday site with a private URL, 12 hourly notes, a final proposal, and email notification for the response.

## Important behavior
- The birthday experience unlocks at **2026-12-17 00:00 Asia/Kathmandu (Nepal time)**.
- Note 1 unlocks at midnight; one new note unlocks at each hour, through 11:00 AM.
- The proposal appears after note 12 is opened.
- A response is saved to `data/responses.json` and an email is sent if SMTP settings are configured.
- This starter stores responses in a local JSON file. On Render, local files can be lost during redeploy/restart unless you attach a persistent disk. For reliable long-term storage, connect a database before launch.

## Deploy on Render
1. Create a new **Web Service** from this repository.
2. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
3. Add these environment variables:
   - `ACCESS_TOKEN`: long random secret (at least 24 characters; use 32+ random characters).
   - `NOTIFY_EMAIL`: the email address that should receive the answer.
   - `SMTP_HOST`: your email provider's SMTP host.
   - `SMTP_PORT`: usually `587` for STARTTLS or `465` for implicit TLS.
   - `SMTP_USER`: SMTP username.
   - `SMTP_PASS`: SMTP password or app password from the email provider.
   - `SMTP_SECURE`: `true` for port 465; otherwise `false`.
4. Deploy and test `https://YOUR-SERVICE.onrender.com/health`.
5. Share the private link: `https://YOUR-SERVICE.onrender.com/g/YOUR_ACCESS_TOKEN`.

## Email setup
Use an email provider that supports SMTP and follow its current app-password / SMTP instructions. Never put SMTP credentials in browser code or commit them to GitHub. Keep `ACCESS_TOKEN` private too.

## Before sharing
- Test the whole flow with a test token and test email.
- Confirm SMTP delivery.
- Set up persistent storage (Render persistent disk or a database) so a response is not lost on restart.
- Keep the private link private; anyone who has it can open the birthday page.
- The answer is one-time only. If you want to reset a test answer, remove the test response from the local JSON data file before production.
