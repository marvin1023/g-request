import { IWXReqOptions, IWXRequestSuccessCallbackResult, IWXRequestFailCallbackResult } from '../../types';

export const wxAdapter = (config: IWXReqOptions, resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
  return wx.request({
    ...config,
    success: (res: IWXRequestSuccessCallbackResult) => {
      resolve(res);
    },
    fail: (err: IWXRequestFailCallbackResult) => {
      reject(err);
    },
  });
};
