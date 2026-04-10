# Golf Pick'em

Weekly PGA tournament pick-em pool for a group of friends. Snake draft 2 golfers, compete on combined score to par. If either golfer misses the cut, you're out.

## Features

- **Weekly opt-in** - play any week you want, skip when you're busy
- **Snake draft** - random order, pick 2 golfers (live or async mode)
- **Live leaderboard** - auto-refreshes every 30 seconds during tournaments
- **ESPN integration** - import tournament fields and fetch live scores
- **Automatic payouts** - scales with pool size ($50 default buy-in)
- **Season standings** - track total winnings, wins, and ROI

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed demo data (optional)
npx tsx prisma/seed.ts

# Start dev server
npm run dev
```

Open http://localhost:3000

### Demo accounts (after seeding)

| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@golfpickem.com | admin123 |
| Player | mike@golfpickem.com | player123 |

Other players: sarah, tom, lisa, dave, amy, john (same password)

## Deploy to Railway (Recommended)

Railway is the easiest way to deploy this app with persistent SQLite storage.

### Step 1: Push to GitHub

Make sure your code is pushed to a GitHub repository.

### Step 2: Create Railway project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** > **"Deploy from GitHub Repo"**
3. Select your `Golf-pickem` repository

### Step 3: Add a volume

1. In your Railway service, click **"+ New"** > **"Volume"**
2. Set the mount path to `/data`
3. This is where your SQLite database will persist across deploys

### Step 4: Set environment variables

In the Railway service settings, add these variables:

```
DATABASE_URL=file:/data/golf-pickem.db
AUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-app-name.up.railway.app
```

### Step 5: Deploy

Railway auto-deploys when you push to GitHub. The `Dockerfile` handles the build, and `start.sh` runs migrations on startup.

### Step 6: Seed initial data

After the first deploy, open the Railway shell and run:

```bash
npx tsx prisma/seed.ts
```

Or just register the first account through the app - the first user is automatically made admin.

## How It Works

### Weekly Flow

1. **Admin creates a tournament** - links to a PGA event, sets buy-in
2. **Players opt in** - enter for the week by confirming the buy-in
3. **Draft** - admin starts the snake draft (live or async)
4. **Tournament plays** - leaderboard updates with live scores from ESPN
5. **Admin finalizes** - calculates standings and payouts

### Payout Structure

| Players | Payouts |
|---------|---------|
| 1-4 | Winner takes all |
| 5-9 | 1st: 70%, 2nd: 30% |
| 10-15 | 1st: 60%, 2nd: 27%, 3rd: 13% |
| 16+ | 1st: 50%, 2nd: 25%, 3rd: 15%, 4th: 10% |

### Cut Rule

If either of your golfers misses the cut (or withdraws), you are **disqualified** for that week. Choose wisely.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **Prisma** ORM with **SQLite**
- **NextAuth.js** v5 for authentication
- **ESPN API** (public endpoints) for golf data
