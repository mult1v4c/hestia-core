// js/logger.js
// Centralized logger for consistent debugging

const config = {
    enabled: true, // Can be toggled via localStorage later
    prefix: "🔥 [Hestia]"
};

const styles = {
    info: "color: #7cafc2; font-weight: bold;",
    success: "color: #a1b56c; font-weight: bold;",
    warn: "color: #dc9656; font-weight: bold;",
    error: "color: #ab4642; font-weight: bold;"
};

export const logger = {
    info: (msg, ...args) => {
        if (!config.enabled) return;
        console.log(`%c${config.prefix} INFO:`, styles.info, msg, ...args);
    },

    success: (msg, ...args) => {
        if (!config.enabled) return;
        console.log(`%c${config.prefix} OK:`, styles.success, msg, ...args);
    },

    warn: (msg, ...args) => {
        if (!config.enabled) return;
        console.warn(`%c${config.prefix} WARN:`, styles.warn, msg, ...args);
    },

    error: (msg, ...args) => {
        console.error(`%c${config.prefix} ERROR:`, styles.error, msg, ...args);
    },

    // Group logs for cleaner console
    group: (label) => {
        if (!config.enabled) return;
        console.groupCollapsed(`%c${config.prefix} ${label}`, styles.info);
    },

    groupEnd: () => {
        if (!config.enabled) return;
        console.groupEnd();
    }
};