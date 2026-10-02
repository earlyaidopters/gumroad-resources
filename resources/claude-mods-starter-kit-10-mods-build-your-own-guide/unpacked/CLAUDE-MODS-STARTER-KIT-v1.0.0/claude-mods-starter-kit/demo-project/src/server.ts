import config from '../config/config.json';
export const port = config.port;
export function describeServer() { return `Demo server uses port ${port}`; }
