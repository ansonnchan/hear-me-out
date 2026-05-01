import { VentPageClient } from '@/components/vent-page-client'
import { isPersonalityKey, type PersonalityKey } from '@/lib/personalities'

interface VentPageProps {
  searchParams: Promise<{
    personality?: string | string[]
  }>
}

function parsePersonalityParam(value: string | string[] | undefined): PersonalityKey | null {
  const firstValue = Array.isArray(value) ? value[0] : value
  return isPersonalityKey(firstValue) ? firstValue : null
}

export default async function VentPage({ searchParams }: VentPageProps) {
  const params = await searchParams
  const initialPersonality = parsePersonalityParam(params.personality)

  return <VentPageClient key={initialPersonality ?? 'none'} initialPersonality={initialPersonality} />
}
