/*
Made with ❤️ by neoarz
Edited with 💜 by N0_.q3
Cleanified with ❤️‍🩹 By VanityWya
I am not responsible for any damage caused by this plugin; use at your own risk
Vencord does not endorse/support this plugin (Works with Equicord as well)
dm @neoarz if u need help or have any questions
https://github.com/neoarz/NitroSniper
*/

import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";

import { startCaptchaWatcher, stopCaptchaWatcher } from "./captchaWatcher";
import { resolveGiftType } from "./giftCode";
import { settings } from "./settings";
import type { ClaimRequest, WebhookResult } from "./types";
import { sendClaimWebhook } from "./webhook";

const GIFT_LINK_REGEX = /(?:discord\.gift\/|discord\.com\/gifts?\/)([a-zA-Z0-9]{16,24})/;

const logger = new Logger("NitroSniper");
const GiftActions = findByPropsLazy("redeemGiftCode");

let startTime = 0;
let claiming = false;
const claimQueue: ClaimRequest[] = [];

function resetState() {
    startTime = Date.now();
    claimQueue.length = 0;
    claiming = false;
}

function toError(error: unknown) {
    return error instanceof Error ? error : new Error(String(error));
}

function isOwnMessage(message: Message) {
    return message.author?.id === UserStore.getCurrentUser()?.id;
}

function shouldSkipMessage(message: Message) {
    return settings.store.ignoreOwnGiftLinks && isOwnMessage(message);
}

function isMessageOlderThanStart(message: Message) {
    return new Date(message.timestamp).getTime() < startTime;
}

function extractGiftCode(content: string) {
    return content.match(GIFT_LINK_REGEX)?.[1] ?? null;
}

function createClaimRequest(message: Message): ClaimRequest | null {
    const code = message.content ? extractGiftCode(message.content) : null;
    if (!code) return null;

    const authorId = message.author?.id;
    const authorAvatar = message.author?.avatar;

    return {
        code,
        authorId,
        authorName: message.author?.globalName ?? message.author?.username,
        authorUsername: message.author?.username,
        authorAvatarUrl: authorId && authorAvatar
            ? `https://cdn.discordapp.com/avatars/${authorId}/${authorAvatar}.png?size=128`
            : undefined,
        channelId: message.channel_id,
        guildId: message.guild_id,
        messageId: message.id,
        messageTimestamp: message.timestamp
    };
}

function getClaimDurationMs(request: ClaimRequest): number | null {
    if (!request.messageTimestamp) return null;
    return Math.max(0, Date.now() - new Date(request.messageTimestamp).getTime());
}

function notifyClaim(result: WebhookResult, request: ClaimRequest, giftType: string | null) {
    void sendClaimWebhook(
        settings.store.webhookUrl,
        result,
        request,
        giftType,
        getClaimDurationMs(request)
    ).catch(webhookError => {
        logger.error("Failed to send NitroSniper webhook notification", webhookError);
    });
}

function continueQueue() {
    claiming = false;
    processQueue();
}

function handleClaimSuccess(request: ClaimRequest, giftType: Promise<string | null>) {
    logger.log(`Successfully redeemed code: ${request.code}`);
    void giftType.then(type => notifyClaim("claimed", request, type));
    continueQueue();
}

function handleClaimFailure(request: ClaimRequest, error: Error, giftType: Promise<string | null>) {
    logger.error(`Failed to redeem code: ${request.code}`, error);
    void giftType.then(type => notifyClaim("failed", request, type));
    continueQueue();
}

function processQueue() {
    if (claiming) return;

    const request = claimQueue.shift();
    if (!request) return;

    claiming = true;
    const giftType = settings.store.webhookUrl.trim()
        ? resolveGiftType(request.code)
        : Promise.resolve(null);

    GiftActions.redeemGiftCode({
        code: request.code,
        onRedeemed: () => handleClaimSuccess(request, giftType),
        onError: (error: unknown) => handleClaimFailure(request, toError(error), giftType)
    });
}

export default definePlugin({
    name: "NitroSniper",
    description: "Automatically redeems Nitro gift links sent in chat",
    authors: [
    {
        name: "neoarz",
        id: 218675193592283137n
    },
    {
        name: "n0_.q3",
        id: 957164619061932045n
    },
    {
        name: "Vanity",
        id: 1058197096915808396n
    }
    ],

    tags: ["Chat", "Utility"],
    searchTerms: ["nitro", "gift", "redeem", "snipe"],
    settings,

    start() {
        resetState();
        startCaptchaWatcher();
    },

    stop() {
        stopCaptchaWatcher();
    },

    flux: {
        MESSAGE_CREATE({ message }: { message: Message; }) {
            if (!message.content || shouldSkipMessage(message) || isMessageOlderThanStart(message)) return;

            const request = createClaimRequest(message);
            if (!request) return;

            claimQueue.push(request);
            processQueue();
        }
    }
});
