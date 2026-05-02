/**
 * SHL API client — uses the generated OpenAPI fetch client.
 *
 * Provides `createShl()` with the same signature the rest of the
 * patient-portal already consumes, backed by the typed `ShlApi`.
 */
import { Configuration, ShlApi, type PostApiShl200Response } from "@/lib/api-client"
import { config } from "@/config"
import { smartAuth } from "@/lib/smart-auth"

export type { PostApiShl200Response as ShlResponse }

const shlApi = new ShlApi(
  new Configuration({
    basePath: config.proxyBase,
    accessToken: async () => smartAuth.getToken()?.access_token ?? "",
  }),
)

/** Create a SMART Health Link for sharing patient data */
export async function createShl(opts: {
  verifiedOnly: boolean
  expiresInMinutes?: number
  label?: string
  shortenUrl?: boolean
  maxUses?: number
}): Promise<PostApiShl200Response> {
  return shlApi.postApiShl({
    postApiShlRequest: {
      verifiedOnly: opts.verifiedOnly,
      expiresInMinutes: opts.expiresInMinutes ?? 60,
      label: opts.label,
      ...(opts.shortenUrl && { shortenUrl: true }),
      ...(opts.shortenUrl && opts.maxUses && { maxUses: opts.maxUses }),
    },
  })
}
