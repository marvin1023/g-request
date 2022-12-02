# 请求库

一种封装了一些常见的业务逻辑的请求库，如请求参数与返回数据处理，业务逻辑码（retcode）处理，失败重试，统一成功失败处理等。默认支持小程序与 WEB 请求。

## 特征

- baseUrl 设置
- 失败后自动 2 次重启
- 业务返回码 retcode 字段指定及白名单处理
- request 请求参数插件处理
- response 返回数据插件处理
- 不论是成功还是失败都要处理，见下面的 completeHandler（如 hideLoading 处理，上报处理）
- 成功或失败的 promise 链，见下面的 thenHandler 和 catchHandler
- 支持取消发送请求
- 请求适配器自定义
- 其他定制

## 安装

```bash
npm i g-request --save
```

## 使用

### 1、业务实例化并处理公有逻辑

```ts
// gRequest.ts
// ------------------------------------
import { Request, IRequestCtx, RequestError, IRequestInitOptions, IRequestOptions, IRequestConfig } from 'g-request';

// 默认参数 defaultConfig 为以下的值：
// {
//   ext: {
//     baseUrl: '',
//     xRequestId: true, // header 头部加上 x-request-id，方便查看日志，默认开启
//     xRequestTime: true, // 记录请求耗时，默认开始
//     repeatNum: 2, // 默认失败自动重试 2 次
//     timeout: 0, // 默认请求本身支持 timeout 参数的不需要这个，设置为 0 即可，如果需要兼容不支持的，设置这个即可，不要设置请求本身的
//     retcodeKey: 'retcode', // retcode 字段，false 表示不启用该功能
//     retcodeWhiteList: [], // retcode 白名单，默认空数组为retcode为0进入then，其余为进入catch，false 表示不启用该功能，retcodeKey 为 false 也没有该功能
//     logicErrorMsgKey: 'message', // ，默认逻辑错误文本字段，支持一层对象，如 errData.msg
//     LoginErrorMsgUnknown: 'Unknown Error', // 逻辑错误文本默认，如果后台没有返回具体的错误，则显示该文本
//     adapter: getDefaultAdapter(), // 自动适配 WEB 还是小程序发送请求
//   },
// }

// 修改 config
// 如添加一个加载提示控制变量 loadingTips；错误文本字段改成 msg 字段
const config: IRequestConfig = {
  loadingTips: true,
  logicErrorMsgKey: 'msg',
}
Request.setConfig(config)


// 实例化
const gReqeust = new Request(options: IRequestInitOptions);

// 插件式处理请求参数或返回数据
// ------------------------------------------------
// 处理请求参数
// 可使用多个 use，每个 use 函数按注册顺序依次进入管道处理，最后返回 ctx
// 如小程序可再次设置 header 的 cookie 字段，用于鉴权
gRequest.req.use((ctx: IRequestCtx) => {
  // 处理 req ...
  // const { req } = ctx;

  // 最后记得 return ctx
  return ctx;
});

// 处理返回数据，同上请求参数的处理
gRequest.res.use((ctx: IRequestCtx) => {
  // 处理 res ...
  // ctx.res = {};

  // 最后记得 return ctx
  return ctx;
});

// 处理请求的成功及失败
// ------------------------------------------------
// 请求完成处理，不论成功或失败，可用于关闭 loading，上报等
// err 有三种 type，分别为：逻辑错误，服务器错误，网络错误，具体见错误说明部分
gRequest.completeHandler = (ctx: IRequestCtx, err?: RequestError) => {};

// 统一成功处理
gRequest.thenHandler = <T>(ctx: IRequestCtx) => {
  // 返回下一步进入成功的数据
  return ctx.res as T;
};

// 统一错误处理：如 toast 提示，上报错误等
gRequest.catchHandler = (err: RequestError, ctx: IRequestCtx) => {
  // 处理逻辑

  // 最后一定要返回错误，用于串起错误链
  return Promise.reject(err);
};

// 常用 get 与 post 方法的进一步封装
// ------------------------------------------------
// 先定义返回的数据格式
export interface IRequestRes<T> {
  retcode: number;
  data: T;
  cost: number;
  message: string;
}
// 简化 get 方法
export function gGet<T>(data: IRequestOptions) {
  return gRequest.get<IRequestRes<T>>(data);
}

// 简化 post 方法
export function gPost<T>(data: IRequestOptions) {
  return gRequest.post<IRequestRes<T>>(data);
}

// 导出 gReqeust
export default gReqeust;
```

### 2、具体发送请求

导入 `gRequest.ts`，调用其方法发送具体请求

```js
// api.ts
// ------------------------------------
import { IRequestOptions, IRequestConfig } from 'g-request';
import gReqeust, { gGet, gPost } from './gReqeust';

// IRequestOptions 类型有小程序的和 WEB 的，常用的几个属性如下，具体的话可见类型提示：
// {
//   url: string;
//   method?: IMethod;
//   header?: Record<string, string>;
//   data?: IAnyObject | ...; // 这个有多种值，xhr 这里只做做了 IAnyObject 的特殊处理，其余全部透传
//   timeout?: number; // 注意该 timeout 为默认支持的，如果确认你要兼容的都支持，那么就可以考虑去掉 ext 中的 timeout
//   ext?: Partial<IRequestConfig>;
// }

// 通用
gReqeust.request < T > (options: IRequestOptions);

// post 请求 1
interface Res1 {
  isValid: boolean;
}
gPost <
  Res1 >
  {
    url: 'xxx',
    method: 'POST', // 如不设置，默认为 GET 请求
    // 设置 header
    header: {
      'x-language': 'en', // 设置请求语言
    },
    data: {
      a: 1,
      b: 2,
    },
    // 可覆盖默认配置，及 gReqeust 初始化参数
    ext: {
      repeatNum: 0, // 失败不重试
      taskName: 'hello', // 该请求任务名称，用于取消请求，如不设置，则默认为 gReqeust.taskIndex 的自增值
    },
  };

// get 请求
interface Res2 {
  time: string;
}
gGet <
  Res2 >
  {
    url: 'xxx',
    // 自动拼成 query
    data: {
      a: 1,
      b: 2,
    },
    ext: {
      retcodeKey: 'code', // 这条请求的 retcodeKey 是 code 字段
    },
  };

// post 请求
interface Res3 {
  name: string;
  id: string;
}
gPost <
  Res3 >
  {
    url: 'xxx',
    data: {
      a: 1,
      b: 2,
    },
    ext: {
      retcodeWhiteList: [3455, 6784], // retcode 为 0， 3455，6784 将会按成功处理，其余按失败处理
    },
  };
```

**取消正在发送中的请求**

```js
// 取消单个 taskName 为 hello 的请求
gReqeust.task?.hello.abort();

// 取消所有正在发送中的请求
gReqeust.abort();
```

## ctx 参数说明

ctx 由 `req、res、ext` 三大属性组成， 其 TS 类型如下：

PS：注意所有的用于辅助功能的参数都挂到 ext 上，不要随便在 req 上面挂属性。req 会透传到请求适配器，用于发送请求的所有参数。

```ts
export interface IRequestCtx {
  req: IReqOptions & { header: Record<string, string> }; // 请求参数
  res: IRequestSuccessCallbackResult | Record<string, never>; // 返回数据
  ext: IRequestConfig; // 用于辅助的一些参数
}

export type IAdapter = (
  config: IAnyObject & { url: string },
  resolve: (value: unknown) => void,
  reject: (reason?: any) => void,
) => any;

export interface IRequestConfig {
  baseUrl?: string; // 基础 url，以 https 开头
  repeatNum?: number; // 请求失败重试次数
  xRequestId?: boolean; // 是否生成请求 id
  xRequestTime?: boolean; // 是否需要记录请求时间
  timeout?: number; // 超时时间，如果确定发请求的 api 本身就支持 timeout 属性，可以设置该值为 0
  retcodeKey?: false | string; // retcode 字段，false 表示不启用该功能
  retcodeWhiteList?: false | number[]; // retcode 白名单，默认 0 和 白名单表示业务成功，其余为失败，false 表示不启用该功能。
  logicErrorMsgKey?: string; // 业务逻辑错误文本字段
  LogicErrorMsgUnknown?: string; // 默认的业务逻辑错误文本，如果后台没有返回对应的错误信息，则将使用该信息
  adapter?: IAdapter; // 请求 adapter
  [key: string]: any;
}
```

## 请求错误说明

```js
import { REQUEST_ERROR_MAP, RequestError, DEFAULT_LOGIC_ERROR_MSG_UNKNOWN } from 'g-request';

console.log(REQUEST_ERROR_MAP);

// 打印得到的错误类型有以下三种
// {
//   fail: 'REQUEST_ERROR_FAIL', // 直接 fail 的错误
//   server: 'REQUEST_ERROR_SERVER', // 服务端错误，statusCode 小于 200，大于等于 300
//   logic: 'REQUEST_ERROR_LOGIC', // 业务逻辑错误
// }
```

1、第一种错误：根本没有收到服务端返回的信息，这就有了 fail 的错误（以小程序来说，就是 fail 的回调，以 web 来说，就是 XMLHttpRequest 的 onabort, ontimeout, onerror 事件触发），该错误抛出：`new RequestError(err.message || err.errMsg, { type: REQUEST_ERROR_MAP.fail })`。

2、第二种错误：接受到了服务端的信息，但是 statusCode 小于 200，大于等于 300，这就有了 server 错误，该错误抛出： `new RequestError('Request Server Error', { type: REQUEST_ERROR_MAP.server, statusCode });`。

3、第三种错误：虽然 statusCode 大于等于 200，小于 300，但是如果用户没有登录，或身份不对等都无法获取到正确的数据，所以就有了 logic 错误，该错误抛出： `new RequestError(logicErrMsg, { type: REQUEST_ERROR_MAP.logic, retcode });`。`logicErrMsg` 的取值见下面的说明。

这三种抛出的错误默认都会进入到 `catchHandler` 进行处理，如果对 `retcodeWhiteList` 进行设置，则第三种的 logic 错误白名单内的会当做成功进入到 `thenHandler` 处理。

`catchHandler` 和 `completeHandler` 的 err 参数，就是上面的三种错误实例。

### `logicErrMsg`

`logicErrMsg` 是通过调用 `getLogicErrMsg` 方法得到的，逻辑如下：

```ts
getLogicErrMsg(ctx: IRequestCtx): string {
  const { res, ext } = ctx;
  const { logicErrorMsgKey, logicErrorMsgUnknown } = ext;

  const defaultMsgUnknown = logicErrorMsgUnknown || DEFAULT_LOGIC_ERROR_MSG_UNKNOWN;

  // 如果没有指定 msg 的 key
  if (!logicErrorMsgKey) {
    return defaultMsgUnknown;
  }

  // 如果有指定，则取该值
  let logicErrMsg: string | undefined = res.data?.[logicErrorMsgKey];
  // 错误信息可能不是一个直接的 string 字段，而是被包裹在一个对象中，如 errData: { text: 'xxx', code: xxx };
  // 这样可以设置 key 值为 'errData.text'，分割得到最终的字段
  if (!logicErrMsg && logicErrorMsgKey.includes('.')) {
    const [key1, key2] = logicErrorMsgKey.split('.');
    if (res.data?.[key1]?.[key2]) {
      logicErrMsg = res.data[key1][key2];
    }
  }

  return logicErrMsg || defaultMsgUnknown;
}
```

## completeHandler 说明

```ts
import { Request, IRequestCtx, RequestError, REQUEST_ERROR_MAP } from 'g-request';

// 不管成功，失败都会执行
// 这里总共有四种情况，一种成功，三种失败
gReqeust.completeHandler = (ctx: IRequestCtx, err?: RequestError) => {
  // 成功
  if (!err) {
  }

  // 可以根据 err.type 来判断错误类型
  // ------------------------------------
  // fail
  if (err.type === REQUEST_ERROR_MAP.fail) {
  }

  // server
  if (err.type === REQUEST_ERROR_MAP.server) {
  }

  // logic
  if (err.type === REQUEST_ERROR_MAP.server) {
  }
};
```

## 其他定制

### web 请求 loading 提示

借助 [x-global-api](https://github.com/marvin1023/x-global-api) 库提供的全局 showLoading 方法实现。

如为小程序，可直接使用 `wx.showLoading` 与 `wx.hideLoading` 来实现。

```ts
import { Request, IRequestCtx, RequestError } from 'g-request';
import { showLoading, hideLoading } from 'x-global-api';

const gReqeust = new Request({
  ext: {
    ...
    loadingTips: true,
  },
});

gReqeust.req.use((ctx) => {
  const { ext } = ctx;
  // 默认如果 loadingTips 为 true，则显示 loading
  if (ext.loadingTips) {
    showLoading({title: '数据加载中...', mask: true});
  }

  return ctx;
})

// 不管成功，失败都要 hideLoading
gReqeust.completeHandler = (ctx: IRequestCtx, err?: RequestError) => {
  const { ext } = ctx;
  if (ext.loadingTips) {
    hideLoading();
  }
}

```

### 默认驼峰处理

以对返回的后台数据进行默认的转驼峰处理为例，可通过静态方法 setConfig 设置，或实例化的时候 `ext` 属性中添加 `camelCase`

```ts
import { Request, IRequestCtx } from 'g-request';
import humps from 'humps';

// 静态方法设置
// Request.setConfig({
//   camelCase: true,
// });

// 初始化设置
const gReqeust = new Request({
  ext: {
    ...
    camelCase: true,
  },
});

gReqeust.res.use((ctx: IRequestCtx) => {
  const { ext } = ctx;
  // 默认如果 camelCase 为 true，则自动进行转驼峰处理
  if (ext.camelCase) {
    ctx.res.data = humps.camelizeKeys(ctx.res.data);
  }

  return ctx;
})
```

### 小程序请求失败默认提示

```ts
import { Request, IRequestCtx, RequestError } from 'g-request';
const gReqeust = new Request({
  ext: {
    ...
    failToast: true,
  },
});

gReqeust.catchHandler = (err: RequestError, ctx: IRequestCtx) => {
  if (ctx.ext.failToast) {
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

## 注意事项

- 该库 TS 编译的 `target` 为 `ES2015`。如果要兼容到老版本，请再进行一次 babel 编译。
