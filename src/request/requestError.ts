import { IRequestErrorType } from '../types';
class RequestError extends Error {
  type: IRequestErrorType; // 错误类型
  retcode?: number; // 业务逻辑错误码
  statusCode?: number; // 服务器错误码
  constructor(message: string, options: { type: IRequestErrorType; retcode?: number; statusCode?: number }) {
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

export default RequestError;
