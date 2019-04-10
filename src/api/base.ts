import request, {HandleProgressFunction, prepareOptions, RequestInterface} from './request'
import {RequestOptions} from './request'
import {Settings, FileData} from '../types'
import {Thenable} from '../tools/Thenable'

export type BaseProgress = ProgressEvent

export type BaseResponse = {
  file: string
}

export interface DirectUploadInterface extends Promise<BaseResponse> {
  onProgress: HandleProgressFunction | null
  onCancel: VoidFunction | null

  cancel(): void
}

class DirectUpload extends Thenable<BaseResponse> implements DirectUploadInterface {
  protected readonly request: RequestInterface
  protected readonly promise: Promise<BaseResponse>
  protected readonly options: RequestOptions

  onProgress: HandleProgressFunction | null = null
  onCancel: VoidFunction | null = null

  constructor(options: RequestOptions) {
    super()

    this.options = options
    this.request = request(this.getRequestOptions())
    this.promise = this.request
      .then(response => Promise.resolve(response.data))
      .catch(error => {
        if (error.name === 'CancelError' && typeof this.onCancel === 'function') {
          this.onCancel()
        }

        return Promise.reject(error)
      })
  }

  protected getRequestOptions() {
    return {
      ...this.options,
      /* TODO Add support of progress for Node.js */
      onUploadProgress: (progressEvent: BaseProgress) => {
        if (typeof this.onProgress === 'function') {
          this.onProgress(progressEvent)
        }
      },
    }
  }

  cancel(): void {
    return this.request.cancel()
  }
}

/**
 * Performs file uploading request to Uploadcare Upload API.
 * Can be canceled and has progress.
 *
 * @param {FileData} file
 * @param {Settings} settings
 * @return {DirectUploadInterface}
 */
export default function base(file: FileData, settings: Settings = {}): DirectUploadInterface {
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

  return new DirectUpload(options)
}
