import DefaultAxios from 'axios';
import TestTrackConfig from './testTrackConfig';

const defaultAxios = DefaultAxios.create({
  baseURL: `${TestTrackConfig.getUrl()}/api`,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  // @ts-ignore Remove once https://github.com/axios/axios/issues/2369 is resolved
  crossDomain: true
});

export default defaultAxios;
