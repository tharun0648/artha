import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Step1Form from '@/components/onboarding/Step1Form'

export default async function Step1Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('property_appreciation')
    .select('city')
    .order('city', { ascending: true })

  const cities = (data ?? []).map((row: { city: string }) => row.city)

  return <Step1Form cities={cities} />
}
