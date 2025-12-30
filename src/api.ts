import DefaultAxios from 'axios';
import TestTrackConfig from './testTrackConfig';

const defaultAxios = DefaultAxios.create({
  baseURL: `${TestTrackConfig.getUrl()}/api`,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

export default defaultAxios;

export function toSearchParams(values: Record<string, string | null | undefined>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      params.append(key, value ?? '');
    }
  });

  return params
}
