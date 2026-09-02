import type { ApplicationProvider } from "@/automation/provider";
import { greenhouseProvider } from "@/automation/providers/greenhouse";
import { careerPageProvider } from "@/automation/providers/careerPage";

const providers: ApplicationProvider[] = [greenhouseProvider, careerPageProvider];

/**
 * Find the first provider able to handle a given application URL.
 * Falls back to the generic career-page provider.
 */
export function getProviderForUrl(url: string): ApplicationProvider {
  return providers.find((p) => p.canHandle(url)) ?? careerPageProvider;
}

export { providers, greenhouseProvider, careerPageProvider };
