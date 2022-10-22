import { REQUEST_ERROR_MAP } from './const';

export type RequestErrorType = typeof REQUEST_ERROR_MAP[keyof typeof REQUEST_ERROR_MAP];

export class RequestError extends Error {
  type: RequestErrorType; // 错误类型
  retcode?: number; // 业务逻辑错误码
  statusCode?: number; // 服务器错误码
  constructor(message: string, options: { type: RequestErrorType; retcode?: number; statusCode?: number }) {
    super(message);

    const { type, retcode, statusCode } = options;

    this.type = type;
    if (retcode) {
      this.retcode = retcode;
    }
    if (statusCode) {
      this.statusCode = statusCode;
    }
  }
}
