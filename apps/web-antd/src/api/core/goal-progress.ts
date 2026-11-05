import type { GoalEntity } from './goal';
import type { ProgressStatus } from './progress-status';

export function goalAchieved(goal: GoalEntity) {
  return (
    goal.currentValue != null &&
    goal.targetValue != null &&
    goal.targetValue > 0 &&
    (goal.targetOperator === 'gt'
      ? goal.currentValue > goal.targetValue
      : goal.currentValue >= goal.targetValue)
  );
}
export function goalDisplayStatus(goal: GoalEntity): ProgressStatus {
  if (
    goal.progressMode !== 'graphql' ||
    !goal.progressCheckedAt ||
    goal.status === 'on_hold'
  )
    return goal.status;
  return goalAchieved(goal) ? 'completed' : 'in_progress';
}
export function goalProgressPercent(goal: GoalEntity) {
  if (goal.targetValue != null && goal.targetValue > 0) {
    const percent = Math.max(
      0,
      Math.min(
        100,
        Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100),
      ),
    );
    return goal.targetOperator === 'gt' && !goalAchieved(goal)
      ? Math.min(99, percent)
      : percent;
  }
  return goal.status === 'completed' ? 100 : 0;
}
