import type { SISAdapter, ProviderType } from "./base";
import { VeracrossAdapter } from "./veracross";
import { BlackbaudAdapter } from "./blackbaud";
import { PowerSchoolAdapter } from "./powerschool";
import { WebhookAdapter } from "./webhook";
import { RavennaAdapter } from "./ravenna";
import { decryptConfig } from "@/lib/crypto/encrypt";

export function createAdapter(provider: ProviderType, encryptedConfig: string): SISAdapter {
  const config = decryptConfig(encryptedConfig);

  switch (provider) {
    case "veracross":
      return new VeracrossAdapter(config as {
        client_id: string;
        client_secret: string;
        school_route: string;
      });
    case "blackbaud":
      return new BlackbaudAdapter(config as {
        subscription_key: string;
        access_token: string;
        refresh_token: string;
        school_id: string;
      });
    case "powerschool":
      return new PowerSchoolAdapter(config as {
        server_url: string;
        client_id: string;
        client_secret: string;
      });
    case "ravenna":
      return new RavennaAdapter(config as {
        api_key: string;
        school_slug: string;
      });
    case "webhook":
      return new WebhookAdapter(config as {
        url: string;
        secret: string;
        headers?: Record<string, string>;
      });
    default:
      throw new Error(`Unsupported SIS provider: ${provider}`);
  }
}
