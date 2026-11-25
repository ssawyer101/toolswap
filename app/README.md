# ToolSwap

Lend and borrow tools with people you trust. Each person has a **garage** of tools and shares each tool with the **groups** they choose (church group, car club, riding club). Members search the groups they belong to, add tools to a **basket** that shows which lender covers the most in one trip, and send requests. **Loans** track who has what, due dates, and returns. Reminders go out as phone notifications.

## What's in version 1

- **Accounts:** sign up, log in, log out, forgot password by email link, change password, profile with name and neighborhood
- **Groups:** create a group, invite by code, admin approves join requests, make admins, take people out, leave, replace the invite code
- **Garage:** add and edit tools with a photo (shrunk automatically), value, description, "good to know" quirks, product link and how-to video. Choose which groups see each tool, pause lending, take a tool out (its loan history is kept)
- **Find tools:** search across your groups or one group. Shows availability and booked dates
- **Basket:** grouped by lender, sorted by how much of your list each lender covers. One request per lender with pick-up date, return date and a note
- **Loans:** approve or decline, picked up, returned, owner confirms it's back (or says it isn't). Ask for more time / approve it. The owner can set a "need it back by" date. Send a friendly reminder. A message thread on every loan. History. A tool can't be double-booked for overlapping dates
- **Notifications:** an in-app Alerts page plus push notifications to phones and computers. Automatic reminders: pick-up day, 2 days before due, due today, and overdue (the borrower daily, the owner on day 1 and every 3 days)
- **Installable:** works as a home-screen app on phones (needed for push on iPhone)

Planned for later: security deposits, ratings, a waitlist for busy tools, reporting and blocking users, native app-store apps.

## Running it on your own computer (for a developer)

Needs Node.js 20+ and PostgreSQL.

```bash
cp .env.example .env              # then fill in DATABASE_URL
npm install
npm run vapid                     # paste the two keys it prints into .env
npx prisma migrate deploy
npm run seed                      # optional: example people and tools, password toolswap123
npm run build && npm start        # http://localhost:3000
```

Without `RESEND_API_KEY`, password-reset emails are printed in the server log instead of being sent.

## Settings (`.env`)

| Setting | What it's for |
|---|---|
| `DATABASE_URL` | Where the PostgreSQL database is |
| `APP_URL` | The public web address, used in reset-password emails |
| `APP_TIMEZONE` | Decides when "today" starts for due dates, e.g. `America/Chicago` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT` | Push notification keys (`npm run vapid` makes them) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sends forgot-password emails through resend.com |

## Hosting

The app is one long-running server plus a PostgreSQL database. Reminders run inside the server every 30 minutes, so it needs a host that keeps the server running (Railway, Render, or Fly.io, for example), not a "serverless" host. The start command runs any pending database updates first.
