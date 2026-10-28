import { DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isIos, promptInstall, useInstall } from '../../app/install';
import { safely, useToast } from '../../app/toast';
import { createBackup, parseBackup, restoreBackup, type Backup } from '../../db/backup';
import { useSetting } from '../../db/hooks';
import { setSetting } from '../../db/repo';
import {
  DEFAULT_PAUSE_MINUTES,
  MAX_PAUSE_MINUTES,
  MIN_PAUSE_MINUTES,
  stepPauseMinutes,
} from '../../domain/pauses';
import type { Locale } from '../../domain/types';
import { SUPPORTED_LOCALES } from '../../i18n/locale';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { fieldStyles } from '../../ui/Field';
import { ConfirmDialog } from '../../ui/Overlay';
import { Page, pageStyles } from '../../ui/Page';
import { Stepper } from '../../ui/Stepper';
import styles from './Settings.module.css';

/** E7 — Réglages : langue, rappels, durée de pause, données, installation. */
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const reminders = useSetting('remindersEnabled');
  const defaultPause = useSetting('defaultPauseMinutes');
  const persisted = useSetting('storagePersisted');
  const remindersOn = reminders?.value !== false;
  const pauseMinutes = defaultPause?.value ?? DEFAULT_PAUSE_MINUTES;

  function changeLocale(locale: Locale) {
    void i18n.changeLanguage(locale);
    void safely(() => setSetting('locale', locale));
  }

  const persistedLabel =
    persisted?.value === true
      ? t('settings.yes')
      : persisted?.value === false
        ? t('settings.no')
        : t('settings.unknown');

  return (
    <Page title={t('screens.settings.title')} backTo="/">
      <ul className={styles.list}>
        <li className={styles.row}>
          <label htmlFor="locale">{t('settings.language')}</label>
          <select
            id="locale"
            className={cx(fieldStyles.input, styles.select)}
            value={i18n.language}
            onChange={(e) => changeLocale(e.target.value as Locale)}
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l} value={l} lang={l}>
                {t(`settings.languages.${l}`)}
              </option>
            ))}
          </select>
        </li>
        <li className={styles.row}>
          <span className={styles.rowText}>
            <span id="reminders-label">{t('settings.reminders')}</span>
            <span className={pageStyles.muted} id="reminders-hint">
              {t('settings.remindersHint')}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            className={styles.switch}
            aria-checked={remindersOn}
            aria-labelledby="reminders-label"
            aria-describedby="reminders-hint"
            onClick={() => void safely(() => setSetting('remindersEnabled', !remindersOn))}
          />
        </li>
        <li className={styles.row}>
          <span className={styles.rowText}>{t('settings.defaultPause')}</span>
          <Stepper
            value={t('pause.minutes', { count: pauseMinutes })}
            decreaseLabel={t('pause.decrease')}
            increaseLabel={t('pause.increase')}
            canDecrease={pauseMinutes > MIN_PAUSE_MINUTES}
            canIncrease={pauseMinutes < MAX_PAUSE_MINUTES}
            onDecrease={() =>
              void safely(() =>
                setSetting('defaultPauseMinutes', stepPauseMinutes(pauseMinutes, -1)),
              )
            }
            onIncrease={() =>
              void safely(() =>
                setSetting('defaultPauseMinutes', stepPauseMinutes(pauseMinutes, 1)),
              )
            }
          />
        </li>
      </ul>

      <section className={pageStyles.section} aria-labelledby="data-title">
        <h2 id="data-title">{t('settings.data')}</h2>
        <p>
          {t('settings.storage', { value: persistedLabel })}
          <br />
          <span className={pageStyles.muted}>{t('settings.storageHint')}</span>
        </p>
        <BackupActions />
      </section>

      <InstallSection />

      <p className={styles.version}>{t('settings.version', { version: __APP_VERSION__ })}</p>
    </Page>
  );
}

function BackupActions() {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const show = useToast((s) => s.show);

  async function exportData() {
    const backup = await safely(() => createBackup(Date.now()));
    if (!backup) return;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yarnest-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    const backup = parseBackup(await file.text());
    if (input.current) input.current.value = '';
    if (backup) setPending(backup);
    else show('settings.importError');
  }

  async function confirmImport() {
    if (!pending) return;
    const backup = pending;
    setPending(null);
    const ok = await safely(async () => {
      await restoreBackup(backup);
      return true;
    });
    if (ok) show('settings.importDone');
  }

  return (
    <div className={styles.actions}>
      <Button variant="secondary" block onClick={() => void exportData()}>
        <DownloadSimple aria-hidden="true" />
        {t('settings.export')}
      </Button>
      <Button variant="secondary" block onClick={() => input.current?.click()}>
        <UploadSimple aria-hidden="true" />
        {t('settings.import')}
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className={styles.hidden}
        aria-label={t('settings.import')}
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      {pending && (
        <ConfirmDialog
          title={t('settings.importTitle')}
          message={t('settings.importMessage')}
          confirmLabel={t('settings.importConfirm')}
          cancelLabel={t('app.cancel')}
          danger
          onConfirm={() => void confirmImport()}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

function InstallSection() {
  const { t } = useTranslation();
  const { prompt, installed } = useInstall();
  const [ios] = useState(isIos);

  return (
    <section className={pageStyles.section} aria-labelledby="install-title">
      <h2 id="install-title">{t('settings.install')}</h2>
      {installed ? (
        <p>{t('settings.installed')}</p>
      ) : (
        <>
          <p className={pageStyles.muted}>{t('settings.installHint')}</p>
          {prompt && (
            <Button variant="primary" block onClick={() => void promptInstall()}>
              {t('settings.install')}
            </Button>
          )}
          {!prompt && ios && <p>{t('settings.installIos')}</p>}
        </>
      )}
    </section>
  );
}
