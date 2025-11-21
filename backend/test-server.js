#!/usr/bin/env node

const http = require('http');

/**
 * 简单的API测试脚本
 */
async function testAPIs() {
  const baseUrl = 'http://localhost:5002';

  const tests = [
    {
      name: '健康检查',
      method: 'GET',
      path: '/api/health',
    },
    {
      name: '登录测试 - Token方式',
      method: 'POST',
      path: '/api/login/account',
      body: { token: '123' },
    },
    {
      name: '登录测试 - 用户名密码方式',
      method: 'POST',
      path: '/api/login/account',
      body: { username: 'admin', password: 'ant.design' },
    },
    {
      name: '获取当前用户信息',
      method: 'GET',
      path: '/api/currentUser',
      headers: { Authorization: 'Bearer 123' },
    },
  ];

  console.log('🚀 开始API测试...\n');

  for (const test of tests) {
    try {
      console.log(`📝 测试: ${test.name}`);
      console.log(`   ${test.method} ${test.path}`);

      const options = {
        hostname: 'localhost',
        port: 5002,
        path: test.path,
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          ...test.headers,
        },
      };

      const response = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
            });
          });
        });

        req.on('error', reject);

        if (test.body) {
          req.write(JSON.stringify(test.body));
        }

        req.end();
      });

      console.log(`   ✅ 状态码: ${response.statusCode}`);
      console.log(`   📄 响应: ${response.body.substring(0, 100)}${response.body.length > 100 ? '...' : ''}`);

    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
    }

    console.log('');
  }

  console.log('✨ API测试完成！');
  console.log('\n💡 提示: 如果所有测试都失败，请确保服务器正在运行:');
  console.log('   npm run dev');
}

// 运行测试
testAPIs().catch(console.error);