import apiClient from './client';

export const adminAssistantAPI = {
  chat: (payload, options = {}) => apiClient.post('/assistant/admin/chat', payload, options),
};
