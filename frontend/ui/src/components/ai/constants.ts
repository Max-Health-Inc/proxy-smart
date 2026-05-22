export interface ModelOption {
    id: string;
    name: string;
    description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Latest model with reasoning' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest latest model with reasoning' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, best for complex tasks' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Balanced performance with reasoning' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Cost-effective and responsive' },
];
