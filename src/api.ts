import DefaultAxios from 'axios';
import TestTrackConfig from './testTrackConfig';

const defaultAxios = DefaultAxios.create({
  baseURL: `${TestTrackConfig.getUrl()}/api`,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  // @ts-ignore Remove once v1 of axios is released
  crossDomain: true
});

export default defaultAxios;
