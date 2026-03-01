import React from 'react';
import { ChevronRight } from 'lucide-react';

interface RelatedConcept {
  name: string;
  description?: string;
}

interface RelatedConceptListProps {
  concepts: RelatedConcept[];
  onSelect: (name: string) => void;
}

const RelatedConceptList: React.FC<RelatedConceptListProps> = ({ concepts, onSelect }) => {
  if (concepts.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm.font-medium text-gray-700 mb-3">Related Concepts</h3>
      <div className="-mx-4 sm:mx-0">
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 px-4 sm:px-0">
            {concepts.map(concept => (
              <div
                key={concept.name}
                className="flex-shrink-0 w-64 min-w-[16rem] p-4 border border-gray-200 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-shadow cursor-pointer bg-white"
                onClick={() => onSelect(concept.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{concept.name}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                {concept.description && (
                  <p className="text-sm text-gray-500 line-clamp-3">{concept.description}</p>
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

