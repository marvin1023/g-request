import { IExtOptions, ICtx, IInstanceOptions, IAnyObject, IRequestOptions, IMethod, IPluginFn } from '../types';
import RequestError from './requestError';
import defaultConfig from './default';
import { getUUID } from './util';
import Plugins from './plugins';

class GRequest {
  options!: Partial<IInstanceOptions>;
  res!: Plugins<IPluginFn, ICtx>;
  req!: Plugins<IPluginFn, ICtx>;
  task: IAnyObject = {}; // RequestTask

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
      ext: { taskName: req.url, ...(optionsExt as IExtOptions), ...ext },
    };
  }

  request<T>(url: string | IRequestOptions, rest?: IInstanceOptions): Promise<T> {
    const requestTime = Date.now();
    const ctx = this.initCtx(url, rest);

    // url 处理
    const { baseUrl } = ctx.ext;
    if (baseUrl && !ctx.req.url.startsWith('http')) {
      ctx.req.url = `${baseUrl}${ctx.req.url}`;
    }

    // 自定义 id，方便打通全链路日志
    if (ctx.ext.xRequestId) {
      ctx.req.header['X-Request-Id'] = getUUID();
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
    const { timeout, retcodeKey, taskName } = ctx.ext;

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
          this.alwaysHandler(ctx);

          const { statusCode } = result;
          if (statusCode >= 200 && statusCode < 300) {
            // 挂到 ctx.res 上
            ctx.res = result;

            // retcode 处理
            if (retcodeKey !== false && retcodeKey !== 'retcode') {
              ctx.res.data.retcode = ctx.res.data[retcodeKey];
            }

            // res 插件处理返回
            this.res.pipe(ctx);

            return this.retcodeWhiteListHandler(ctx);
          }

          // 处理服务器错误 message
          throw new RequestError('Request Server Error', { type: 'REQUEST_ERROR_SERVER', statusCode });
        })
        .catch((err) => {
          this.alwaysHandler(ctx);
          // 重试
          if (ctx.ext.repeatNum && ctx.ext.repeatNum--) {
            return repeatTry();
          }

          if (err.type) {
            throw err;
          } else {
            throw new RequestError(err.message || err.errMsg, { type: 'REQUEST_ERROR_FAIL' });
          }
        });
    };

    return repeatTry();
  }

  promiseAdtaper(ctx: ICtx): Promise<any> {
    const { req, ext } = ctx;
    const { adapter, taskName = req.url } = ext;

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

  alwaysHandler(ctx: ICtx) {
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

  retcodeWhiteListHandler(ctx: ICtx) {
    const {
      ext: { retcodeKey, retcodeWhiteList, LoginErrorMsgUnknown, logicErrorMsgKey },
      res,
    } = ctx;

    // 关闭白名单，retcode 不论为啥都为成功
    // 或者没有 retcodeKey
    if (retcodeWhiteList === false || !retcodeKey) {
      return ctx;
    }

    // 如果为 0 或者在白名单内，则进入 then 处理
    const retArr = retcodeWhiteList;
    const { retcode } = res.data || {};
    const isWhite = retArr.includes(retcode);
    if (retcode === 0 || isWhite) {
      return ctx;
    }

    // 其他错误
    let errMsg = res.data?.[logicErrorMsgKey] || LoginErrorMsgUnknown;
    if (logicErrorMsgKey.includes('.')) {
      const [key1, key2] = logicErrorMsgKey.split('.');
      if (res.data?.[key1]?.[key2]) {
        errMsg = res.data[key1][key2];
      }
    }

    throw new RequestError(errMsg, {
      type: 'REQUEST_ERROR_LOGIC',
      retcode,
    });
  }
}

export default GRequest;
