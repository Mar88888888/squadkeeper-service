export enum GameFormat {
  FIVE_A_SIDE = '4+1', // 5 players (U-8, U-9)
  NINE_A_SIDE = '8+1', // 9 players (U-10, U-11, U-12)
  ELEVEN_A_SIDE = '10+1', // 11 players (U-13+)
}

export const GAME_FORMAT_CONFIG = {
  [GameFormat.FIVE_A_SIDE]: {
    totalPlayers: 5,
    starters: 5,
    maxSubstitutes: 3,
    label: '4+1 (5 players)',
    ageGroups: ['U-8', 'U-9'],
  },
  [GameFormat.NINE_A_SIDE]: {
    totalPlayers: 9,
    starters: 9,
    maxSubstitutes: 5,
    label: '8+1 (9 players)',
    ageGroups: ['U-10', 'U-11', 'U-12'],
  },
  [GameFormat.ELEVEN_A_SIDE]: {
    totalPlayers: 11,
    starters: 11,
    maxSubstitutes: 7,
    label: '10+1 (11 players)',
    ageGroups: ['U-13+'],
  },
};
