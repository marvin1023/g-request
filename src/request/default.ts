import { IExtOptions } from '../types';
import { getDefaultAdapter } from './adapter/index';
import { DEFAULT_LOGIC_ERROR_MSG_KEY, DEFAULT_LOGIC_ERROR_MSG_UNKNOWN, DEFAULT_RETCODE_KEY } from './const';

export const defaultConfig: { ext: IExtOptions } = {
  ext: {
    baseUrl: '',
    xRequestId: true,
    xRequestTime: true,
    repeatNum: 2, // 默认失败自动重试 2 次
    timeout: 0,
    retcodeKey: DEFAULT_RETCODE_KEY,
    retcodeWhiteList: [], // 默认空数组，表示只有 0 为成功
    logicErrorMsgKey: DEFAULT_LOGIC_ERROR_MSG_KEY, // 逻辑错误字段
    LoginErrorMsgUnknown: DEFAULT_LOGIC_ERROR_MSG_UNKNOWN,
    adapter: getDefaultAdapter(),
  },
};
