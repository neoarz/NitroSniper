/*
Made with ❤️ by neoarz
Edited with 💜 by N0_.q3
I am not responsible for any damage caused by this plugin; use at your own risk
Vencord does not endorse/support this plugin (Works with Equicord as well)
dm @neoarz if u need help or have any questions
https://github.com/neoarz/NitroSniper
*/

export interface ClaimRequest {
    code: string;
    authorId?: string;
    authorName?: string;
    authorUsername?: string;
    authorAvatarUrl?: string;
    channelId?: string;
    guildId?: string;
    messageId?: string;
    messageTimestamp?: string;
}

export type WebhookResult = "claimed" | "failed";

export interface WebhookField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface WebhookEmbed {
    title: string;
    color: number;
    description?: string;
    fields?: WebhookField[];
    timestamp: string;
    author?: {
        name: string;
        icon_url?: string;
    };
    footer?: {
        text: string;
    };
}

export interface WebhookPayload {
    username: string;
    embeds: WebhookEmbed[];
    allowed_mentions: {
        parse: string[];
    };
}

export interface NativeWebhookResponse {
    status: number;
    data: string;
}

export interface GiftCodeResolution {
    store_listing?: {
        sku?: {
            name?: string;
        };
    };
    subscription_plan?: {
        name?: string;
    };
}
