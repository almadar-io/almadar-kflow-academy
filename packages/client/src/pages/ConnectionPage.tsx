import React from 'react';
import { useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Container, Button, Typography, Box, useTranslate } from '@almadar/ui';
import { ConnectionThread } from '../../design-system/organisms/ConnectionThread';
import { useNavigateEvent } from '../hooks/useNavigateEvent';

export const ConnectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigateEvent();
  const { t } = useTranslate();

  if (!id) {
    return (
      <Container size="md" className="py-6">
        <Typography variant="body" color="secondary">{t('connections.notFound')}</Typography>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-4 h-screen flex flex-col">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/home')} className="self-start">
        {t('connections.back')}
      </Button>
      <Box className="flex-1 min-h-0 mt-2">
        <ConnectionThread connectionId={id} />
      </Box>
    </Container>
  );
};
