# FinTrack

FinTrack is a personal finance tracker built with Next.js, React, TypeScript, Tailwind CSS and Supabase.

## Features

- Email/password sign-up and sign-in with protected app routes
- Dashboard with account balances, monthly income/expenses, expense trends and recent activity
- Transaction creation, editing, deletion, filtering and search
- Accounts and wallets
- Custom income and expense categories
- Monthly category budgets and progress tracking
- Savings goals with target dates, progress, create/edit/delete
- Analytics with six-month income/expense trends, spending by category and all-time totals
- Profile settings, preferred currency and sign-out
- Responsive sidebar and layouts for desktop and smaller screens

## Local setup

1. Install Node.js 22 or later.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and **publishable key**.
4. In Supabase Authentication → URL Configuration, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the allowed redirect URLs.
5. Ensure the database tables and row-level security policies listed below exist in your Supabase project.
6. Start the app:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000`.

## Supabase database requirements

The app expects these user-scoped tables and fields:

- `profiles`: `id` (auth user ID), `display_name`, `currency`
- `accounts`: `id`, `user_id`, `name`, `account_type`, `opening_balance`, `created_at`
- `categories`: `id`, `user_id`, `name`, `type`, `created_at`
- `transactions`: `id`, `user_id`, `account_id`, `category_id`, `type`, `description`, `amount`, `transaction_date`, `notes`, `transfer_account_id`, `created_at`
- `budgets`: `id`, `user_id`, `category_id`, `amount`, `month`, `created_at`
- `savings_goals`: `id`, `user_id`, `name`, `target_amount`, `current_amount`, `target_date`, `created_at`

Enable RLS on every table. Policies must restrict each user's `SELECT`, `INSERT`, `UPDATE` and `DELETE` operations to rows where the row's owner ID equals `auth.uid()`. For `profiles`, the owner column is `id`; for the other tables, it is `user_id`. Keep the transaction ownership validation trigger that checks account and category ownership, and keep the new-user profile trigger. Never disable RLS to make the app work.

The application uses the Supabase publishable key in the browser and the authenticated user's session on server routes. **Do not put a Supabase service-role/secret key in any `NEXT_PUBLIC_` variable or client-side file.**

## Build and lint checks

```bash
npm run lint
npm run build
```

Run both commands locally before deploying. This handoff was syntax-checked, but a clean Next.js build could not be run in the handoff environment because dependency installation failed there.

## Deploying to Vercel

1. Push this project to a private GitHub repository.
2. Import that repository into Vercel and keep the framework preset as Next.js.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under Vercel Project Settings → Environment Variables for Preview and Production.
4. Deploy and copy the production domain.
5. In Supabase Authentication → URL Configuration, set the Site URL to the production domain and add the production callback URL `https://YOUR_DOMAIN/auth/callback` to the allowed redirect URLs. Keep the localhost callback for local development.
6. Redeploy after changing environment variables or redirect settings.
7. Test sign-up, email confirmation, sign-in, sign-out, creating/editing/deleting a transaction, account balance updates, budgets, savings goals, analytics and mobile layout.

Deployment is not performed by this project bundle. Review the Supabase policies and run the build locally before making the site public.

## Notes

- Preferred currency changes the display format only; it does not convert or rewrite stored transaction amounts.
- Transaction and savings-goal routes require an authenticated user and scope reads/writes to that user. Keep the Supabase RLS policies enabled as a second layer of protection.
