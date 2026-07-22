import { ConviteForm } from './convite-form'

export default async function ConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}) {
  const { token_hash } = await searchParams
  return <ConviteForm tokenHash={token_hash ?? ''} />
}
