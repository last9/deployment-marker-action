"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectAttributes = collectAttributes;
const logger_1 = require("./utils/logger");
function collectAttributes(context, config) {
    const logger = (0, logger_1.getLogger)();
    const attributes = {};
    if (config.includeGitHub) {
        try {
            const repo = context.getRepository();
            const workflow = context.getWorkflow();
            const commit = context.getCommit();
            const actor = context.getActor();
            const event = context.getEvent();
            attributes['repository'] = repo.fullName;
            attributes['service_name'] = repo.repo;
            attributes['workflow'] = workflow.name;
            attributes['run_id'] = workflow.runId.toString();
            attributes['run_number'] = workflow.runNumber.toString();
            attributes['run_attempt'] = workflow.runAttempt.toString();
            attributes['commit_sha'] = commit.sha;
            attributes['ref'] = commit.ref;
            attributes['commit_message'] = commit.message;
            attributes['actor'] = actor.username;
            attributes['event_name'] = event.name;
            logger.debug('Collected GitHub attributes', {
                count: Object.keys(attributes).length
            });
        }
        catch (error) {
            logger.warning('Failed to collect some GitHub attributes', {
                error: error.message
            });
        }
    }
    for (const [key, value] of Object.entries(config.customAttributes)) {
        attributes[key] = value;
    }
    logger.info('Attributes collected', {
        total: Object.keys(attributes).length,
        github: config.includeGitHub,
        custom: Object.keys(config.customAttributes).length
    });
    return attributes;
}
//# sourceMappingURL=attribute-collector.js.map