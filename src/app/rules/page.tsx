import { ReactNode } from "react";
import {
  Award,
  ClipboardList,
  DollarSign,
  Flag,
  Gavel,
  Medal,
  Target,
  Trophy,
  UserMinus,
} from "lucide-react";
import { Card, CardContent, PageHeader } from "@/components/ui";

export const metadata = {
  title: "Rules — Golf Pick'em",
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="How it works"
        title="Rules & Scoring"
        subtitle="Everything you need to know about entering, drafting, and winning."
      />

      <div className="space-y-6">
        <Section
          icon={<Flag className="h-5 w-5" />}
          title="Overview"
        >
          <p>
            Golf Pick&apos;em is a friends-only weekly PGA Tour pool. Each
            tournament, members buy in, draft pro golfers in a snake format,
            and compete for a cash pool based on the combined performance of
            their picks at the real event.
          </p>
          <p>
            Everything follows the live PGA Tour scoreboard, so your
            standings update alongside the real tournament.
          </p>
        </Section>

        <Section
          icon={<ClipboardList className="h-5 w-5" />}
          title="Entering a Tournament"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Browse upcoming events on the <strong>Tournaments</strong> page
              and open the one you want to play.
            </li>
            <li>
              Click <strong>Enter Tournament</strong> to opt in. You can
              enter any event in the <em>Upcoming</em> or <em>Draft Open</em>{" "}
              state.
            </li>
            <li>
              Each tournament has a fixed buy-in set by the commissioner. The
              total pool equals the buy-in times the number of entrants.
            </li>
            <li>
              Changed your mind? You can{" "}
              <strong>withdraw from a tournament</strong> any time before the
              live draft begins. Once the first pick is made, entries are
              locked.
            </li>
          </ul>
        </Section>

        <Section
          icon={<Gavel className="h-5 w-5" />}
          title="The Draft"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Once the commissioner opens the draft, entrants take turns
              selecting from the tournament field.
            </li>
            <li>
              Drafts run as a <strong>snake</strong>: the order reverses each
              round, so if you pick last in round 1, you pick first in round
              2.
            </li>
            <li>
              Each player drafts <strong>two golfers</strong>. No two players
              can draft the same golfer.
            </li>
            <li>
              The draft order is randomized automatically before picks
              begin. When the last pick is made, the tournament flips to{" "}
              <em>In Progress</em> and the leaderboard opens.
            </li>
          </ul>
        </Section>

        <Section
          icon={<Target className="h-5 w-5" />}
          title="Scoring"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Your entry&apos;s score is the <strong>sum</strong> of your two
              golfers&apos; strokes relative to par across the entire event.
              Lower is better.
            </li>
            <li>
              Example: if one pick finishes <strong>-8</strong> and the other
              finishes <strong>+2</strong>, your entry score is{" "}
              <strong>-6</strong>.
            </li>
            <li>
              The leaderboard refreshes automatically during active rounds
              using live data from the PGA scoreboard.
            </li>
            <li>
              Ties are broken by the <strong>best individual finish</strong>{" "}
              between the two picks; if still tied, the pool is split evenly
              among tied positions.
            </li>
          </ul>
        </Section>

        <Section
          icon={<UserMinus className="h-5 w-5" />}
          title="Cuts, WDs, and DQs"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Missed cut:</strong> a golfer who misses the cut still
              counts for your entry — their score is locked at whatever they
              posted through 36 holes.
            </li>
            <li>
              <strong>Withdrawal (WD):</strong> if one of your golfers
              withdraws mid-event, that golfer&apos;s score stops updating
              and your entry continues with your other pick.
            </li>
            <li>
              <strong>Both picks out:</strong> if{" "}
              <em>both</em> of your golfers miss the cut or withdraw, your
              entry is marked <strong>DQ</strong> and is ineligible for a
              payout.
            </li>
          </ul>
        </Section>

        <Section
          icon={<DollarSign className="h-5 w-5" />}
          title="Payouts"
        >
          <p>
            Payouts are distributed from the total pool based on how many
            entrants joined the tournament. Payout tiers:
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-stone-200">
            <table className="min-w-full divide-y divide-stone-100 text-sm">
              <thead className="bg-cream-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-2 text-left">Entries</th>
                  <th className="px-4 py-2 text-left">Places Paid</th>
                  <th className="px-4 py-2 text-left">Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                <tr>
                  <td className="px-4 py-2">2</td>
                  <td className="px-4 py-2">1</td>
                  <td className="px-4 py-2">100%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">3–5</td>
                  <td className="px-4 py-2">2</td>
                  <td className="px-4 py-2">70% / 30%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">6–10</td>
                  <td className="px-4 py-2">3</td>
                  <td className="px-4 py-2">60% / 25% / 15%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">11+</td>
                  <td className="px-4 py-2">4</td>
                  <td className="px-4 py-2">50% / 25% / 15% / 10%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            The exact payout for each place is shown on every tournament
            detail page once entries are in.
          </p>
        </Section>

        <Section
          icon={<Trophy className="h-5 w-5" />}
          title="Season Standings"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              The <strong>Standings</strong> page tracks cumulative
              performance across every completed tournament of the season.
            </li>
            <li>
              You&apos;ll see total entries, total winnings, buy-ins, net
              profit, best finish, and ROI for every member.
            </li>
            <li>
              The top three on the season leaderboard get medal icons next
              to their names for bragging rights.
            </li>
          </ul>
        </Section>

        <Section
          icon={<Medal className="h-5 w-5" />}
          title="Fair Play"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>Enter before the draft starts — no late additions.</li>
            <li>
              Make your picks promptly when it&apos;s your turn. Live drafts
              can stall on a slow player.
            </li>
            <li>
              The commissioner has final say on any edge cases the rules
              don&apos;t cover.
            </li>
          </ul>
        </Section>

        <Card accent="gold">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-stone-700">
            <Award className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold-500" />
            <p>
              Questions or disputes? Reach out to your commissioner — the
              person who set up the pool can resolve any edge case and
              adjust the board if needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            {icon}
          </span>
          <h2 className="font-display text-xl font-semibold text-stone-900">
            {title}
          </h2>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
