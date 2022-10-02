import { IExtOptions } from '../types';
import getDefaultAdapter from './adapter/index';

const defaultConfig: { ext: Omit<IExtOptions, 'adapter'> } = {
  ext: {
    baseUrl: '',
    xRequestId: true,
    xRequestTime: true,
    repeatNum: 2, // 默认失败自动重试 2 次
    timeout: 0,
    retcodeKey: 'retcode',
    retcodeWhiteList: [], // 默认空数组，表示只有 0 为成功
    logicErrorMsgKey: 'message', // 逻辑错误字段
    LoginErrorMsgUnknown: 'Unknown Error',
    adapter: getDefaultAdapter(),
  },
};

export default defaultConfig;
