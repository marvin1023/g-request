# 请求库

一种封装了一些常见的业务逻辑的请求库，如请求参数与返回数据处理，业务逻辑码（retcode）处理，失败重试，统一成功失败处理等。默认支持小程序与 WEB 请求。

## 特征

- baseUrl 设置
- 失败后自动 2 次重启
- retcode 字段指定及白名单处理
- request 请求参数处理
- response 返回数据处理
- 成功或失败的统一处理，见下面的 thenHandler 和 catchHandler
- 支持取消发送请求
- 请求适配器自定义
- 其他定制

## 使用

### 1、业务实例化并处理公有逻辑

```js
// gRequest.js
// ------------------------------------
import GRequest from 'g-request';

// 实例化（默认参数）
const gReqeust = new GRequest({
  // 所有的非请求（wx.request / XMLHttpRequest）所需参数，统一挂到 ext 属性上
  ext: {
    baseUrl: '',
    xRequestId: true, // header 头部加上 x-request-id，方便查看日志，默认开启
    xRequestTime: true, // 记录请求耗时，默认开始
    repeatNum: 2, // 默认失败自动重试 2 次
    timeout: 0, // 默认请求本身支持 timeout 参数的不需要这个，设置为 0 即可
    retcodeKey: 'retcode', // retcode 字段，false 表示不启用该功能
    retcodeWhiteList: [], // retcode 白名单，默认空数组为retcode为0进入then，其余为进入catch，false 表示不启用该功能，retcodeKey 为 false 也没有该功能
    logicErrorMsgKey: 'message', // 逻辑错误文本字段，默认为 message 字段
    LoginErrorMsgUnknown: 'Unknown Error', // 逻辑错误文本默认，如果后台没有返回具体的错误，则显示该文本
    // adapter: 'xxx', // 默认不需要设置，会自动适配 WEB 还是小程序
  },
});

// 插件是处理请求参数，可使用多个 use，每个 use 函数按注册顺序依次进入管道处理，最后返回 ctx
// 如小程序可再次设置 header 的 cookie 字段，用于鉴权
gRequest.req.use((ctx) => {
  // 处理 req ...
  // const { req } = ctx;

  // 最后记得 return ctx
  return ctx;
});

// 插件式处理返回数据，同上请求参数的处理
gRequest.res.use((ctx) => {
  // 处理 res ...
  // ctx.res = {};

  // 最后记得 return ctx
  return ctx;
});

// 统一成功处理，如后台数据下划线转驼峰处理
gRequest.thenHandler = (ctx) => {
  // 返回下一步进入成功的数据
  return ctx.res;
};

// 统一错误处理：如 toast 提示，上报错误等
gRequest.catchHandler = (err, ctx) => {
  // 处理逻辑

  // 最后一定要返回错误，用于串起错误链
  return Promise.reject(err);
};

// 导出
export default gReqeust;
```

### 2、具体发送请求

导入 `gRequest.js`，调用其方法发送具体请求

```js
// api.js
// ------------------------------------

import gReqeust from './gReqeust';

// request 请求
gReqeust.request({
  url: 'xxx',
  method: 'POST', // 如不设置，默认为 GET 请求
  // 设置 header
  header: {
    Cookie: 'xxx', // 可手动设置 Cookie
  },
  data: {
    a: 1,
    b: 2,
  },
  // 可覆盖 gReqeust 实例化的 ext 设置
  ext: {
    repeatNum: 0, // 失败不重试
    taskName: 'hello', // 该请求任务名称，用于取消请求，如不设置，则默认为 url
  },
});

// get 请求
gReqeust.get({
  url: 'xxx',
  // 自动拼成 query
  data: {
    a: 1,
    b: 2,
  },
  ext: {
    retcodeKey: 'code', // 这条请求的 retcodeKey 是 code 字段
  },
});

// post 请求
gReqeust.post({
  url: 'xxx',
  data: {
    a: 1,
    b: 2,
  },
  ext: {
    retcodeWhiteList: [3455, 6784], // retcode 为 0， 3455，6784 将会按成功处理，其余按失败处理
  },
});
```

### 取消正在发送中的请求

```js
// 取消单个 taskName 为 hello 的请求
gReqeust.task?.hello.abort();

// 取消所有正在发送中的请求
gReqeust.abort();
```

### 其他定制

#### 默认驼峰处理

以对返回的后台数据进行默认的转驼峰处理为例，在实例化的时候 `ext` 属性中添加 `camelcase`

```js
import humps from 'humps';

const gReqeust = new GRequest({
  ext: {
    ...
    camelcase: true,
  },
});

gReqeust.res.use((ctx) => {
  const { ext } = ctx;
  // 默认如果 camelcase 为 true，则自动进行转驼峰处理
  if (ext.camelcase) {
    ctx.res.data = humps.camelizeKeys(ctx.res.data);
  }

  return ctx;
})
```

#### 小程序请求失败默认提示

```js
const gReqeust = new GRequest({
  ext: {
    ...
    hasFailToast: true,
  },
});

gReqeust.catchHandler = (err, ctx) => {
  if (ctx.ext.hasFailToast) {
    const { message, retcode, type, statusCode } = err || {};
    const codeText = retcode ? `(${retcode})` : '';

    if (message) {
      wx.showToast({
        title: type === 'REQUEST_ERROR_FAIL' ? '请求失败' : `${message}${codeText}`,
        icon: 'none',
      });
    }
  }

  return Promise.reject(err);
}
```
