import SettingsTextField from '@project/common/components/SettingsTextField';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRowWithHoverEffect from '@project/common/components/TableRowWithHoverEffect';
import TableCell from '@mui/material/TableCell';
import SwitchLabelWithHoverEffect from '@project/common/components/SwitchLabelWithHoverEffect';
import { useTranslation } from 'react-i18next';
import type { AsbplayerSettings, Page, PageSettings, YoutubePage } from '@project/common/settings';
import { SubtitleListPreference } from '@project/common/settings';
import type { Command, SubtitleGenerationResponse, WhisperServiceHealthMessage } from '@project/common';
import Paper from '@mui/material/Paper';
import { pageMetadata } from '@project/common/pages';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import TuneIcon from '@mui/icons-material/Tune';
import type { PageConfigMap } from '@project/common/components/SettingsForm';
import PageSettingsForm from '@project/common/components/PageSettingsForm';
import SettingsSection from '@project/common/components/SettingsSection';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useCallback, useEffect, useState } from 'react';

const pageSettingsHasModifications = (page: Page) => {
    return (
        page.overrides !== undefined ||
        page.additionalHosts !== undefined ||
        (page as YoutubePage).targetLanguages !== undefined
    );
};

interface Props {
    settings: AsbplayerSettings;
    onSettingChanged: <K extends keyof AsbplayerSettings>(key: K, value: AsbplayerSettings[K]) => Promise<void>;
    onSettingsChanged: (settings: Partial<AsbplayerSettings>) => void;
    insideApp?: boolean;
    extensionSupportsOverlay?: boolean;
    extensionSupportsPageSettings?: boolean;
    pageConfigs?: PageConfigMap;
}

const StreamingVideoSettingsTab: React.FC<Props> = ({
    settings,
    onSettingChanged,
    onSettingsChanged,
    insideApp,
    extensionSupportsOverlay,
    extensionSupportsPageSettings,
    pageConfigs,
}) => {
    const { t } = useTranslation();
    const {
        streamingSubtitleListPreference,
        streamingEnableOverlay,
        streamingDisplaySubtitles,
        streamingRecordMedia,
        streamingTakeScreenshot,
        streamingCleanScreenshot,
        streamingCropScreenshot,
        streamingSubsDragAndDrop,
        streamingAutoSync,
        streamingAutoSyncPromptOnFailure,
        streamingAppUrl,
        streamingPages,
    } = settings;
    const [pageSettingsFormKey, setPageSettingsFormKey] = useState<keyof PageSettings>('netflix');
    const [pageSettingsFormOpen, setPageSettingsFormOpen] = useState<boolean>(false);
    const [whisperServerUrl, setWhisperServerUrl] = useState(settings.whisperServerUrl);
    const [whisperServerAuthToken, setWhisperServerAuthToken] = useState(settings.whisperServerAuthToken);
    const [whisperServerError, setWhisperServerError] = useState<string>();
    const [savingWhisperService, setSavingWhisperService] = useState(false);

    useEffect(() => setWhisperServerUrl(settings.whisperServerUrl), [settings.whisperServerUrl]);
    useEffect(() => setWhisperServerAuthToken(settings.whisperServerAuthToken), [settings.whisperServerAuthToken]);

    const saveWhisperService = useCallback(async () => {
        let url: URL;
        try {
            url = new URL(whisperServerUrl.trim());
        } catch {
            setWhisperServerError(t('settings.whisperServerInvalidUrl'));
            return;
        }

        const loopback = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname);
        if (url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
            setWhisperServerError(t('settings.whisperServerInvalidUrl'));
            return;
        }
        if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) {
            setWhisperServerError(t('settings.whisperServerHttpsRequired'));
            return;
        }
        if (!loopback && !whisperServerAuthToken.trim()) {
            setWhisperServerError(t('settings.whisperServerTokenRequired'));
            return;
        }

        if (!loopback) {
            const hostPermission = `${url.protocol}//${url.hostname}/*`;
            if (!(await browser.permissions.request({ origins: [hostPermission] }))) {
                setWhisperServerError(t('settings.whisperServerPermissionDenied'));
                return;
            }
        }

        setSavingWhisperService(true);
        try {
            const response = (await browser.runtime.sendMessage({
                sender: 'asbplayer-settings',
                message: {
                    command: 'whisper-service-health',
                    url: url.origin,
                    authToken: whisperServerAuthToken.trim(),
                } satisfies WhisperServiceHealthMessage,
            } satisfies Command<WhisperServiceHealthMessage>)) as SubtitleGenerationResponse;
            if (response.error || !response.capabilities) {
                setWhisperServerError(response.error ?? t('settings.whisperServerHealthFailed'));
                return;
            }

            setWhisperServerError(undefined);
            onSettingsChanged({
                whisperServerUrl: url.origin,
                whisperServerAuthToken: whisperServerAuthToken.trim(),
            });
        } catch {
            setWhisperServerError(t('settings.whisperServerHealthFailed'));
        } finally {
            setSavingWhisperService(false);
        }
    }, [onSettingsChanged, t, whisperServerAuthToken, whisperServerUrl]);

    return (
        <>
            {extensionSupportsPageSettings && pageConfigs && pageSettingsFormKey && (
                <PageSettingsForm
                    open={pageSettingsFormOpen}
                    pageKey={pageSettingsFormKey}
                    page={settings.streamingPages[pageSettingsFormKey]}
                    hasModifications={pageSettingsHasModifications(settings.streamingPages[pageSettingsFormKey])}
                    defaultPageConfig={pageConfigs[pageSettingsFormKey]}
                    onClose={() => setPageSettingsFormOpen(false)}
                    onPageChanged={(key, page) =>
                        onSettingsChanged({ streamingPages: { ...streamingPages, [key]: page } })
                    }
                />
            )}
            <Stack spacing={1}>
                <SettingsSection>{t('settings.appIntegration')}</SettingsSection>
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingSubtitleListPreference !== SubtitleListPreference.noSubtitleList}
                            onChange={() =>
                                onSettingChanged(
                                    'streamingSubtitleListPreference',
                                    streamingSubtitleListPreference === SubtitleListPreference.noSubtitleList
                                        ? SubtitleListPreference.app
                                        : SubtitleListPreference.noSubtitleList
                                )
                            }
                        />
                    }
                    label={t('extension.settings.openSubtitleList')}
                    labelPlacement="start"
                />
                {!insideApp && (
                    <SettingsTextField
                        color="primary"
                        fullWidth
                        label={t('extension.settings.asbplayerUrl')}
                        value={streamingAppUrl}
                        onChange={(e) => onSettingChanged('streamingAppUrl', e.target.value)}
                    />
                )}
                <SettingsSection>{t('settings.ui')}</SettingsSection>
                {extensionSupportsOverlay && (
                    <SwitchLabelWithHoverEffect
                        control={
                            <Switch
                                checked={streamingEnableOverlay}
                                onChange={(e) => onSettingChanged('streamingEnableOverlay', e.target.checked)}
                            />
                        }
                        label={t('extension.settings.enableOverlay')}
                        labelPlacement="start"
                    />
                )}
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingDisplaySubtitles}
                            onChange={(e) => onSettingChanged('streamingDisplaySubtitles', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.displaySubtitles')}
                    labelPlacement="start"
                />
                <SettingsSection>{t('settings.mining')}</SettingsSection>
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingRecordMedia}
                            onChange={(e) => onSettingChanged('streamingRecordMedia', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.recordAudio')}
                    labelPlacement="start"
                />
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingTakeScreenshot}
                            onChange={(e) => onSettingChanged('streamingTakeScreenshot', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.takeScreenshot')}
                    labelPlacement="start"
                />
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingCleanScreenshot}
                            onChange={(e) => onSettingChanged('streamingCleanScreenshot', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.cleanScreenshot')}
                    labelPlacement="start"
                />
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingCropScreenshot}
                            onChange={(e) => onSettingChanged('streamingCropScreenshot', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.cropScreenshot')}
                    labelPlacement="start"
                />
                <SettingsSection>{t('settings.subtitles')}</SettingsSection>
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingSubsDragAndDrop}
                            onChange={(e) => onSettingChanged('streamingSubsDragAndDrop', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.dragAndDrop')}
                    labelPlacement="start"
                />
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingAutoSync}
                            onChange={(e) => onSettingChanged('streamingAutoSync', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.autoLoadDetectedSubs')}
                    labelPlacement="start"
                />
                <SwitchLabelWithHoverEffect
                    control={
                        <Switch
                            checked={streamingAutoSyncPromptOnFailure}
                            onChange={(e) => onSettingChanged('streamingAutoSyncPromptOnFailure', e.target.checked)}
                        />
                    }
                    label={t('extension.settings.autoLoadDetectedSubsFailure')}
                    labelPlacement="start"
                />
                {!insideApp && (
                    <>
                        <SettingsSection docs="guides/generate-subtitles#use-a-remote-gpu-service">
                            {t('settings.whisperService')}
                        </SettingsSection>
                        <Alert severity="info">{t('settings.whisperServerHelp')}</Alert>
                        <SettingsTextField
                            color="primary"
                            fullWidth
                            label={t('settings.whisperServerUrl')}
                            value={whisperServerUrl}
                            onChange={(event) => setWhisperServerUrl(event.target.value)}
                        />
                        <SettingsTextField
                            color="primary"
                            fullWidth
                            type="password"
                            autoComplete="off"
                            label={t('settings.whisperServerAuthToken')}
                            value={whisperServerAuthToken}
                            onChange={(event) => setWhisperServerAuthToken(event.target.value)}
                        />
                        {whisperServerError && <Alert severity="error">{whisperServerError}</Alert>}
                        <Button
                            disabled={savingWhisperService}
                            variant="outlined"
                            onClick={() => void saveWhisperService()}
                        >
                            {t('settings.saveWhisperService')}
                        </Button>
                    </>
                )}
                {pageConfigs && (
                    <>
                        <SettingsSection>{t('settings.pages')}</SettingsSection>
                        <TableContainer variant="outlined" component={Paper} style={{ height: 'auto' }}>
                            <Table>
                                <TableBody>
                                    {Object.keys(pageConfigs).map((key) => {
                                        const pageKey = key as keyof PageSettings;
                                        const metadata = pageMetadata[pageKey];
                                        const page = settings.streamingPages[pageKey];

                                        if (metadata === undefined || page === undefined) {
                                            // Can happen if extension supports more pages than this version of the app
                                            return null;
                                        }

                                        return (
                                            <TableRowWithHoverEffect
                                                key={key}
                                                onClick={() => {
                                                    setPageSettingsFormKey(pageKey);
                                                    setPageSettingsFormOpen(true);
                                                }}
                                            >
                                                <TableCell
                                                    sx={{
                                                        width: 48,
                                                        background: `url(${pageConfigs[pageKey].faviconUrl})`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: '75%',
                                                        backgroundSize: 24,
                                                    }}
                                                />
                                                <TableCell align="left">{metadata.title}</TableCell>
                                                <TableCell align="right">
                                                    <Badge
                                                        invisible={!pageSettingsHasModifications(page)}
                                                        color="warning"
                                                        badgeContent=" "
                                                        variant="dot"
                                                    >
                                                        <IconButton>
                                                            <TuneIcon />
                                                        </IconButton>
                                                    </Badge>
                                                </TableCell>
                                            </TableRowWithHoverEffect>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Stack>
        </>
    );
};

export default StreamingVideoSettingsTab;
