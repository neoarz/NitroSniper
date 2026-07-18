/*
Made with ❤️ by neoarz
Edited with 💜 by N0_.q3
I am not responsible for any damage caused by this plugin; use at your own risk
Vencord does not endorse/support this plugin (Works with Equicord as well)
dm @neoarz if u need help or have any questions
https://github.com/neoarz/NitroSniper
*/


import { Constants, RestAPI } from "@webpack/common";

import type { GiftCodeResolution } from "./types";

export async function resolveGiftType(code: string): Promise<string | null> {
    try {
        const response: { body: GiftCodeResolution; } = await RestAPI.get({
            url: Constants.Endpoints.GIFT_CODE_RESOLVE(code),
            query: {
                with_application: false,
                with_subscription_plan: true
            },
            oldFormErrors: true
        });

        return response.body.subscription_plan?.name ?? response.body.store_listing?.sku?.name ?? null;
    } catch {
        return null;
    }
}
