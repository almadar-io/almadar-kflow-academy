export interface TaxonomyNode {
  id: string;
  labelKey: string;
  icon: string;
  children?: TaxonomyNode[];
}

export const KNOWLEDGE_TAXONOMY: TaxonomyNode[] = [
  {
    id: 'formal',
    labelKey: 'taxonomy.formal',
    icon: 'ph:math-operations',
    children: [
      {
        id: 'computer-science',
        labelKey: 'taxonomy.computer-science',
        icon: 'ph:computer-tower',
        children: [
          { id: 'javascript', labelKey: 'taxonomy.javascript', icon: 'ph:file-js' },
          { id: 'typescript', labelKey: 'taxonomy.typescript', icon: 'ph:file-ts' },
          { id: 'python', labelKey: 'taxonomy.python', icon: 'ph:file-py' },
          { id: 'rust', labelKey: 'taxonomy.rust', icon: 'ph:gear' },
          { id: 'java', labelKey: 'taxonomy.java', icon: 'ph:coffee' },
          { id: 'csharp', labelKey: 'taxonomy.csharp', icon: 'ph:hash' },
          { id: 'kotlin', labelKey: 'taxonomy.kotlin', icon: 'ph:code' },
          { id: 'swift', labelKey: 'taxonomy.swift', icon: 'ph:bird' },
          { id: 'react', labelKey: 'taxonomy.react', icon: 'ph:atom' },
          { id: 'machine-learning', labelKey: 'taxonomy.machine-learning', icon: 'ph:brain' },
          { id: 'data-structures', labelKey: 'taxonomy.data-structures', icon: 'ph:tree-structure' },
          { id: 'docker', labelKey: 'taxonomy.docker', icon: 'ph:container' },
          { id: 'databases', labelKey: 'taxonomy.databases', icon: 'ph:database' },
          { id: 'networks', labelKey: 'taxonomy.networks', icon: 'ph:share-network' },
          { id: 'security', labelKey: 'taxonomy.security', icon: 'ph:shield-check' },
          { id: 'operating-systems', labelKey: 'taxonomy.operating-systems', icon: 'ph:desktop-tower' },
        ],
      },
      {
        id: 'mathematics',
        labelKey: 'taxonomy.mathematics',
        icon: 'ph:calculator',
        children: [
          { id: 'discrete-math', labelKey: 'taxonomy.discrete-math', icon: 'ph:hash-straight' },
          { id: 'geometry', labelKey: 'taxonomy.geometry', icon: 'ph:triangle' },
          { id: 'graph-theory', labelKey: 'taxonomy.graph-theory', icon: 'ph:graph' },
          { id: 'statistics', labelKey: 'taxonomy.statistics', icon: 'ph:chart-bar' },
        ],
      },
    ],
  },
  {
    id: 'natural',
    labelKey: 'taxonomy.natural',
    icon: 'ph:atom',
    children: [
      {
        id: 'biology',
        labelKey: 'taxonomy.biology',
        icon: 'ph:dna',
        children: [
          { id: 'neuroscience', labelKey: 'taxonomy.neuroscience', icon: 'ph:brain' },
          { id: 'physiology', labelKey: 'taxonomy.physiology', icon: 'ph:heartbeat' },
        ],
      },
      {
        id: 'physics',
        labelKey: 'taxonomy.physics',
        icon: 'ph:planet',
        children: [
          { id: 'astronomy', labelKey: 'taxonomy.astronomy', icon: 'ph:telescope' },
          { id: 'nanotechnology', labelKey: 'taxonomy.nanotechnology', icon: 'ph:atom' },
        ],
      },
      {
        id: 'cognitive-science',
        labelKey: 'taxonomy.cognitive-science',
        icon: 'ph:brain',
      },
      {
        id: 'botany',
        labelKey: 'taxonomy.botany',
        icon: 'ph:leaf',
      },
    ],
  },
  {
    id: 'social',
    labelKey: 'taxonomy.social',
    icon: 'ph:users-three',
    children: [
      {
        id: 'art',
        labelKey: 'taxonomy.art',
        icon: 'ph:paint-brush',
        children: [
          { id: 'drawing', labelKey: 'taxonomy.drawing', icon: 'ph:pencil' },
          { id: '3d-modeling', labelKey: 'taxonomy.3d-modeling', icon: 'ph:cube' },
        ],
      },
      {
        id: 'languages',
        labelKey: 'taxonomy.languages',
        icon: 'ph:translate',
        children: [
          { id: 'spanish', labelKey: 'taxonomy.spanish', icon: 'ph:chat-text' },
          { id: 'slovenian', labelKey: 'taxonomy.slovenian', icon: 'ph:chat-text' },
        ],
      },
      {
        id: 'history',
        labelKey: 'taxonomy.history',
        icon: 'ph:clock-countdown',
      },
      {
        id: 'philosophy',
        labelKey: 'taxonomy.philosophy',
        icon: 'ph:lightbulb',
      },
      {
        id: 'economy',
        labelKey: 'taxonomy.economy',
        icon: 'ph:chart-line-up',
      },
      {
        id: 'geography',
        labelKey: 'taxonomy.geography',
        icon: 'ph:globe-hemisphere-west',
      },
      {
        id: 'music',
        labelKey: 'taxonomy.music',
        icon: 'ph:music-notes',
      },
      {
        id: 'theology',
        labelKey: 'taxonomy.theology',
        icon: 'ph:book-open',
      },
    ],
  },
];
