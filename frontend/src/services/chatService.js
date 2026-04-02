import api from './api';

export const getContacts = async () => {
  const response = await api.get('/chat/contacts');
  return response.data;
};

export const getChatHistory = async (contactId, skip = 0, limit = 50) => {
  const response = await api.get(`/chat/history/${contactId}?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const markAsRead = async (contactId) => {
  const response = await api.post(`/chat/mark-read/${contactId}`);
  return response.data;
};

export const uploadChatAttachment = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/chat/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data; // { file_url, file_type, file_name }
};

export const getGlobalUnreadCount = async () => {
  const response = await api.get('/chat/unread-count');
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await api.post('/chat/groups', groupData);
  return response.data;
};

export const updateGroup = async (groupId, groupUpdate) => {
  const response = await api.put(`/chat/groups/${groupId}`, groupUpdate);
  return response.data;
};

export const addGroupMembers = async (groupId, userIds) => {
  const response = await api.post(`/chat/groups/${groupId}/members`, userIds);
  return response.data;
};

export const removeGroupMember = async (groupId, userId) => {
  const response = await api.delete(`/chat/groups/${groupId}/members/${userId}`);
  return response.data;
};

export const getGroupMembers = async (groupId) => {
  const response = await api.get(`/chat/groups/${groupId}/members`);
  return response.data;
};
