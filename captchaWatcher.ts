/*
Made with 💜 by N0_.q3
Cleanified with ❤️‍🩹 by Vanitywya
I am not responsible for any damage caused by this plugin; use at your own risk
Vencord does not endorse/support this plugin (Works with Equicord as well)
dm @N0_.q3 if u need help or have any questions
https://github.com/xmimiez/NitroSniper
*/
import { Logger } from "@utils/Logger";

import { settings } from "./settings";
import { sendCaptchaReloadWebhook } from "./webhook";

const logger = new Logger("NitroSniper");

const POLL_INTERVAL_MS = 500;
const MIN_CAPTCHA_SIZE_PX = 50;
const MIN_FOREGROUND_Z_INDEX = 100;

const CAPTCHA_IFRAME_SELECTORS = [
    'iframe[src*="hcaptcha.com"]',
    'iframe[src*="newassets.hcaptcha.com"]',
    'iframe[src*="recaptcha"]'
];

const OVERLAY_CONTAINER_SELECTORS = [
    '[class*="modal"]',
    '[role="dialog"]',
    '[class*="popout"]',
    '[class*="layer"]'
];

let pollTimer: ReturnType<typeof setInterval> | null = null;
let captchaSeenAt: number | null = null;
let reloading = false;

function isVisibleElement(element: Element, minSize = MIN_CAPTCHA_SIZE_PX) {
    const rect = element.getBoundingClientRect();
    if (rect.width < minSize || rect.height < minSize) return false;
    if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) {
        return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none"
        && style.visibility !== "hidden"
        && Number.parseFloat(style.opacity || "1") > 0;
}

function getEffectiveZIndex(element: Element) {
    let highest = 0;
    let current: Element | null = element;

    while (current) {
        const zIndex = Number.parseInt(window.getComputedStyle(current).zIndex, 10);
        if (!Number.isNaN(zIndex)) highest = Math.max(highest, zIndex);
        current = current.parentElement;
    }

    return highest;
}

function isCenteredOverlay(element: Element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return rect.width >= 200
        && rect.height >= 100
        && centerX > window.innerWidth * 0.2
        && centerX < window.innerWidth * 0.8
        && centerY > window.innerHeight * 0.15
        && centerY < window.innerHeight * 0.85;
}

function isForegroundCaptchaElement(element: Element) {
    if (!isVisibleElement(element)) return false;

    if (getEffectiveZIndex(element) >= MIN_FOREGROUND_Z_INDEX) return true;
    if (element.closest(OVERLAY_CONTAINER_SELECTORS.join(",")) != null) return true;

    return isCenteredOverlay(element);
}

function hasVisibleCaptchaIframe() {
    for (const selector of CAPTCHA_IFRAME_SELECTORS) {
        for (const element of document.querySelectorAll(selector)) {
            if (isForegroundCaptchaElement(element)) return true;
        }
    }

    return false;
}

function hasVisibleCaptchaPrompt() {
    for (const selector of OVERLAY_CONTAINER_SELECTORS) {
        for (const element of document.querySelectorAll(selector)) {
            if (!isVisibleElement(element, 150)) continue;

            const text = element.textContent ?? "";
            if (!/are you human|complete the captcha/i.test(text)) continue;
            if (element.querySelector(CAPTCHA_IFRAME_SELECTORS.join(",")) != null) return true;
        }
    }

    return false;
}

function isCaptchaOnScreen() {
    return hasVisibleCaptchaIframe() || hasVisibleCaptchaPrompt();
}

async function reloadForCaptcha(stuckSeconds: number) {
    if (reloading) return;

    reloading = true;
    logger.warn(`Captcha visible for ${stuckSeconds}s, reloading Discord...`);

    const webhookUrl = settings.store.webhookUrl.trim();
    if (webhookUrl) {
        try {
            await sendCaptchaReloadWebhook(webhookUrl, stuckSeconds);
        } catch (error) {
            logger.error("Failed to send captcha reload webhook", error);
        }
    }

    window.location.reload();
}

function resetCaptchaTimer() {
    captchaSeenAt = null;
}

function tick() {
    if (!settings.store.captchaAutoReload) {
        resetCaptchaTimer();
        return;
    }

    const stuckMs = Math.max(1, settings.store.captchaStuckSeconds) * 1000;

    if (!isCaptchaOnScreen()) {
        resetCaptchaTimer();
        return;
    }

    if (captchaSeenAt === null) {
        captchaSeenAt = Date.now();
        return;
    }

    if (Date.now() - captchaSeenAt >= stuckMs) {
        void reloadForCaptcha(settings.store.captchaStuckSeconds);
    }
}

export function startCaptchaWatcher() {
    stopCaptchaWatcher();
    pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

export function stopCaptchaWatcher() {
    if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    reloading = false;
    resetCaptchaTimer();
}
