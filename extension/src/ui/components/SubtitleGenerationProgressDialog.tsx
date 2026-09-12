import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import type { SubtitleGenerationUiState } from '@project/common';
import { useTranslation } from 'react-i18next';

interface Props {
    open: boolean;
    generation: SubtitleGenerationUiState;
    onPoll: (jobId: string) => void;
    onCancel: (jobId: string) => void;
    onClose: () => void;
}

const activeStates = new Set(['queued', 'downloading', 'transcribing']);

/** A non-editable progress window displayed for the lifetime of a Whisper job. */
export default function SubtitleGenerationProgressDialog({ open, generation, onPoll, onCancel, onClose }: Props) {
    const { t } = useTranslation();
    const activeJob = generation.job && activeStates.has(generation.job.state) ? generation.job : undefined;

    useEffect(() => {
        if (!activeJob) return;
        const timer = window.setInterval(() => onPoll(activeJob.id), 1000);
        return () => window.clearInterval(timer);
    }, [activeJob, onPoll]);

    const close = () => {
        if (activeJob) onCancel(activeJob.id);
        onClose();
    };

    const stateText =
        activeJob?.state === 'downloading' && activeJob.progress !== undefined
            ? t('extension.subtitleGeneration.downloading', { progress: activeJob.progress })
            : activeJob?.state === 'transcribing'
              ? t('extension.subtitleGeneration.transcribing')
              : t('extension.subtitleGeneration.queued');

    return (
        <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
            <DialogTitle>{t('extension.subtitleGeneration.title')}</DialogTitle>
            <DialogContent>
                {generation.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {generation.error}
                    </Alert>
                )}
                {generation.job?.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {generation.job.error}
                    </Alert>
                )}
                {activeJob && (
                    <Box sx={{ mb: 2 }}>
                        <Typography aria-live="polite" variant="body2" sx={{ mb: 1 }}>
                            {stateText}
                        </Typography>
                        <LinearProgress
                            variant={
                                activeJob.state === 'downloading' && activeJob.progress !== undefined
                                    ? 'determinate'
                                    : 'indeterminate'
                            }
                            value={activeJob.progress}
                        />
                    </Box>
                )}
                {!activeJob && !generation.error && !generation.job?.error && generation.job?.state !== 'completed' && (
                    <Box sx={{ mb: 2 }}>
                        <Typography aria-live="polite" variant="body2" sx={{ mb: 1 }}>
                            {t('extension.subtitleGeneration.queued')}
                        </Typography>
                        <LinearProgress />
                    </Box>
                )}
                {generation.job?.state === 'completed' && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {t('extension.subtitleGeneration.completed')}
                    </Alert>
                )}
                <DialogContentText>{t('extension.subtitleGeneration.description')}</DialogContentText>
            </DialogContent>
            <DialogActions>
                {activeJob ? (
                    <Button onClick={close}>{t('extension.subtitleGeneration.cancel')}</Button>
                ) : (
                    <Button onClick={onClose}>{t('extension.subtitleGeneration.close')}</Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
