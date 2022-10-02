import { IWXRequestOptions, IWXRequestSuccessCallbackResult, IWXRequestFailCallbackResult } from '../../types';

const wxAdapter = (config: IWXRequestOptions, resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
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

export default wxAdapter;
