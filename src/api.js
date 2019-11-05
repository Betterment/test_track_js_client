import DefaultAxios from 'axios';
import TestTrackConfig from './testTrackConfig';

const defaultAxios = DefaultAxios.create({
  baseURL: `${TestTrackConfig.getUrl()}/api`,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
  },
  crossDomain: true
});

export default defaultAxios;
