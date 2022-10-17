import { IAnyObject, IXHRReqOptions } from '../../types';
import { isPlainObject } from '../util';

export const xhrAdapter = (
  config: IXHRReqOptions,
  resolve: (value: unknown) => void,
  reject: (reason?: any) => void,
) => {
  const {
    url,
    method = 'GET',
    data,
    header,
    responseType = 'json',
    timeout,
    async = true,
    withCredentials = true,
  } = config;
  const xhr = new XMLHttpRequest();

  if (withCredentials !== undefined) {
    xhr.withCredentials = withCredentials;
  }

  const methodUpperCase = method.toUpperCase();

  xhr.responseType = responseType;

  if (timeout) {
    xhr.timeout = timeout;
  }

  // 处理请求数据
  let requestData = data;
  let fullPath = url;

  if (isPlainObject(data)) {
    if (methodUpperCase === 'POST') {
      requestData = JSON.stringify(data);
    }

    if (methodUpperCase === 'GET') {
      requestData = null;
      const urlObj = new URL(url);
      for (const item in data as any) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        urlObj.searchParams.set(item, data[item]);
      }
      fullPath = urlObj.href;
    }
  }

  xhr.open(methodUpperCase, fullPath, async);

  // 设置头部
  if (header) {
    for (const item in header) {
      xhr.setRequestHeader(item, header[item]);
    }
  }

  // 如果 POST，且没有设置 Content-type
  if (methodUpperCase === 'POST' && !header?.['Content-type']) {
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  }

  xhr.send((requestData as any) || null);

  // 返回数据的 header
  const responseHeader: IAnyObject = {};
  if (xhr.getAllResponseHeaders) {
    const headers = xhr.getAllResponseHeaders();
    if (headers) {
      const arr = headers.trim().split(/[\r\n]+/);

      arr.forEach((line) => {
        const [key, value] = line.split(': ');
        responseHeader[key] = value;
      });
    }
  }

  xhr.onload = function () {
    const responseData = responseType === '' || responseType === 'text' ? xhr.responseText : xhr.response;
    resolve({
      statusCode: xhr.status,
      data: responseData,
      header: responseHeader,
    });
  };

  xhr.onerror = function handleError(e) {
    reject(new Error('Request Error'));
  };

  xhr.ontimeout = function handleTimeout(e) {
    reject(new Error('Request Timeout'));
  };

  xhr.onabort = function handleAbort(e) {
    reject(new Error('Request aAbort'));
  };

  return xhr;
};
