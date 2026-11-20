import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { parseTree, findNodeAtLocation, modify, applyEdits } from 'jsonc-parser';
import { parseDocument, isSeq, isMap, isScalar, isAlias, visit } from 'yaml';

const SERVER = 'enterprise_gateway';
const ENTRY = 'mcp-enterprise-gateway';

function jsonTree(text) {
  const errors = [];
  const root = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false });
  if (errors.length || root?.type !== 'object') throw new Error('INVALID_EXISTING_JSON');
  const check = (node, depth = 0) => {
    if (depth > 64) throw new Error('CONFIG_TOO_DEEP');
    if (node.type === 'object') {
      const keys = node.children.map((child) => child.children[0].value);
      if (new Set(keys).size !== keys.length) throw new Error('DUPLICATE_JSON_KEY');
    }
    for (const child of node.children ?? []) check(child, depth + 1);
  };
  check(root); return root;
}

export function addWorkBuddyServer(source, server) {
  const text = source ?? '{}\n';
  const root = jsonTree(text);
  const servers = findNodeAtLocation(root, ['mcpServers']);
  if (servers && servers.type !== 'object') throw new Error('INVALID_MCP_SERVERS');
  if (findNodeAtLocation(root, ['mcpServers', SERVER])) throw new Error('CLIENT_SERVER_CONFLICT');
  const edited = applyEdits(text, modify(text, ['mcpServers', SERVER], server, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: text.includes('\r\n') ? '\r\n' : '\n' },
  }));
  jsonTree(edited); return edited;
}

export function addCodexServer(source, server, toolTimeoutSec) {
  const text = source ?? '';
  const options = { maxDepth: 64, integersAsBigInt: true };
  let parsed;
  try { parsed = parseToml(text, options); } catch { throw new Error('INVALID_EXISTING_TOML'); }
  if (parsed.mcp_servers && (Array.isArray(parsed.mcp_servers) || typeof parsed.mcp_servers !== 'object')) throw new Error('INVALID_MCP_SERVERS');
  if (Object.hasOwn(parsed.mcp_servers ?? {}, SERVER)) throw new Error('CLIENT_SERVER_CONFLICT');
  // Keep all existing text, comments, dates and integer representations intact.
  const block = stringifyToml({ mcp_servers: { [SERVER]: { ...server, startup_timeout_sec: 20, tool_timeout_sec: toolTimeoutSec } } });
  const edited = text + (text.endsWith('\n') || !text ? '\n' : '\n\n') + '# Enterprise Agent Gateway\n' + block;
  try { parseToml(edited, options); } catch { throw new Error('UNSUPPORTED_TOML_LAYOUT'); }
  return edited;
}

export function addHarnessPatch(source, server, timeoutMs) {
  const doc = parseDocument(source ?? '[]\n', { strict: true, uniqueKeys: true, intAsBigInt: true });
  if (doc.contents === null) doc.contents = doc.createNode([]);
  if (doc.errors.length || !isSeq(doc.contents)) throw new Error('INVALID_HARNESS_PATCH');
  // Inspect the syntax tree without evaluating !!js or expanding aliases.
  let nodes = 0;
  visit(doc, (_key, node, path) => {
    if (++nodes > 10000 || path.length > 64) throw new Error('CONFIG_TOO_DEEP');
    if (isAlias(node)) throw new Error('UNSUPPORTED_YAML_ALIAS');
    if (node?.tag && !['tag:yaml.org,2002:js', 'tag:yaml.org,2002:str', 'tag:yaml.org,2002:map', 'tag:yaml.org,2002:seq'].includes(node.tag)) throw new Error('UNSUPPORTED_YAML_TAG');
    if (isScalar(node) && [ENTRY, SERVER].includes(node.value)) throw new Error('CLIENT_SERVER_CONFLICT');
  });
  if (doc.warnings.some((warning) => warning.code !== 'TAG_RESOLVE_FAILED')) throw new Error('INVALID_HARNESS_PATCH');
  for (const node of doc.contents.items) if (!isMap(node)) throw new Error('INVALID_HARNESS_PATCH');
  doc.contents.flow = false;
  doc.add({ insert: [{ id: ENTRY, name: '@deepseek-ai/dsh-mcp-client', config: {
    serverName: SERVER, transport: 'stdio', ...server, startupTimeoutMs: 20000, toolCallTimeoutMs: timeoutMs,
  } }] });
  const edited = doc.toString({ lineWidth: 0 });
  if (parseDocument(edited, { strict: true, uniqueKeys: true }).errors.length) throw new Error('INVALID_HARNESS_PATCH');
  return edited;
}
