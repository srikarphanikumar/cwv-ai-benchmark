export const MODELS = [
  {
    id: 'distilbert',
    name: 'DistilBERT',
    badge: '66M params',
    task: 'text-classification',
    modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    description: 'Sentiment analysis · Distilled BERT (6 layers)',
    color: '#6366f1',
    inputType: 'text',
  },
  {
    id: 'bert-base',
    name: 'BERT-base',
    badge: '110M params',
    task: 'feature-extraction',
    modelId: 'Xenova/bert-base-uncased',
    description: 'Feature extraction · Full BERT encoder (12 layers)',
    color: '#f59e0b',
    inputType: 'text',
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    badge: '39M params',
    task: 'automatic-speech-recognition',
    modelId: 'Xenova/whisper-tiny',
    description: 'Automatic speech recognition · Multilingual encoder–decoder',
    color: '#10b981',
    inputType: 'audio',
  },
  {
    id: 'mobilevit',
    name: 'MobileViT-S',
    badge: '5.7M params',
    task: 'image-classification',
    modelId: 'Xenova/mobilevit-small',
    description: 'Image classification · Mobile Vision Transformer',
    color: '#ef4444',
    inputType: 'image',
  },
];

export const BENCHMARK_DEFAULTS = {
  iterations: 10,
  warmup: 1,
  dtype: 'q8',
};

export const LONG_TASK_THRESHOLD_MS = 50;
