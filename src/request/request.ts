import { IExtOptions, ICtx, IInstanceOptions, IAnyObject, IRequestOptions, IMethod, IPluginFn } from '../types';
import { RequestError } from './requestError';
import { defaultConfig } from './default';
import { Plugins } from './plugins';

export class Request {
  options!: Partial<IInstanceOptions>;
  res!: Plugins<IPluginFn, ICtx>;
  req!: Plugins<IPluginFn, ICtx>;
  task: IAnyObject = {}; // RequestTask
  taskIndex = 0; // 默认
  errorMap = {
    logic: 'REQUEST_ERROR_LOGIC',
    server: 'REQUEST_ERROR_SERVER',
    network: 'REQUEST_ERROR_NETWORK',
  };

  constructor(options?: IInstanceOptions) {
    this.init(options);
  }

  init(options?: IInstanceOptions) {
    // 非 wx.request 请求的参数全部挂在 ext 属性中
    const { ext: defaultExt } = defaultConfig;
    const { ext = {}, ...req } = options || {};

    this.options = { ...req, ext: { ...defaultExt, ...ext } };
    this.req = new Plugins<IPluginFn, ICtx>();
    this.res = new Plugins<IPluginFn, ICtx>();
  }

  updateOptions(data: Partial<IExtOptions>) {
    Object.assign(this.options.ext as IExtOptions, data);
  }

  initCtx(url: string | IRequestOptions, rest?: IInstanceOptions) {
    const { ext: optionsExt, ...optionsReq } = this.options;
    const params: IRequestOptions = { url: '', ext: {} };

    // 对不同的参数进行处理
    if (typeof url === 'string') {
      params.url = url;
      if (rest) {
        Object.assign(params, rest);
      }
    } else {
      Object.assign(params, url);
    }
    const { ext = {}, ...req } = params;

    // 构造 ctx 对象
    return {
      req: { header: {}, ...optionsReq, ...req },
      res: {},
      ext: { taskName: String(this.taskIndex), ...(optionsExt as IExtOptions), ...ext },
    };
  }

  request<T>(url: string | IRequestOptions, rest?: IInstanceOptions): Promise<T> {
    this.taskIndex++;

    const requestTime = Date.now();
    const ctx = this.initCtx(url, rest);

    // url 处理
    const { baseUrl } = ctx.ext;
    if (baseUrl && !ctx.req.url.startsWith('http')) {
      ctx.req.url = `${baseUrl}${ctx.req.url}`;
    }

    // 自定义 id，方便打通全链路日志
    if (ctx.ext.xRequestId) {
      ctx.req.header['X-Request-Id'] = this.getUUID();
    }

    // 自定义请求发起时间
    if (ctx.ext.xRequestTime) {
      ctx.req.header['X-Request-Time'] = requestTime;
    }

    // req 插件处理入参
    this.req.pipe(ctx);

    return this.dispatch(ctx)
      .then(() => {
        return this.thenHandler<T>(ctx);
      })
      .catch((err: RequestError) => {
        return this.catchHandler(err, ctx);
      });
  }

  method<T>(method: IMethod, url: string | IRequestOptions, data?: IInstanceOptions) {
    const params: IRequestOptions = { url: '' };

    if (typeof url === 'string') {
      Object.assign(params, { url, data, method });
    } else {
      Object.assign(params, { ...url, method });
    }
    return this.request<T>(params);
  }

  get<T>(url: string | IRequestOptions, data?: IInstanceOptions) {
    return this.method<T>('GET', url, data);
  }

  post<T>(url: string | IRequestOptions, data?: IInstanceOptions) {
    return this.method<T>('POST', url, data);
  }

  dispatch(ctx: ICtx): Promise<IAnyObject> {
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
      return this.promiseAdtaper(ctx)
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
          throw new RequestError('Request Server Error', { type: this.errorMap.server, statusCode });
        })
        .catch((err) => {
          // 非逻辑错误，执行清空操作及重试
          if (!(err.type && err.type === this.errorMap.logic)) {
            this.clearHandler(ctx);

            // 重试
            if (ctx.ext.repeatNum && ctx.ext.repeatNum--) {
              return repeatTry();
            }
          }

          const newError = err.type
            ? err
            : new RequestError(err.message || err.errMsg, { type: this.errorMap.network });
          this.completeHandler(ctx, newError);
          throw newError;
        });
    };

    return repeatTry();
  }

  promiseAdtaper(ctx: ICtx): Promise<any> {
    const { req, ext } = ctx;
    const { adapter, taskName } = ext;

    return new Promise((resolve, reject) => {
      this.task[taskName] = adapter(req, resolve, reject);
    });
  }

  abort() {
    Object.keys(this.task).forEach((item) => {
      this.task[item].abort();
    });
  }

  thenHandler<T>(ctx: ICtx): T {
    return ctx.res as T;
  }

  catchHandler(err: RequestError, ctx: ICtx) {
    return Promise.reject(err);
  }

  clearHandler(ctx: ICtx) {
    const { xRequestTime, timeout, timer, taskName } = ctx.ext;

    // 计算请求耗时
    if (xRequestTime) {
      ctx.ext.requestCostTime = Date.now() - ctx.req.header!['X-Request-Time'];
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
  completeHandler(ctx: ICtx, err?: RequestError): void | ICtx {}

  retcodeHandler(ctx: ICtx) {
    const { retcodeKey } = ctx.ext;
    if (retcodeKey !== false && retcodeKey !== 'retcode') {
      ctx.res.data.retcode = ctx.res.data[retcodeKey];
    }

    return ctx;
  }

  retcodeWhiteListHandler(ctx: ICtx) {
    const {
      ext: { retcodeKey, retcodeWhiteList },
      res,
    } = ctx;

    // 关闭白名单，retcode 不论为啥都为成功
    // 或者没有 retcodeKey
    if (retcodeWhiteList === false || !retcodeKey) {
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
      type: this.errorMap.logic,
      retcode,
    });
  }

  getLogicErrMsg(ctx: ICtx): string {
    const { res, ext } = ctx;
    const { logicErrorMsgKey, LoginErrorMsgUnknown } = ext;

    let logicErrMsg: string | undefined = res.data?.[logicErrorMsgKey];
    if (logicErrorMsgKey.includes('.')) {
      const [key1, key2] = logicErrorMsgKey.split('.');
      if (res.data?.[key1]?.[key2]) {
        logicErrMsg = res.data[key1][key2];
      }
    }

    return logicErrMsg || LoginErrorMsgUnknown;
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
