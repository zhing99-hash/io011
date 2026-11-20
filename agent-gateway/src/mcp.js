import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { GatewayError } from './gateway.js';
import { registerQueryTools } from './mcp-tools.js';

function result(value, isError = false) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value, ...(isError ? { isError: true } : {}) };
}

/** Per-request SDK server, bound to a platform session or validated OAuth context. */
export async function handleMcpRequest(gateway, token, req, res, body) {
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'enterprise-agent-gateway', version: '0.1.0' });
    const actions = {
      get_my_profile: () => gateway.profile(token),
      list_authorized_targets: () => gateway.listAuthorizedTargets(token),
      check_submission_access: (args) => gateway.authorizeSubmission(token, args),
      get_file_review_status: (args) => gateway.getQuarantinedFileStatus(token, args.id),
    };
    registerQueryTools(server, async (name, args) => {
        try {
          gateway.assertSession(token);
          return result(actions[name](args));
        } catch (error) {
          return result({ error: error instanceof GatewayError ? error.code : 'INTERNAL_ERROR' }, true);
        }
    });
    return server;
  }, { responseMode: 'auto', maxRequestBodySize: 16 * 1024, legacy: 'stateless' });
  try { await toNodeHandler(handler, { maxRequestBodySize: 16 * 1024 })(req, res, body); }
  finally { await handler.close(); }
}
