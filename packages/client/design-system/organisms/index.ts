// Annotation organisms
export { AnnotationViewModal } from './AnnotationViewModal';
export type { AnnotationViewModalProps, AnnotationEntity } from './AnnotationViewModal';

// Graph visualization
export * from './ForceDirectedGraph';

// Mindmap
export * from './MindMapCanvas';

// Flashcards

// Extracted organisms for template flattener compliance

// Knowledge organisms
export { SubjectOverviewBoard, type SubjectOverviewBoardProps, type SubjectOverviewEntity } from './SubjectOverviewBoard';
export { DomainExplorerBoard, type DomainExplorerBoardProps, type DomainExplorerEntity } from './DomainExplorerBoard';
export { KnowledgeSearchBoard, type KnowledgeSearchBoardProps, type KnowledgeSearchEntity } from './KnowledgeSearchBoard';
export { CrossDomainGraphBoard, type CrossDomainGraphBoardProps, type CrossDomainGraphEntity } from './CrossDomainGraphBoard';

// Session organisms
export { DailyMenuBoard, type DailyMenuBoardProps, type DailyMenuEntity } from './DailyMenuBoard';
export { SpacedReviewBoard, type SpacedReviewBoardProps, type SpacedReviewEntity } from './SpacedReviewBoard';

// Discovery organisms
export { CrossDomainDiscoveryBoard, type CrossDomainDiscoveryBoardProps, type CrossDomainDiscoveryEntity } from './CrossDomainDiscoveryBoard';

// Game organisms (Milestones 7-10)
export { KnowledgeChallengeBoard, type KnowledgeChallengeBoardProps, type KnowledgeChallengeEntity } from './KnowledgeChallengeBoard';
export { KnowledgeBattleBoard, type KnowledgeBattleBoardProps, type KnowledgeBattleEntity } from './KnowledgeBattleBoard';
export { KnowledgeWorldMapBoard, type KnowledgeWorldMapBoardProps, type KnowledgeWorldMapEntity } from './KnowledgeWorldMapBoard';
export { PhysicsLabBoard, type PhysicsLabBoardProps, type PhysicsLabEntity } from './PhysicsLabBoard';

// App shell organisms (Phase 2)
export { AppShellBoard, type AppShellBoardProps, type AppShellEntity, type AppShellNavItem, type AppShellUser } from './AppShellBoard';
export { DashboardBoard, type DashboardBoardProps, type DashboardEntity, type DashboardStat, type DashboardActivity, type DashboardLearningPath, type DashboardQuickAction } from './DashboardBoard';
export { LearnBoard, type LearnBoardProps, type LearnEntity, type LearnPathItem } from './LearnBoard';
