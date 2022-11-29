import {
  IRequestCtx,
  IRequestInitOptions,
  IAnyObject,
  IRequestOptions,
  IMethod,
  IRequestPluginFn,
  IRequestConfig,
} from '../types';
import { REQUEST_ERROR_MAP, DEFAULT_LOGIC_ERROR_MSG_UNKNOWN, DEFAULT_RETCODE_KEY } from './const';
import { RequestError } from './requestError';
import { defaultConfig } from './default';
import { Plugins } from './plugins';
export class Request {
  options!: IRequestInitOptions;
  res!: Plugins<IRequestPluginFn, IRequestCtx>;
  req!: Plugins<IRequestPluginFn, IRequestCtx>;
  task: IAnyObject = {}; // RequestTask
  taskIndex = 0; // 默认

  static defaultConfig: IRequestConfig = defaultConfig;

  static setConfig = (config: IRequestConfig) => {
    Object.assign(Request.defaultConfig, config);
  };

  constructor(options?: IRequestInitOptions) {
    this.init(options);
  }

  init(options?: IRequestInitOptions) {
    this.options = options || {};
    this.req = new Plugins<IRequestPluginFn, IRequestCtx>();
    this.res = new Plugins<IRequestPluginFn, IRequestCtx>();
  }

  initCtx(opts: IRequestOptions): IRequestCtx {
    const { defaultConfig } = Request;
    const { ext: optionsExt, ...optionsReq } = this.options;
    const { ext, ...req } = opts;

    // 构造 ctx 对象
    return {
      req: { header: {}, ...optionsReq, ...req },
      res: {},
      ext: { taskName: String(this.taskIndex), ...defaultConfig, ...optionsExt, ...ext },
    };
  }

  urlHandler(ctx: IRequestCtx) {
    // url 处理
    const { baseUrl } = ctx.ext;
    if (baseUrl && !ctx.req.url.startsWith('http')) {
      ctx.req.url = `${baseUrl}${ctx.req.url}`;
    }
    ctx.ext.urlHasNoSearch = ctx.req.url.split('?')[0]; // 不带 query 的 url，可用于统计或上报等
  }

  reqHandler(ctx: IRequestCtx) {
    // 自定义 id，方便打通全链路日志
    if (ctx.ext.xRequestId) {
      ctx.req.header['X-Request-Id'] = this.getUUID();
    }

    // 自定义请求发起时间
    if (ctx.ext.xRequestTime) {
      ctx.req.header['X-Request-Time'] = Date.now();
    }

    // req 插件处理入参
    this.req.pipe(ctx);
  }

  request<T>(data: IRequestOptions): Promise<T> {
    this.taskIndex++;

    const ctx = this.initCtx(data);
    this.urlHandler(ctx);
    this.reqHandler(ctx);

    return this.dispatch(ctx)
      .then(() => {
        return this.thenHandler<T>(ctx);
      })
      .catch((err: RequestError) => {
        return this.catchHandler(err, ctx);
      });
  }

  method<T>(method: IMethod, data: IRequestOptions) {
    return this.request<T>({ ...data, method });
  }

  get<T>(data: IRequestOptions) {
    return this.method<T>('GET', data);
  }

  post<T>(data: IRequestOptions) {
    return this.method<T>('POST', data);
  }

  dispatch(ctx: IRequestCtx): Promise<IAnyObject> {
    const { timeout, taskName } = ctx.ext;

    // 重试逻辑处理
    const repeatTry = (): Promise<IAnyObject> => {
      // 超时 abort 处理
      if (timeout) {
        ctx.ext.timer = setTimeout(() => {
          this.task[taskName]?.abort();
          clearTimeout(ctx.ext.timer);
        }, timeout);
      }
      return this.promiseAdapter(ctx)
        .then((result) => {
          const { statusCode } = result;
          if (statusCode >= 200 && statusCode < 300) {
            this.clearHandler(ctx);
            // 挂到 ctx.res 上
            ctx.res = result;

            // retcode 处理
            this.retcodeHandler(ctx);

            // res 插件处理返回
            this.res.pipe(ctx);

            return this.retcodeWhiteListHandler(ctx);
          }

          // 处理服务器错误 message
          throw new RequestError('Request Server Error', { type: REQUEST_ERROR_MAP.server, statusCode });
        })
        .catch((err) => {
          // 非逻辑错误，执行清空操作及重试
          if (!(err.type && err.type === REQUEST_ERROR_MAP.logic)) {
            this.clearHandler(ctx);

            // 重试
            if (ctx.ext.repeatNum && ctx.ext.repeatNum--) {
              return repeatTry();
            }
          }

          const newError = err.type
            ? err
            : new RequestError(err.message || err.errMsg, { type: REQUEST_ERROR_MAP.fail });
          this.completeHandler(ctx, newError);
          throw newError;
        });
    };

    ctx.ext.repeatTry = repeatTry;

    return repeatTry();
  }

  promiseAdapter(ctx: IRequestCtx): Promise<any> {
    const { req, ext } = ctx;
    const { adapter, taskName } = ext;

    if (!adapter) {
      return Promise.reject('adapter is must be required');
    }

    return new Promise((resolve, reject) => {
      this.task[taskName] = adapter(req, resolve, reject);
    });
  }

  abort() {
    Object.keys(this.task).forEach((item) => {
      this.task[item].abort();
    });
  }

  thenHandler<T>(ctx: IRequestCtx): T {
    return ctx.res as T;
  }

  catchHandler(err: RequestError, ctx: IRequestCtx) {
    return Promise.reject(err);
  }

  clearHandler(ctx: IRequestCtx) {
    const { xRequestTime, timeout, timer, taskName } = ctx.ext;

    // 计算请求耗时
    if (xRequestTime) {
      ctx.ext.requestCostTime = Date.now() - ctx.req.header['X-Request-Time'];
    }

    // 删除任务
    if (this.task[taskName]) {
      delete this.task[taskName];
    }

    // 清除计时
    if (timeout && timer) {
      clearTimeout(timer);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  completeHandler(ctx: IRequestCtx, err?: RequestError): void | IRequestCtx {}

  retcodeHandler(ctx: IRequestCtx) {
    const { retcodeKey } = ctx.ext;
    // 如果key值非retcode，则手动添加 retcode 等于该 key 的值
    if (retcodeKey && retcodeKey !== DEFAULT_RETCODE_KEY) {
      ctx.res.data[DEFAULT_RETCODE_KEY] = ctx.res.data[retcodeKey];
    }

    return ctx;
  }

  retcodeWhiteListHandler(ctx: IRequestCtx) {
    const {
      ext: { retcodeKey, retcodeWhiteList },
      res,
    } = ctx;

    // 关闭白名单，retcode 不论为啥都为成功
    // 或者没有 retcodeKey
    if (!retcodeWhiteList || !retcodeKey) {
      this.completeHandler(ctx);
      return ctx;
    }

    // 如果为 0 或者在白名单内，则进入 then 处理
    const retArr = retcodeWhiteList;
    const { retcode } = res.data || {};
    const isWhite = retArr.includes(retcode);
    if (retcode === 0 || isWhite) {
      this.completeHandler(ctx);
      return ctx;
    }

    // 逻辑错误
    const logicErrMsg = this.getLogicErrMsg(ctx);
    throw new RequestError(logicErrMsg, {
      type: REQUEST_ERROR_MAP.logic,
      retcode,
    });
  }

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

  getUUID(bytes = 16) {
    const SHARED_CHAR_CODES_ARRAY = Array(32);
    for (let i = 0; i < bytes * 2; i++) {
      SHARED_CHAR_CODES_ARRAY[i] = Math.floor(Math.random() * 16) + 48;
      // valid hex characters in the range 48-57 and 97-102
      if (SHARED_CHAR_CODES_ARRAY[i] >= 58) {
        SHARED_CHAR_CODES_ARRAY[i] += 39;
      }
    }
    return String.fromCharCode.apply(null, SHARED_CHAR_CODES_ARRAY.slice(0, bytes * 2));
  }
}
