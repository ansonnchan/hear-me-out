export interface ChineseQuote {
  english: string
  chinese: string
  attribution: string
}

export const chineseQuotes: ChineseQuote[] = [
  {
    english: 'The best time to plant a tree was 20 years ago. The second best time is now.',
    chinese: '二十年前种树最好，其次是现在。',
    attribution: 'Chinese Proverb',
  },
  {
    english: 'A journey of a thousand miles begins with a single step.',
    chinese: '千里之行，始于足下。',
    attribution: 'Laozi',
  },
  {
    english: 'Your teacher can open the door, but you must enter by yourself.',
    chinese: '师父领进门，修行在个人。',
    attribution: 'Chinese Proverb',
  },
  {
    english: 'Be not afraid of growing slowly. Be afraid only of standing still.',
    chinese: '不怕慢，只怕站。',
    attribution: 'Chinese Proverb',
  },
  {
    english: 'The man who moves a mountain begins by carrying away small stones.',
    chinese: '移山者，始于搬小石。',
    attribution: 'Confucius',
  },
  {
    english: 'To know what you know and what you do not know — that is true knowledge.',
    chinese: '知之为知之，不知为不知，是知也。',
    attribution: 'Confucius',
  },
  {
    english: 'When the winds of change blow, some build walls. Others build windmills.',
    chinese: '风变之时，有人筑墙，有人建磨。',
    attribution: 'Chinese Proverb',
  },
  {
    english: 'Tension is who you think you should be. Relaxation is who you are.',
    chinese: '紧绷是你以为你该是的样子，放松才是真正的你。',
    attribution: 'Chinese Proverb',
  },
]

export function getRandomQuote(): ChineseQuote {
  return chineseQuotes[Math.floor(Math.random() * chineseQuotes.length)]
}

