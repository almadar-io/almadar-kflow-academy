import taxonomyData from './taxonomy.json';

export interface TaxonomyNode {
  id: string;
  label: string;
  icon: string;
  children?: TaxonomyNode[];
}

export const KNOWLEDGE_TAXONOMY: TaxonomyNode[] = taxonomyData as TaxonomyNode[];
