import { startServer } from './app.js';
import { validateConfig } from './config/index.js';

// 验证配置
validateConfig();

// 启动服务器
startServer();
