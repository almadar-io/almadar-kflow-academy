import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';

const accessLayer = new KnowledgeGraphAccessLayer();

export const studentData = accessLayer.getStudentDataService();
