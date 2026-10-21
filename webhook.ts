/*
Made with ❤️ by neoarz
Edited with 💜 by N0_.q3
Cleanified with ❤️‍🩹 by Vanitywya
I am not responsible for any damage caused by this plugin; use at your own risk
Vencord does not endorse/support this plugin (Works with Equicord as well)
dm @neoarz if u need help or have any questions
https://github.com/neoarz/NitroSniper
*/


import type { PluginNative } from "@utils/types";

import type {
    ClaimRequest,
    WebhookEmbed,
    WebhookField,
    WebhookPayload,
    WebhookResult
} from "./types";

const SUCCESS_COLOR = 0x43b581;
const FAILURE_COLOR = 0xf04747;
const CAPTCHA_COLOR = 0xfaa61a;
const TEST_COLOR = 0x5865f2;
const WEBHOOK_NAME = "NitroSniper";

function parseWebhookUrl(webhookUrl: string) {
    const trimmed = webhookUrl.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed);
    } catch {
        throw new Error("Webhook URL is invalid.");
    }
}

function getNative() {
    const native = (globalThis as any).VencordNative?.pluginHelpers?.NitroSniper as PluginNative<typeof import("./native")> | undefined;
    if (!native) {
        throw new Error("Webhook sending requires desktop native support.");
    }

    return native;
}

function createPayload(embeds: WebhookEmbed[]): WebhookPayload {
    return {
        username: WEBHOOK_NAME,
        embeds,
        allowed_mentions: {
            parse: []
        }
    };
}

function buildUserProfileUrl(userId?: string) {
    return userId ? `https://discord.com/users/${userId}` : null;
}

function buildMessageUrl(request: ClaimRequest) {
    if (!request.channelId || !request.messageId) return null;

    return `https://discordapp.com/channels/${request.guildId ?? "@me"}/${request.channelId}/${request.messageId}`;
}

function escapeMarkdown(value: string) {
    return value.replace(/([\\`*_{}[\\]()#+.!|>~-])/g, "\\$1");
}

function buildGiftTypeField(giftType: string | null): WebhookField | null {
    if (!giftType) return null;

    return {
        name: "Gift Type:",
        value: escapeMarkdown(giftType),
        inline: false
    };
}

function buildAuthorField(request: ClaimRequest): WebhookField | null {
    const label = request.authorName ?? request.authorUsername ?? request.authorId;
    if (!label) return null;

    const profileUrl = buildUserProfileUrl(request.authorId);
    return {
        name: "Code sent by:",
        value: profileUrl ? `[${escapeMarkdown(label)}](${profileUrl})` : escapeMarkdown(label),
        inline: false
    };
}

function buildMessageField(request: ClaimRequest): WebhookField | null {
    const messageUrl = buildMessageUrl(request);
    if (!messageUrl) return null;

    return {
        name: "Message:",
        value: `[Posted here!](${messageUrl})`,
        inline: false
    };
}

function formatClaimTime(ms: number) {
    return `${(ms / 1000).toFixed(2)}s`;
}

function buildClaimTimeField(claimTimeMs: number | null): WebhookField | null {
    if (claimTimeMs === null) return null;

    return {
        name: "Time to Claim:",
        value: formatClaimTime(claimTimeMs),
        inline: true
    };
}

function buildClaimFields(request: ClaimRequest, giftType: string | null, claimTimeMs: number | null) {
    return [
        buildClaimTimeField(claimTimeMs),
        buildGiftTypeField(giftType),
        buildAuthorField(request),
        buildMessageField(request)
    ].filter((field): field is WebhookField => field != null);
}

function getResultPresentation(result: WebhookResult) {
    switch (result) {
        case "claimed":
            return {
                title: "Yay! Claimed a Nitro!",
                color: SUCCESS_COLOR
            };
        case "failed":
        default:
            return {
                title: "Failed to claim nitro",
                color: FAILURE_COLOR
            };
    }
}

function buildEmbedAuthor(request: ClaimRequest) {
    const name = request.authorName ?? request.authorUsername;
    if (!name) return undefined;

    return {
        name,
        icon_url: request.authorAvatarUrl
    };
}

function buildClaimEmbed(result: WebhookResult, request: ClaimRequest, giftType: string | null, claimTimeMs: number | null): WebhookEmbed {
    const presentation = getResultPresentation(result);

    return {
        title: presentation.title,
        color: presentation.color,
        fields: buildClaimFields(request, giftType, claimTimeMs),
        timestamp: new Date().toISOString(),
        author: buildEmbedAuthor(request),
        footer: {
            text: WEBHOOK_NAME
        }
    };
}

function buildTestWebhookPayload(): WebhookPayload {
    return createPayload([
        {
            title: "NitroSniper Webhook Test",
            color: TEST_COLOR,
            description: "Your NitroSniper webhook is configured correctly.",
            timestamp: new Date().toISOString(),
            footer: {
                text: WEBHOOK_NAME
            }
        }
    ]);
}

function buildClaimWebhookPayload(
    result: WebhookResult,
    request: ClaimRequest,
    giftType: string | null,
    claimTimeMs: number | null
): WebhookPayload {
    return createPayload([
        buildClaimEmbed(result, request, giftType, claimTimeMs)
    ]);
}

function parseWebhookError(data: string, status: number) {
    if (!data) {
        return `Webhook request failed with status ${status}.`;
    }

    try {
        const body = JSON.parse(data) as { message?: string; errors?: unknown; };
        const detail = [
            body.message,
            body.errors ? JSON.stringify(body.errors) : null
        ]
            .filter(Boolean)
            .join(" ");

        return detail
            ? `Webhook request failed with status ${status}: ${detail}`
            : `Webhook request failed with status ${status}.`;
    } catch {
        return `Webhook request failed with status ${status}: ${data}`;
    }
}

async function postWebhook(url: URL, payload: WebhookPayload) {
    const { status, data } = await getNative().sendWebhook(url.toString(), JSON.stringify(payload));

    if (status < 200 || status >= 300) {
        throw new Error(parseWebhookError(data, status));
    }
}

export async function sendClaimWebhook(
    webhookUrl: string,
    result: WebhookResult,
    request: ClaimRequest,
    giftType: string | null,
    claimTimeMs: number | null = null
) {
    const url = parseWebhookUrl(webhookUrl);
    if (!url) return;

    await postWebhook(url, buildClaimWebhookPayload(result, request, giftType, claimTimeMs));
}

export async function sendTestWebhook(webhookUrl: string) {
    const url = parseWebhookUrl(webhookUrl);
    if (!url) {
        throw new Error("Webhook URL is empty.");
    }

    await postWebhook(url, buildTestWebhookPayload());
}

function buildCaptchaReloadWebhookPayload(stuckSeconds: number): WebhookPayload {
    return createPayload([
        {
            title: "Captcha Detected",
            color: CAPTCHA_COLOR,
            description: `A captcha has been stuck on screen for over ${stuckSeconds} seconds. Reloading Discord...`,
            timestamp: new Date().toISOString(),
            footer: {
                text: WEBHOOK_NAME
            }
        }
    ]);
}

export async function sendCaptchaReloadWebhook(webhookUrl: string, stuckSeconds: number) {
    const url = parseWebhookUrl(webhookUrl);
    if (!url) return;

    await postWebhook(url, buildCaptchaReloadWebhookPayload(stuckSeconds));
}
