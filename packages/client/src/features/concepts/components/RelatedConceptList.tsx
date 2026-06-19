import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslate } from '@almadar/ui';

interface RelatedConcept {
  name: string;
  description?: string;
}

interface RelatedConceptListProps {
  concepts: RelatedConcept[];
  onSelect: (name: string) => void;
}

const RelatedConceptList: React.FC<RelatedConceptListProps> = ({ concepts, onSelect }) => {
  const { t } = useTranslate();
  if (concepts.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('concept.relatedConcepts')}</h3>
      <div className="-mx-4 sm:mx-0">
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 px-4 sm:px-0">
            {concepts.map(concept => (
              <div
                key={concept.name}
                className="flex-shrink-0 w-64 min-w-[16rem] p-4 border border-border rounded-lg hover:border-indigo-200 hover:shadow-sm transition-shadow cursor-pointer bg-card"
                onClick={() => onSelect(concept.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{concept.name}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
                {concept.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{concept.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatedConceptList;

