"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
const errors_1 = require("./utils/errors");
const time_1 = require("./utils/time");
const logger_1 = require("./utils/logger");
async function withRetry(operation, config, operationName = 'operation') {
    const logger = (0, logger_1.getLogger)();
    let lastError;
    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        try {
            const result = await operation();
            if (attempt > 0) {
                logger.info(`${operationName} succeeded after ${attempt} retries`);
            }
            return result;
        }
        catch (error) {
            lastError = error;
            if (attempt === config.maxAttempts - 1) {
                break;
            }
            if (!(0, errors_1.isRetryableError)(error)) {
                logger.debug(`${operationName} failed with non-retryable error`, {
                    error: lastError.message
                });
                throw error;
            }
            const backoffTime = (0, time_1.calculateBackoff)(attempt, config.backoffMs, config.maxBackoffMs);
            logger.warning(`${operationName} failed, retrying in ${backoffTime}ms`, {
                attempt: attempt + 1,
                maxAttempts: config.maxAttempts,
                error: lastError.message
            });
            await (0, time_1.sleep)(backoffTime);
        }
    }
    logger.error(`${operationName} failed after ${config.maxAttempts} attempts`, lastError);
    throw lastError;
}
//# sourceMappingURL=retry.js.map