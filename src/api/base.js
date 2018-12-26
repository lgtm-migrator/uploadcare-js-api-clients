/* @flow */
import axios from 'axios'
import request, {prepareOptions} from './request'
import type {RequestOptions} from './request'
import type {Settings, FileData} from '../types'

export type BaseResponse = {|
  file: string
|}

export type UploadProgressEvent = {
  status: 'uploading' | 'uploaded' | 'canceled' | 'error',
  progress: number,
}

export type UploadCancelEvent = {
  progress: number,
}

export type Uploading = {|
  promise: Promise<BaseResponse>,
  onProgress: ?(event: UploadProgressEvent) => void,
  onCancel: ?(event: UploadCancelEvent) => void,
  cancel: Function,
|}

/**
 * Performs file uploading request to Uploadcare Upload API.
 * Can be canceled and has progress.
 *
 * @param {FileData} file
 * @param {Settings} settings
 * @return {Uploading}
 */
export default function base(file: FileData, settings: Settings = {}): Uploading {
  const options: RequestOptions = prepareOptions({
    method: 'POST',
    path: '/base/',
    body: {
      UPLOADCARE_PUB_KEY: settings.publicKey || '',
      signature: settings.secureSignature || '',
      expire: settings.secureExpire || '',
      UPLOADCARE_STORE: settings.doNotStore ? '' : 'auto',
      file: file,
      source: 'local',
    },
  }, settings)

  const source = axios.CancelToken.source()

  /* TODO Need to handle errors */
  const uploading = {
    promise: request({
      ...options,
      onUploadProgress: (progressEvent) => {
        if (typeof uploading.onProgress === 'function') {
          uploading.onProgress(progressEvent)
        }
      },
      cancelToken: source.token,
    })
      .then(response => response.data)
      .catch(error => {
        if (error.name === 'CancelError' && typeof uploading.onCancel === 'function') {
          uploading.onCancel()
        }

        return Promise.reject(error)
      }),
    onProgress: null,
    onCancel: null,
    cancel: source.cancel,
  }

  return uploading
}
