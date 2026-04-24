import { useState, useRef, useCallback } from 'react';
export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const start = useCallback(async () => {
    setError(null); setAudioBlob(null); setAudioUrl(null); setDuration(0); chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : {};
      mediaRecorder.current = new MediaRecorder(stream, options);
      mediaRecorder.current.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mediaRecorder.current.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: mediaRecorder.current.mimeType || 'audio/webm' });
        setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.current.start(100);
      startTimeRef.current = Date.now(); setIsRecording(true);
      timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Microphone access denied.' : `Recording error: ${err.message}`);
    }
  }, []);
  const stop = useCallback(() => {
    if (mediaRecorder.current && isRecording) { mediaRecorder.current.stop(); clearInterval(timerRef.current); setIsRecording(false); }
  }, [isRecording]);
  const clear = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl(null); setDuration(0); setError(null);
  }, [audioUrl]);
  const formatDuration = (secs) => `${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;
  return { isRecording, duration, formatDuration, error, audioBlob, audioUrl, start, stop, clear };
};
