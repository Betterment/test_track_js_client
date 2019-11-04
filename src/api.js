import DefaultAxios from 'axios';
import TestTrackConfig from './testTrackConfig';

const defaultAxios = DefaultAxios.create({
  baseURL: `${TestTrackConfig.getUrl()}/api/v1`,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

export default defaultAxios;
