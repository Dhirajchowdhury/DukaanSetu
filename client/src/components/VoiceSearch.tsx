import { useState, useEffect, useCallback, useRef } from 'react';
import { FiMic, FiMicOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface VoiceSearchProps {
  onResult: (text: string) => void;
  placeholder?: string;
}

export default function VoiceSearch({ onResult, placeholder = 'Search by voice...' }: VoiceSearchProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = 'bn-BD';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      if (onResultRef.current) onResultRef.current(transcript);
      toast.success(`Heard: "${transcript}"`);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListening(false);
      if (event.error === 'no-speech') return;
      toast.error(`Voice error: ${event.error}`);
    };

    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => { rec.abort(); };
  }, []);

  const toggleListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      rec.start();
      setListening(true);
    }
  }, [listening]);

  return (
    <button
      type="button"
      className={`btn btn-icon ${listening ? 'voice-active' : ''}`}
      onClick={toggleListening}
      title={listening ? 'Listening...' : placeholder}
      style={{ color: listening ? '#EF4444' : '#64748B' }}
    >
      {listening ? <FiMicOff /> : <FiMic />}
    </button>
  );
}
