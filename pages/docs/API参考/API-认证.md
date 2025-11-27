---
sidebar_position: 2
---

# 认证相关

## 接口列表

### 不需要认证的接口

#### 用户登录
- **接口**：`POST /api/login/account`
- **说明**：使用 AK/SK 进行登录认证

#### 用户登出
- **接口**：`POST /api/login/outLogin`
- **说明**：退出登录，清除认证信息

#### 获取验证码
- **接口**：`GET /api/login/captcha`
- **说明**：获取登录验证码

### 需要认证的接口

#### 获取当前用户信息
- **接口**：`GET /api/currentUser`
- **说明**：获取当前登录用户的信息

## 接口详情

### POST /api/login/account

用户登录接口，使用 AK/SK 进行认证。

**请求示例：**

```json
{
  "accessKey": "your-access-key",
  "secretKey": "your-secret-key"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "token": "xxx",
    "userInfo": {
      "name": "admin"
    }
  },
  "message": "登录成功"
}
```

### POST /api/login/outLogin

用户登出接口，清除认证信息。

**响应示例：**

```json
{
  "success": true,
  "message": "登出成功"
}
```

### GET /api/login/captcha

获取登录验证码。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "captcha": "base64-image-data"
  }
}
```

### GET /api/currentUser

获取当前登录用户的信息（需要认证）。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "name": "admin",
    "avatar": "url",
    "access": "admin"
  }
}
```

