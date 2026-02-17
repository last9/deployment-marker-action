"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeploymentEvent = createDeploymentEvent;
const time_1 = require("./utils/time");
function createDeploymentEvent(state, attributes, config) {
    return {
        event_name: config.eventName,
        event_state: state,
        timestamp: (0, time_1.getCurrentTimestamp)(),
        data_source_name: config.dataSourceName,
        attributes
    };
}
//# sourceMappingURL=event-builder.js.map