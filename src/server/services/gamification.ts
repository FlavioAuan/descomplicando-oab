import { db } from '@/lib/db'
import { users, achievements, userAchievements } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { usersRepository } from '../repositories/users'

export const XP_REWARDS = {
  ANSWER_CORRECT: 10,
  COMPLETE_SIMULATION: 50,
  PERFECT_SIMULATION: 200,
  COMPLETE_TRAINING_DAY: 30,
  COMPLETE_TRAINING: 500,
  DAILY_STREAK_BONUS: 20,
  REVIEW_FLASHCARD: 5,
  FIRST_LOGIN: 100,
} as const

export async function awardXp(
  userId: string,
  action: keyof typeof XP_REWARDS,
  multiplier = 1
): Promise<{ xp: number; leveledUp: boolean; newLevel: number }> {
  const xpAmount = XP_REWARDS[action] * multiplier
  const user = await usersRepository.findById(userId)
  if (!user) throw new Error('User not found')

  const oldLevel = user.level
  const updated = await usersRepository.addXp(userId, xpAmount)

  return {
    xp: xpAmount,
    leveledUp: updated.level > oldLevel,
    newLevel: updated.level,
  }
}

export async function checkAndAwardAchievements(
  userId: string,
  context: {
    totalCorrect?: number
    streak?: number
    simulationsCompleted?: number
    trainingsDone?: number
    subjectId?: string
  }
): Promise<Array<{ name: string; xpReward: number }>> {
  const allAchievements = await db.select().from(achievements)
  const userAch = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))

  const earnedIds = new Set(userAch.map(a => a.achievementId))
  const newlyEarned: Array<{ name: string; xpReward: number }> = []

  for (const achievement of allAchievements) {
    if (earnedIds.has(achievement.id)) continue

    const { type, value } = achievement.condition
    let earned = false

    if (type === 'correct_answers' && (context.totalCorrect || 0) >= value) {
      earned = true
    } else if (type === 'streak' && (context.streak || 0) >= value) {
      earned = true
    } else if (type === 'simulations' && (context.simulationsCompleted || 0) >= value) {
      earned = true
    } else if (type === 'trainings' && (context.trainingsDone || 0) >= value) {
      earned = true
    }

    if (earned) {
      await db.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
      })

      await usersRepository.addXp(userId, achievement.xpReward)
      newlyEarned.push({ name: achievement.name, xpReward: achievement.xpReward })
    }
  }

  return newlyEarned
}

export async function updateStreak(userId: string): Promise<{
  newStreak: number
  bonusXp: number
}> {
  await usersRepository.incrementStreak(userId)
  const user = await usersRepository.findById(userId)
  const streak = user?.streak || 0

  // Bonus XP for milestones
  let bonusXp = XP_REWARDS.DAILY_STREAK_BONUS
  if (streak % 30 === 0) bonusXp *= 5
  else if (streak % 7 === 0) bonusXp *= 2

  await usersRepository.addXp(userId, bonusXp)

  return { newStreak: streak, bonusXp }
}

export async function getUserRanking(limit = 20) {
  return db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      xp: users.xp,
      level: users.level,
      streak: users.streak,
    })
    .from(users)
    .where(eq(users.role, 'student'))
    .orderBy(users.xp)
    .limit(limit)
}

export async function seedDefaultAchievements(): Promise<void> {
  const defaults = [
    {
      name: 'Primeira Resposta',
      description: 'Responda sua primeira questão',
      icon: '🎯',
      xpReward: 50,
      condition: { type: 'correct_answers', value: 1 },
      rarity: 'common',
    },
    {
      name: 'Sequência de 7 Dias',
      description: 'Estude por 7 dias consecutivos',
      icon: '🔥',
      xpReward: 200,
      condition: { type: 'streak', value: 7 },
      rarity: 'uncommon',
    },
    {
      name: 'Sequência de 30 Dias',
      description: 'Estude por 30 dias consecutivos',
      icon: '🏆',
      xpReward: 1000,
      condition: { type: 'streak', value: 30 },
      rarity: 'rare',
    },
    {
      name: 'Aprovado!',
      description: 'Acerte 1000 questões',
      icon: '⚖️',
      xpReward: 500,
      condition: { type: 'correct_answers', value: 1000 },
      rarity: 'epic',
    },
    {
      name: 'Simuladeiro',
      description: 'Complete 10 simulados',
      icon: '📝',
      xpReward: 300,
      condition: { type: 'simulations', value: 10 },
      rarity: 'uncommon',
    },
  ]

  for (const ach of defaults) {
    await db.insert(achievements).values(ach).onConflictDoNothing()
  }
}
