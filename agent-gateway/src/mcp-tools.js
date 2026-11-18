import { z } from 'zod';

// The HTTPS service and local client connector expose the same limited catalog.
export const queryTools = [
  { name: 'get_my_profile', description: '查看当前已登录的平台用户身份。客户端名称为会话标签，不是软件身份证明。', schema: z.object({}).strict() },
  { name: 'list_authorized_targets', description: '列出当前用户被明确授权提交数据的目标及文件类型。', schema: z.object({}).strict() },
  { name: 'check_submission_access', description: '检查当前用户能否向指定目标提交指定类型；不上传或交付数据。',
    schema: z.object({ connectorId: z.string().uuid(), fileType: z.enum(['md', 'pdf', 'docx', 'xlsx', 'xml']) }).strict() },
  { name: 'get_file_review_status', description: '查看本人提交文件的隔离与审查状态；不会返回文件原文。', schema: z.object({ id: z.string().uuid() }).strict() },
];

export function registerQueryTools(server, call) {
  for (const tool of queryTools) server.registerTool(tool.name, {
    description: tool.description, inputSchema: tool.schema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, (args, context) => call(tool.name, args, context));
}
