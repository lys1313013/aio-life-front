import dayjs from 'dayjs';

export interface GithubContributionStats {
  currentStreak: number;
  todayContribution: number;
  totalContributions: number;
  contributions: any[];
}

export async function getGithubContributionStats(
  username: string,
  token: string,
): Promise<GithubContributionStats> {
  const query = `
      query {
        user(login: "${username}") {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  contributionLevel
                }
              }
            }
          }
        }
      }
    `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub data');
  }

  const res = await response.json();
  if (res.errors) {
    throw new Error(res.errors[0].message);
  }

  const calendar = res.data.user.contributionsCollection.contributionCalendar;
  const contributions: any[] = [];

  const mapLevel = (level: string) => {
    switch (level) {
      case 'NONE':
        return 0;
      case 'FIRST_QUARTILE':
        return 1;
      case 'SECOND_QUARTILE':
        return 2;
      case 'THIRD_QUARTILE':
        return 3;
      case 'FOURTH_QUARTILE':
        return 4;
      default:
        return 0;
    }
  };

  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      contributions.push({
        date: day.date,
        count: day.contributionCount,
        level: mapLevel(day.contributionLevel),
      });
    }
  }

  const today = dayjs().format('YYYY-MM-DD');
  const filtered = contributions.filter((item) => item.date <= today);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  // Today's contribution
  const todayItem = filtered.find((item) => item.date === today);
  const todayContribution = todayItem ? todayItem.count : 0;

  // Current Streak
  let currentStreak = 0;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const item = filtered[i];
    if (!item) continue;
    if (item.count > 0) {
      currentStreak++;
    } else {
      // If it's today and count is 0, we check yesterday.
      // If yesterday also 0, streak is 0.
      if (item.date === today && i > 0) {
        continue;
      }
      break;
    }
  }

  return {
    contributions,
    currentStreak,
    todayContribution,
    totalContributions: calendar.totalContributions,
  };
}
