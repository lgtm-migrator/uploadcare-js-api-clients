/* @flow */

export type Query = {
  [key: string]: string,
}

export type Options = {
  body: string | {} | ArrayBuffer | Buffer | FormData | File | Blob,
  query: Query,
}

export type ProgressListener = ({total: number, loaded: number}) => void

export type UCResponse = {
  code: number,
  data: {
    [key: string]: mixed,
  },
}

export interface UCRequest {
  promise: Promise<UCResponse>,
  cancel(): void,
  progress(callback: ProgressListener): void,
}

export interface ServerResponse {
  [key: string]: mixed;
  +error: {
    status_code: number,
    content: string,
  };
}
