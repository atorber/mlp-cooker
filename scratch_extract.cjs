const fs = require('fs');
const path = require('path');

const dir = '.knowledge/百舸OpenAPI参考/分布式训练相关接口';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

console.log('# Missing Actions Info\n');

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  let url = '';
  let method = 'GET';
  let action = '';
  
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('GET ') || line.includes('POST ') || line.includes('PUT ') || line.includes('DELETE ')) {
       const m = line.match(/(GET|POST|PUT|DELETE)\s+(.*action=([\w]+).*)/i);
       if (m) {
          method = m[1].toUpperCase();
          url = m[2];
          action = m[3];
          break;
       }
    }
  }
  
  if (['DescribeJobs', 'DescribeJob', 'CreateJob', 'DeleteJob'].indexOf(action) === -1) {
    console.log(`- **${file.replace('.md', '')}** (\`${action}\`): ${method} ${url.split(' ')[0]}`);
  }
}
