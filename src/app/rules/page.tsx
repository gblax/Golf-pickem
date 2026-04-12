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
    <div className="animate-fade-in-up mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="How it works"
        title="Rules & Scoring"
        subtitle="How to enter, draft, and win."
      />

      <div className="space-y-5">
        <Section icon={<Flag className="h-5 w-5" />} title="Overview">
          <p>
            Golf Pick&apos;em is a friends-only weekly PGA Tour pool. Buy in,
            draft two pros, and your score follows them live on the real
            leaderboard.
          </p>
        </Section>

        <Section
          icon={<ClipboardList className="h-5 w-5" />}
          title="Entering"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Open a tournament from the <strong>Tournaments</strong> page and
              hit <strong>Enter Tournament</strong>.
            </li>
            <li>
              Entries are open while the event is <em>Upcoming</em> or{" "}
              <em>Draft Open</em>.
            </li>
            <li>
              The commissioner sets the buy-in. The pool is buy-in &times;
              entrants.
            </li>
            <li>
              You can <strong>withdraw</strong> any time before the first pick
              is made. After that, entries lock.
            </li>
          </ul>
        </Section>

        <Section icon={<Gavel className="h-5 w-5" />} title="The Draft">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              The draft order is randomized. Once it opens, take turns picking
              from the field.
            </li>
            <li>
              It&apos;s a <strong>snake</strong>: the order reverses each
              round. Last pick in round 1 gets first pick in round 2.
            </li>
            <li>
              Each player drafts <strong>two golfers</strong>. No duplicates.
            </li>
            <li>
              When the final pick is in, the tournament flips to{" "}
              <em>In Progress</em> and the leaderboard opens.
            </li>
          </ul>
        </Section>

        <Section icon={<Target className="h-5 w-5" />} title="Scoring">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Your score is the <strong>sum</strong> of your two golfers&apos;
              strokes to par. Lower is better.
            </li>
            <li>
              Example: <strong>-8</strong> + <strong>+2</strong> ={" "}
              <strong>-6</strong>.
            </li>
            <li>
              The leaderboard refreshes automatically from the live PGA
              scoreboard.
            </li>
            <li>
              Ties go to the <strong>best individual finish</strong>. Still
              tied? Split the prize evenly.
            </li>
          </ul>
        </Section>

        <Section
          icon={<UserMinus className="h-5 w-5" />}
          title="Cuts, WDs, and DQs"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              If <strong>either</strong> of your golfers misses the cut or
              withdraws, your entry is <strong>DQ&apos;d</strong> and
              can&apos;t cash.
            </li>
            <li>
              This means choosing two golfers who will make the weekend is
              just as important as picking low scorers.
            </li>
            <li>
              DQ&apos;d entries appear at the bottom of the leaderboard and
              are not eligible for payouts.
            </li>
          </ul>
        </Section>

        <Section icon={<DollarSign className="h-5 w-5" />} title="Payouts">
          <p>The pool is split based on how many people entered:</p>
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
            Exact dollar amounts show up on each tournament page once entries
            are in.
          </p>
        </Section>

        <Section
          icon={<Trophy className="h-5 w-5" />}
          title="Season Standings"
        >
          <ul className="ml-5 list-disc space-y-2">
            <li>
              The <strong>Standings</strong> page tracks every member across
              every completed tournament.
            </li>
            <li>
              You&apos;ll see entries, winnings, buy-ins, net profit, best
              finish, and ROI.
            </li>
            <li>
              The top three on the season board get medal icons for bragging
              rights.
            </li>
          </ul>
        </Section>

        <Section icon={<Medal className="h-5 w-5" />} title="Fair Play">
          <ul className="ml-5 list-disc space-y-2">
            <li>Enter before the draft starts. No late adds.</li>
            <li>
              Make your picks promptly. A live draft stalls on a slow player.
            </li>
            <li>
              The commissioner has final say on anything the rules don&apos;t
              cover.
            </li>
          </ul>
        </Section>

        <Card accent="gold">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-stone-700">
            <Award className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold-500" />
            <p>
              Questions or disputes? Ask your commissioner — they can sort out
              edge cases and adjust the board if needed.
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
      <CardContent className="px-5 py-5 sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            {icon}
          </span>
          <h2 className="font-display text-lg font-semibold text-stone-900 sm:text-xl">
            {title}
          </h2>
        </div>
        <div className="space-y-2 text-sm leading-relaxed text-stone-700">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
