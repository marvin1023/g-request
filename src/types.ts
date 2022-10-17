export type IAnyObject = Record<string, any>;
export type IMethod = 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT';
export type IRequestErrorType = 'REQUEST_ERROR_SERVER' | 'REQUEST_ERROR_FAIL' | 'REQUEST_ERROR_LOGIC' | string;
export interface IWXReqOptions {
  url: string;
  data?: string | IAnyObject | ArrayBuffer;
  dataType?: 'json' | '其他';
  enableCache?: boolean;
  enableChunked?: boolean;
  enableHttp2?: boolean;
  enableHttpDNS?: boolean;
  enableQuic?: boolean;
  forceCellularNetwork?: boolean;
  header?: IAnyObject;
  httpDNSServiceId?: string;
  responseType?: 'text' | 'arraybuffer';
  timeout?: number;
  method?: IMethod;
}

export interface IXHRReqOptions {
  url: string;
  method?: IMethod;
  header?: Record<string, string>;
  data?: Document | XMLHttpRequestBodyInit | null | undefined | IAnyObject;
  withCredentials?: boolean;
  responseType?: 'text' | 'arraybuffer' | 'blob' | 'json' | '' | 'document';
  timeout?: number;
  async?: boolean;
}

export interface IWXRequestSuccessCallbackResult {
  cookies?: string[];
  data: IAnyObject;
  header: IAnyObject;
  statusCode: number;
  errMsg: string;
}

export interface IXHRRequestSuccessCallbackResult {
  statusCode: number;
  data: IAnyObject;
  header: IAnyObject;
}

export interface IWXRequestFailCallbackResult {
  errMsg: string;
}

export interface IExtOptions {
  baseUrl: string; // 基础 url，以 https 开头
  repeatNum: number; // 请求失败重试次数
  xRequestId: boolean; // 是否生成请求 id
  xRequestTime: boolean; // 是否需要记录请求时间
  timeout: number; // 超时时间，如果确定发请求的 api 本身就支持 timeout 属性，可以设置该值为 0
  retcodeKey: false | string; // retcode 字段，false 表示不启用该功能
  retcodeWhiteList: false | number[]; // retcode 白名单，默认 0 和 白名单表示业务成功，其余为失败，false 表示不启用该功能。
  logicErrorMsgKey: string; // 业务逻辑错误文本字段
  LoginErrorMsgUnknown: string; // 默认的业务逻辑错误文本，如果后台没有返回对应的错误信息，则将使用该信息
  adapter: (config: IAnyObject, resolve: (value: unknown) => void, reject: (reason?: any) => void) => any; // 请求 adapter
  [key: string]: any;
}

export type IReqOptions = IWXReqOptions | IXHRReqOptions;
export type IRequestSuccessCallbackResult = IWXRequestSuccessCallbackResult | IXHRRequestSuccessCallbackResult;

// export interface IReqOptions extends IWXReqOptions {
//   ext?: Partial<IExtOptions>;
// }

export interface ICtx {
  req: IReqOptions;
  res: IRequestSuccessCallbackResult | Record<string, never>;
  ext: IExtOptions;
}

export type IRequestOptions = IReqOptions & { ext?: Partial<IExtOptions> };
export type IInstanceOptions = Omit<IRequestOptions, 'url'>;

export type IPluginFn = (ctx: ICtx) => ICtx;
