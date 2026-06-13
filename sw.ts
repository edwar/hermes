import { defaultCache } from "@serwist/next/worker"
import { installSerwist } from "@serwist/sw"

declare const self: ServiceWorkerGlobalScope

installSerwist({
  precacheEntries: self.__WB_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})
