import yaml

with open('gateway/docs/openapi.yaml', 'r') as f:
    data = yaml.safe_load(f)

# Update server
data['servers'][0]['url'] = 'http://localhost:3000/v1'

# Update components/parameters
if 'components' not in data:
    data['components'] = {}
if 'parameters' not in data['components']:
    data['components']['parameters'] = {}

data['components']['parameters']['RegionParam']['in'] = 'header'
data['components']['parameters']['RegionParam']['required'] = True
data['components']['parameters']['RegionParam']['description'] = '区域代码'

data['components']['parameters']['AkParam'] = {
    'name': 'ak',
    'in': 'header',
    'required': True,
    'description': '百度云 Access Key',
    'schema': {'type': 'string'}
}
data['components']['parameters']['SkParam'] = {
    'name': 'sk',
    'in': 'header',
    'required': True,
    'description': '百度云 Secret Key',
    'schema': {'type': 'string'}
}

# Update all paths to include AkParam and SkParam
for path, methods in data.get('paths', {}).items():
    for method, details in methods.items():
        if 'parameters' in details:
            # Check if AkParam is already there
            has_ak = any(p.get('$ref') == '#/components/parameters/AkParam' for p in details['parameters'] if isinstance(p, dict))
            if not has_ak:
                details['parameters'].append({'$ref': '#/components/parameters/AkParam'})
                details['parameters'].append({'$ref': '#/components/parameters/SkParam'})

# Add /bos path
data['paths']['/bos'] = {
    'get': {
        'tags': ['BOS'],
        'summary': '查询存储桶',
        'operationId': 'describeBuckets',
        'parameters': [
            {'name': 'action', 'in': 'query', 'required': True, 'schema': {'type': 'string', 'enum': ['DescribeBuckets']}},
            {'$ref': '#/components/parameters/RegionParam'},
            {'$ref': '#/components/parameters/AkParam'},
            {'$ref': '#/components/parameters/SkParam'}
        ],
        'responses': {'200': {'description': '成功'}}
    },
    'post': {
        'tags': ['BOS'],
        'summary': '存储桶操作',
        'operationId': 'bosActions',
        'parameters': [
            {'name': 'action', 'in': 'query', 'required': True, 'schema': {'type': 'string'}},
            {'$ref': '#/components/parameters/RegionParam'},
            {'$ref': '#/components/parameters/AkParam'},
            {'$ref': '#/components/parameters/SkParam'}
        ],
        'responses': {'200': {'description': '成功'}}
    }
}

if 'BOS' not in [t['name'] for t in data.get('tags', [])]:
    data['tags'].append({'name': 'BOS', 'description': '对象存储接口'})

# Add /aihc paths to mirror /jobs etc (we actually just rename them to keep models separated logically in OpenAPI? No, standard OpenAPI does not allow duplicate paths like /aihc. We will keep /jobs /services for logical grouping but note that they are forwarded via /aihc URL rewriting)
# Wait, if we keep /jobs, users will test via Swagger UI to /v1/jobs which we didn't hook. Wait, in swagger UI, we can change paths...
# The simplest approach is to rename all paths from /jobs to /aihc/jobs? No, we don't have /aihc/jobs.
# This script will just rewrite them to /aihc?action=... NO, the paths must be unique!
# We can prepend `/aihc:` to the path logic inside swagger, e.g., `/aihc?_group=jobs` to trick swagger, because we ignore `_group`.
# Let's do `/aihc?_type=jobs` for swagger uniqueness.
new_paths = {}
for path, methods in data.get('paths', {}).items():
    if path == '/bos':
        new_paths['/bos'] = methods
    elif path.startswith('/aihc'):
        new_paths[path] = methods
    else:
        new_paths[f'/aihc  # {path.strip("/") }'] = methods

data['paths'] = new_paths

with open('gateway/docs/openapi.yaml', 'w') as f:
    yaml.dump(data, f, allow_unicode=True, sort_keys=False)
