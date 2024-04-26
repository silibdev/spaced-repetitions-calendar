/// <reference lib="webworker" />

import { Utils } from './utils';

addEventListener('message', ({ data }) => {
  const response = Utils.manageMessageWebWorker(data);
  postMessage(response);
});
