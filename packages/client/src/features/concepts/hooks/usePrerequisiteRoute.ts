import React from 'react';
import { Concept } from '../../concepts/types';
import { selectConcept } from '../../concepts/conceptSlice';
import { AppDispatch } from '../../../app/store';

interface UsePrerequisiteRouteParams {
  isPrerequisiteRoute: boolean;
  prereqId?: string;
  conceptMap?: Map<string, Concept>;
  detailConcept?: Concept | null | undefined;
  selectedConcept?: Concept | null | undefined;
  dispatch: AppDispatch;
}

interface UsePrerequisiteRouteReturn {
  prereqConcept?: Concept;
}

const usePrerequisiteRoute = ({
  isPrerequisiteRoute,
  prereqId,
  conceptMap,
  detailConcept,
  selectedConcept,
  dispatch,
}: UsePrerequisiteRouteParams): UsePrerequisiteRouteReturn => {
  const prereqConcept = React.useMemo<Concept | undefined>(() => {
    if (!isPrerequisiteRoute || !prereqId || !conceptMap) return undefined;
    const byId = Array.from(conceptMap.values()).find(c => c.id === prereqId);
    if (byId) return byId;
    return conceptMap.get(decodeURIComponent(prereqId));
  }, [isPrerequisiteRoute, prereqId, conceptMap]);

  React.useEffect(() => {
    if (isPrerequisiteRoute && detailConcept) {
      if (!selectedConcept || selectedConcept.name !== detailConcept.name) {
        dispatch(selectConcept(detailConcept));
      }
    }
  }, [isPrerequisiteRoute, detailConcept, selectedConcept, dispatch]);

  return { prereqConcept };
};

export default usePrerequisiteRoute;
