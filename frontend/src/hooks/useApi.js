import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: BASE });
export const uploadVoice = async (file, name, onProgress) => {
  const form = new FormData();
  form.append('audio', file);
  form.append('name', name || file.name.replace(/\.[^/.]+$/, ''));
  const { data } = await api.post('/upload-voice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
  return data;
};
export const generateVoice = async ({ voiceProfileId, text, stability, similarityBoost, style }) => {
  const { data } = await api.post('/generate-voice', { voiceProfileId, text, stability, similarityBoost, style });
  return data;
};
export const getVoices = async () => { const { data } = await api.get('/voices'); return data.voices; };
export const deleteVoice = async (id) => { const { data } = await api.delete(`/voices/${id}`); return data; };
export default api;
