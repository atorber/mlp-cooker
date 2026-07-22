const fs = require('fs');
const path = require('path');

const openapiPath = path.join(__dirname, '../docs/openapi.yaml');
let content = fs.readFileSync(openapiPath, 'utf8');

// 1. URLs
content = content.replace('url: http://localhost:3000/api/v1', 'url: http://localhost:3000/v1');

// 2. Add /bos to paths (we'll just append it before components section)
if (!content.includes('/bos:')) {
  const bosPathString = `
  /bos:
    get:
      tags:
        - BOS
      summary: 查询存储桶
      operationId: describeBuckets
      parameters:
        - name: action
          in: query
          required: true
          schema:
            type: string
            enum: [DescribeBuckets]
        - $ref: '#/components/parameters/RegionParam'
        - $ref: '#/components/parameters/AkParam'
        - $ref: '#/components/parameters/SkParam'
      responses:
        '200':
          description: 成功
    post:
      tags:
        - BOS
      summary: 存储桶操作
      operationId: bosActions
      parameters:
        - name: action
          in: query
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/RegionParam'
        - $ref: '#/components/parameters/AkParam'
        - $ref: '#/components/parameters/SkParam'
      responses:
        '200':
          description: 成功
components:`;
  content = content.replace('components:', bosPathString);
}

if (!content.includes('- name: BOS')) {
    const tagsReplacement = `tags:
  - name: BOS
    description: BOS 对象存储接口
  - name: Jobs`;
    content = content.replace('tags:\n  - name: Jobs', tagsReplacement);
}

// 3. Components Update (RegionParam, AkParam, SkParam)
const regionParamString = `
  parameters:
    RegionParam:
      name: region
      in: header
      required: true
      description: 区域代码
      schema:
        type: string
        enum: [bj, gz, su, bd, fwh, yq]
        default: bd
    AkParam:
      name: ak
      in: header
      required: true
      description: 百度云 Access Key
      schema:
        type: string
    SkParam:
      name: sk
      in: header
      required: true
      description: 百度云 Secret Key
      schema:
        type: string`;
content = content.replace(/parameters:\s+RegionParam:[^]*?default: bd/, regionParamString.replace(/^\n/, ''));

// 4. Inject AkParam, SkParam to ALL other requests
// Regex pattern to insert under RegionParam
content = content.replace(/- \$ref:\s*'#\/components\/parameters\/RegionParam'/g, `- $ref: '#/components/parameters/RegionParam'\n        - $ref: '#/components/parameters/AkParam'\n        - $ref: '#/components/parameters/SkParam'`);

// Ensure we didn't duplicate them multiple times if run twice
content = content.replace(/(\s*- \$ref: '#\/components\/parameters\/AkParam'\n\s*- \$ref: '#\/components\/parameters\/SkParam'){2,}/g, '\n        - $ref: '#/components/parameters/AkParam'\n        - $ref: '#/components/parameters/SkParam'');

// 5. Change path URLs from /jobs to /aihc/jobs (as workaround for swagger duplicate paths limitation)
content = content.replace(/  \/jobs:/g, '  /aihc/jobs:');
content = content.replace(/  \/services:/g, '  /aihc/services:');
content = content.replace(/  \/dev-instances:/g, '  /aihc/dev-instances:');
content = content.replace(/  \/datasets:/g, '  /aihc/datasets:');
content = content.replace(/  \/models:/g, '  /aihc/models:');
content = content.replace(/  \/resource-pools:/g, '  /aihc/resource-pools:');

fs.writeFileSync(openapiPath, content, 'utf8');
console.log('OpenAPI updated successfully!');
