"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const errors_1 = require("./utils/errors");
const logger_1 = require("./utils/logger");
function loadConfig(context) {
    const logger = (0, logger_1.getLogger)();
    logger.startGroup('Loading configuration');
    try {
        const refreshToken = context.getInput('refresh_token', true);
        const orgSlug = context.getInput('org_slug', true);
        context.setSecret(refreshToken);
        const apiBaseUrl = context.getInput('api_base_url') || 'https://app.last9.io';
        const eventName = context.getInput('event_name') || 'deployment';
        const eventState = parseEventState(context.getInput('event_state') || 'stop');
        const dataSourceName = context.getInput('data_source_name') || undefined;
        const includeGitHubAttributes = parseBoolean(context.getInput('include_github_attributes') || 'true');
        const customAttributes = parseCustomAttributes(context.getInput('custom_attributes'));
        const maxRetryAttempts = parseInt(context.getInput('max_retry_attempts') || '3', 10);
        const retryBackoffMs = parseInt(context.getInput('retry_backoff_ms') || '1000', 10);
        const maxRetryBackoffMs = parseInt(context.getInput('max_retry_backoff_ms') || '30000', 10);
        const config = {
            apiBaseUrl,
            orgSlug,
            refreshToken,
            dataSourceName,
            eventName,
            eventState,
            includeGitHubAttributes,
            customAttributes,
            maxRetryAttempts,
            retryBackoffMs,
            maxRetryBackoffMs
        };
        logger.info('Configuration loaded successfully', {
            orgSlug,
            eventName,
            eventState,
            includeGitHubAttributes,
            customAttributeCount: Object.keys(customAttributes).length
        });
        return config;
    }
    finally {
        logger.endGroup();
    }
}
function parseEventState(value) {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'start' || normalized === 'stop' || normalized === 'both') {
        return normalized;
    }
    throw new errors_1.InvalidInputError(`Invalid event_state: ${value}. Must be 'start', 'stop', or 'both'`);
}
function parseBoolean(value) {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
}
function parseCustomAttributes(value) {
    if (!value || value.trim() === '') {
        return {};
    }
    try {
        const parsed = JSON.parse(value);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new errors_1.ConfigError('custom_attributes must be a JSON object');
        }
        for (const [key, val] of Object.entries(parsed)) {
            const valType = typeof val;
            if (valType !== 'string' && valType !== 'number' && valType !== 'boolean') {
                throw new errors_1.ConfigError(`Invalid attribute value for '${key}': must be string, number, or boolean`);
            }
        }
        return parsed;
    }
    catch (error) {
        if (error instanceof errors_1.ConfigError) {
            throw error;
        }
        throw new errors_1.ConfigError(`Failed to parse custom_attributes as JSON: ${error.message}`);
    }
}
//# sourceMappingURL=config.js.map