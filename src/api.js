import DefaultAxios from 'axios';
import TestTrackConfig from './testTrackConfig';

const defaultAxios = DefaultAxios.create({
  baseURL: `${TestTrackConfig.getUrl()}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  crossDomain: true
});

export default defaultAxios;
