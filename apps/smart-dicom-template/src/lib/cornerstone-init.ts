/**
 * Lazy Cornerstone3D initialization for the DICOM algorithm template.
 *
 * Registers the WADO-RS image loader, metadata provider and web workers
 * so that `wadors:` imageIds can be loaded for pixel-level processing.
 *
 * Call `await ensureCornerstoneInit()` before using any Cornerstone APIs.
 */

import { getAccessToken } from "@/lib/dicomweb"

let initialized = false

export async function ensureCornerstoneInit(): Promise<void> {
  if (initialized) return

  const [core, loader] = await Promise.all([
    import("@cornerstonejs/core"),
    import("@cornerstonejs/dicom-image-loader"),
  ])

  await core.init()
  await loader.init({
    maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 4),
  })

  // Inject OAuth bearer token into WADO-RS requests
  loader.internal.setOptions({
    beforeSend: async (xhr: XMLHttpRequest) => {
      const token = getAccessToken()
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      }
    },
  })

  initialized = true
}
