export interface ChineseQuote {
  english: string
  chinese: string
}

export const chineseQuotes: ChineseQuote[] = [
  {
    english: 'The best time to plant a tree was 20 years ago. The second best time is now.',
    chinese: '二十年前种树最好，其次是现在。',
  },
  {
    english: 'A journey of a thousand miles begins with a single step.',
    chinese: '千里之行，始于足下。',
  },
  {
    english: 'Your teacher can open the door, but you must enter by yourself.',
    chinese: '师父领进门，修行在个人。',
  },
  {
    english: 'Be not afraid of growing slowly. Be afraid only of standing still.',
    chinese: '不怕慢，只怕站。',
  },
  {
    english: 'The man who moves a mountain begins by carrying away small stones.',
    chinese: '移山者，始于搬小石。',
  },
  {
    english: 'To know what you know and what you do not know, that is true knowledge.',
    chinese: '知之为知之，不知为不知，是知也。',
  },
  {
    english: 'When the winds of change blow, some build walls. Others build windmills.',
    chinese: '风变之时，有人筑墙，有人建磨。',
  },
  {
    english: "As distance tests a horse's strength, time reveals a person's character.",
    chinese: '路遥知马力，日久见人心。',
  },
  {
    english: 'Good medicine tastes bitter.',
    chinese: '良药苦口。',
  },
  {
    english: 'Ten years to grow a tree, a hundred years to cultivate a person.',
    chinese: '十年树木，百年树人。',
  },
  {
    english: 'Turn conflict into peace.',
    chinese: '化干戈为玉帛。',
  },
  {
    english: "What's done is done.",
    chinese: '木已成舟。',
  },
  {
    english: 'Deep roots take time to form.',
    chinese: '冰冻三尺，非一日之寒。',
  },
  {
    english: 'With unity, even mountains can be moved.',
    chinese: '人心齐，泰山移。',
  },
  {
    english: 'Wait long enough, and the clouds will part to reveal the moon.',
    chinese: '守得云开见月明。',
  },
  {
    english: 'Even the wise make mistakes.',
    chinese: '智者千虑，必有一失。',
  },
  {
    english: 'People cannot be judged by appearance.',
    chinese: '凡人不可貌相，海水不可斗量。',
  },
  {
    english: "You do not understand the cost of things until you're responsible for them.",
    chinese: '不当家，不知柴米贵。',
  },
  {
    english: "The best mirror is a friend's eyes.",
    chinese: '朋友的眼睛是最好的镜子。',
  },
]

export function getRandomQuote(exclude?: ChineseQuote | null): ChineseQuote {
  if (chineseQuotes.length === 1) return chineseQuotes[0]

  let quote = chineseQuotes[Math.floor(Math.random() * chineseQuotes.length)]

  while (exclude && quote.english === exclude.english) {
    quote = chineseQuotes[Math.floor(Math.random() * chineseQuotes.length)]
  }

  return quote
}

