import axios from 'axios';
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE_URL });
export const uploadVoice = async (file, name, onProgress) => {
  const form = new FormData();
  form.append('audio', file);
  form.append('name', name || file.name.replace(/\.[^/.]+$/, ''));
  const { data } = await api.post('/upload-voice', form, {
    onUploadProgress: e => onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
  return data;
};
export const generateVoice = async ({ voiceProfileId, elevenLabsVoiceId, demo, text, stability, similarityBoost, style }) => {
  const { data } = await api.post('/generate-voice', { voiceProfileId, elevenLabsVoiceId, demo, text, stability, similarityBoost, style });
  return data;
};
export const getVoices = async () => {
  const { data } = await api.get('/voices');
  return Array.isArray(data?.voices) ? data.voices : [];
};
export const deleteVoice = async (id) => { const { data } = await api.delete(`/voices/${id}`); return data; };
export default api;
