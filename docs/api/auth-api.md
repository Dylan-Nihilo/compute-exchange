# 认证 Auth API

> 当前实现说明：手机号短信验证码注册、登录已进入联调；邮箱验证码保持待开放；微信扫码已接入，未配置时禁用，详见 [微信登录](wechat-login-api.md)。账号密码与企业微信后置。

**Base**: `http://localhost:8080/api/v1` | **Auth**: `/auth/me` 需 `Bearer <token>`

---

## POST /auth/sms/code · 获取短信验证码

短信供应商、Cap Siteverify 与 Redis 验证码存储必须完成配置。`captcha_token` 由 Cap programmatic mode 生成，只能在本接口消费一次。

```bash
curl -X POST http://localhost:8080/api/v1/auth/sms/code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","purpose":"register","captcha_token":"..."}'
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| phone | string | ✅ | 中国大陆手机号 |
| purpose | string | ✅ | `register` 或 `login` |
| captcha_token | string | ✅ | 未消费的 Cap token |

**成功** `200`
```json
{"code":0,"message":"success","data":{"expires_in":300,"resend_after":60}}
```

本地 Docker 的 debug preview 模式会额外返回 `data.preview_code`。前端开发环境会显示并自动填入该验证码；生产响应不得包含此字段。

`expires_in` 是验证码有效期，`resend_after` 是可重新获取的倒计时，两者不可混用。

---

## POST /auth/register · 手机号注册并建立会话

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","sms_code":"123456","agree_tos":true}'
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| phone | string | ✅ | 手机号 |
| sms_code | string | ✅ | 短信验证码 |
| agree_tos | bool | ✅ | 用户主动同意服务条款与隐私规则 |

**成功** `200`
```json
{"code":0,"message":"success","data":{
  "access_token":"eyJ...","refresh_token":"eyJ...","expires_in":900,
  "user":{"id":1,"phone":"138****8000","roles":["buyer"]}
}}
```

---

## POST /auth/sms/login · 手机号验证码登录

```bash
curl -X POST http://localhost:8080/api/v1/auth/sms/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","sms_code":"123456"}'
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| phone | string | ✅ | 已注册手机号 |
| sms_code | string | ✅ | 登录用途的短信验证码 |

**成功** `200`
```json
{"code":0,"data":{
  "access_token":"eyJ...","refresh_token":"eyJ...","expires_in":900,
  "user":{"id":1,"phone":"138****8000","roles":["buyer"]}
}}
```
> 浏览器前端通过同源 BFF 将 token 写入 HttpOnly Cookie，不把 token 暴露给客户端状态或 localStorage。

`POST /auth/login` 账号密码登录尚未开放公开路由，不属于当前前端入口。

---

## POST /auth/refresh · 刷新 Token

`refresh_token` 仅能成功使用一次；每次成功刷新都会返回新的 `refresh_token`，并立即使旧 token 失效。

```
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJ..."}'
```

---

## POST /auth/logout · 登出

```
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJ..."}'
```

浏览器端 BFF 会同时撤销 access/refresh token，随后清除全部认证 Cookie。该接口支持幂等登出；access token 已过期时仍可用签名有效的 `refresh_token` 完成撤销。

---

## GET /auth/me · 当前用户

```
curl http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

**响应**
```json
{"code":0,"data":{"id":1,"phone":"138****8000","email":"","roles":["buyer"]}}
```

---

## POST /user/kyc/enterprise · 企业认证

前端通过同源 `/api/auth/kyc/enterprise` BFF，以 `multipart/form-data` 向后端提交企业主体、法定代表人、对公账户和营业执照文件。文件支持 PDF/JPG/PNG，最大 5MB；BFF 只转发 HttpOnly Cookie 对应的 Bearer token，不在浏览器状态中保存 token。

试运行阶段审核结果仍自动通过，但表单字段和执照文件均持久化到本地 MySQL，不再只保存文件名。

---

## 通用错误

| code | 说明 |
|:----:|------|
| 40001 | 参数错误 |
| 40100 | 未认证/token无效 |
| 40101 | token过期 |
| 40300 | 账号被冻结 |
| 40900 | 手机号已注册 |
| 42900 | 请求过于频繁 |
