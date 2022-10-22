export const REQUEST_ERROR_MAP = {
  fail: 'REQUEST_ERROR_FAIL' as const, // 直接 fail 的错误
  server: 'REQUEST_ERROR_SERVER' as const, // 服务端错误，statusCode 小于 200，大于等于 300
  logic: 'REQUEST_ERROR_LOGIC' as const, // 业务逻辑错误
};

export const DEFAULT_LOGIC_ERROR_MSG_UNKNOWN = 'Unknown Error';

export const DEFAULT_RETCODE_KEY = 'retcode';

export const DEFAULT_LOGIC_ERROR_MSG_KEY = 'message';
