import api from './api';

const getStats = async () => {
  const response = await api.get('/analytics');
  return response.data;
};

export default {
  getStats,
};
